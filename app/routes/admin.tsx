import { ActionFunctionArgs, LoaderFunctionArgs, redirect, json } from "@remix-run/node";
import { IngestedFile } from "~/interfaces";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import { useLoaderData, useActionData } from "@remix-run/react";
import { getIngestedFiles, ingest, uploadCourseCSV } from "~/models/admin.server";
import path from "path";
import fs from 'fs/promises';
import { useFetcher } from "@remix-run/react";
import LoadingSpinner from "~/components/loading";

export async function loader({ request }: LoaderFunctionArgs) {
    const userId = await requireUserId(request);

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user?.isAdmin) {
        return redirect("/courseplanner");
    }
    try{
        const currentFiles = await getIngestedFiles()
        return json({ currentFiles });
    }catch(error){
        return json({ status: 400, errors: ['Error getting ingested files'] }, { status: 400 });
    }

}

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user?.isAdmin) {
        return redirect("/courseplanner");
    }

    let formData = await request.formData();
    let formId = formData.get("formId");
    const errors: string[] = [];

    switch(formId) {
        case 'upload':
            const files = formData.getAll('files');

            const paths: string[] = [];
            try{
                const uploadPath = path.resolve(__dirname, '../public/uploaded-files');
    
                for (const file of files) {
                    if (file instanceof File) {

                        const fileName = `${Date.now()}_${file.name}`;
                        const filePath = path.join(uploadPath, fileName);
                        const fileBuffer = await file.arrayBuffer(); // Convert File to ArrayBuffer
    
                        // Write the file to the filesystem
                        await fs.writeFile(filePath, Buffer.from(fileBuffer));
    
                        // Add to paths array
                        paths.push(filePath);
                    }
                }
            } catch (error) {
                errors.push('Error uploading files');
            }

            try{
                const newCourses = await uploadCourseCSV(paths)
                return json({ status: 200, message: `File uploaded successfully. ${newCourses.length} new courses found` }, { status: 200 });
            }catch(error: any){
                errors.push(error.message);
            }
            
            return json({ status: 400, errors: errors }, { status: 400 });
        case 'ingest':

            const apiKey = formData.get('apiKey');

            if (typeof apiKey !== 'string') {
                errors.push('OpenAI API Key is required');
                return json({ status: 400, errors }, { status: 400 });
            }

            try{
                await ingest(apiKey);
                return json({ status: 200, message:"Files ingested successfully" }, { status: 200 });
            }
            catch(error: any){
                errors.push(error.message);
                return json({ status: 400, errors }, { status: 400 });
            }
            
        case 'delete':
            const fileId = formData.get('fileId');
            if (typeof fileId !== 'string') {
                return json({ status: 400, error: 'File ID is required' }, { status: 400 });
            }
            const file = await prisma.ingestedFile.delete({
                where: {
                    id: fileId,
                },
            });
            await fs.unlink(file.filePath);
            return json({ status: 200, message:"File deleted successfully" }, { status: 200 });
        default:
            return null;

    }
}



export default function Admin() {
    const { currentFiles } = useLoaderData<{ currentFiles: IngestedFile[] }>();
    const ingested = currentFiles.filter((file) => file.ingested);
    const newFiles = currentFiles.filter((file) => !file.ingested);

    const actionData = useActionData();
    
    function UploadForm(){
        // The loading wheel does not work, I don't know why
        const fetcher = useFetcher();
        const isUploading = fetcher.state === "submitting";
    
        return(
            <div className="w-full md:w-1/2 p-2"> 
                <h2 className="text-xl font-semibold mb-4 text-center">Step 1: Upload New Files</h2>
                <div className="text-gray-600 mb-4 text-center">
                    <p>Files must be in correct <a href='/example-files/example.csv' className="text-blue-600 hover:text-blue-800 visited:text-purple-600">CSV</a> or <a href='/example-files/example.tsv' className="text-blue-600 hover:text-blue-800 visited:text-purple-600">TSV</a> format</p>
                    <br />
                    <hr />
                    <br />
                    <p>Uploading files does not ingest their courses into the database</p>
                    <br />
                    <hr />
                    <br />
                    <p>Large TSV files can take a while to convert</p>
                    <br />
                    <hr />
                    <br />
                    <p>Instructions on how to generate a valid file with the scraper can be found <a href='https://github.com/engasa/CoursePlannerWebDS/blob/main/scraping.md' className="text-blue-600 hover:text-blue-800 visited:text-purple-600">here</a></p>
                </div>
    
                {isUploading ? <LoadingSpinner /> : (
                    <fetcher.Form method='post' encType="multipart/form-data" className="space-y-4">
                        <input type="hidden" name="formId" value="upload" />
                        <div>
                            <input
                                id="files"
                                name="files"
                                type="file"
                                multiple
                                accept=".csv,.tsv"
                                required
                                className="mt-2 block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-gray-50 file:text-gray-700
                                    hover:file:bg-gray-100"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent
                                rounded-md shadow-sm text-sm font-medium text-white
                                bg-blue-600 hover:bg-blue-700 focus:outline-none
                                focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Upload Files
                        </button>
                    </fetcher.Form>
                )}
    
            </div>
        )
    }
    
    function IngestForm(){
        // The loading wheel does not work, I don't know why
        const fetcher = useFetcher();
        const isIngesting = fetcher.state === 'submitting';
    
        return(
            <div className="w-full md:w-1/2 p-2">
            <h2 className="text-xl font-semibold mb-4 text-center">Step 2: Ingest Uploaded Files</h2>
            <div className="text-gray-600 mb-4 text-center">
                <p>Ingesting files will add their courses to the database</p>
                <br />
                <hr />
                <br />
                <p>OpenAI is used to generate a pre-requisites json based on the pre-requisite string for each course</p>
                <br />
                <hr />
                <br />
                <p>If a row in a csv file already contains a pre-requisite json, it will not be generated</p>
                <br />
                <hr />
                <br />
                <p>If ingestion is interrrupted, all courses before interuption will still be added to the database</p>
                <br />
                <hr />
                <br />
                <p>Clicking "Ingest Files" will attempt to ingest all files in Uploaded Files table</p>
                <br />
                <hr />
                <br />
                <p>This process can take a long time if there are many new courses</p>
            </div>
    
            {isIngesting ? <LoadingSpinner /> : (
                <fetcher.Form method="post" encType="multipart/form-data" className="space-y-4">
                    <input type="hidden" name="formId" value="ingest" />
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                            OpenAI API Key
                        </label>
                        <input
                            id="apiKey"
                            name="apiKey"
                            type="text"
                            placeholder="Enter OpenAI API key"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md
                                shadow-sm placeholder-gray-400 focus:outline-none
                                focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent
                            rounded-md shadow-sm text-sm font-medium text-white
                            bg-blue-600 hover:bg-blue-700 focus:outline-none
                            focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Ingest Files
                    </button>
                </fetcher.Form>
            )}
        </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50"> 
            <div className="p-4 w-full max-w-4xl">
                <>
                    {actionData && actionData.status === 400 && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-5 rounded" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{actionData.errors.join(', ')}</span>
                        </div>
                    )}
                    {actionData && actionData.status === 200 && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-5 rounded" role="alert">
                            <strong className="font-bold">Success: </strong>
                            <span className="block sm:inline">{actionData.message}</span>
                        </div>
                    )}
                </>
    
                <h1 className="text-3xl font-bold mb-6 text-center">Admin Panel</h1> 
    
                {ingested.length > 0 ? (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-2">Ingested Files</h2> 
                        <p className="mb-4 text-gray-600">This is a list of all files that have been ingested into the database.</p>
                        <div className="bg-white shadow overflow-hidden rounded-lg"> 
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="py-3 px-6 text-left">Ingested at</th>
                                        <th className="py-3 px-6 text-left">Name</th>
                                        <th className="py-3 px-6 text-left">Download Link</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                    {ingested.map((file) => (
                                        <tr className="border-b hover:bg-gray-100" key={file.id}>
                                            <td className="py-3 px-6">{new Date(file.createdAt).toLocaleString()}</td>
                                            <td className="py-3 px-6">{file.name}</td>
                                            <td className="py-3 px-6">
                                                <a 
                                                    href={`/uploaded-files/${file.name}`}
                                                    className="text-blue-600 hover:text-blue-800 visited:text-purple-600"
                                                    download
                                                >
                                                    Download
                                                </a>
                                            </td>
                                        
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p className="text-xl text-gray-600 mb-8 text-center font-semibold mt-4">You have not ingested any files.</p>
                )}
    
                {newFiles.length > 0 ? (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-2">Uploaded Files</h2> 
                        <p className="mb-4 text-gray-600">These files have been uploaded and converted but not ingested.</p>
                        <div className="bg-white shadow overflow-hidden rounded-lg"> 
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="py-3 px-6 text-left">Uploaded at</th>
                                        <th className="py-3 px-6 text-left">Name</th>
                                        <th className="py-3 px-6 text-left">New/Updated courses</th>
                                        <th className="py-3 px-6 text-left">Download Link</th>
                                        <th className="py-3 px-6 text-left">Delete</th>

                                    </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                    {newFiles.map((file) => (
                                        <tr className="border-b hover:bg-gray-100" key={file.id}>
                                            <td className="py-3 px-6">{new Date(file.createdAt).toLocaleString()}</td>
                                            <td className="py-3 px-6">{file.name}</td>
                                            <td className="py-3 px-6">{file.numNewCourses}</td>
                                            <td className="py-3 px-6">
                                                <a 
                                                    href={`/uploaded-files/${file.name}`}
                                                    className="text-blue-600 hover:text-blue-800 visited:text-purple-600"
                                                    download
                                                >
                                                    Download
                                                </a>
                                            </td>
                                            <td className="py-3 px-6">
                                                <form method="post">
                                                    <input type="hidden" name="formId" value="delete" />
                                                    <input type="hidden" name="fileId" value={file.id} />
                                                    <button
                                                        type="submit"
                                                        className="inline-flex justify-center py-2 px-4 border border-transparent
                                                            rounded-md shadow-sm text-sm font-medium text-white
                                                            bg-blue-600 hover:bg-red-700 focus:outline-none
                                                            focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Delete
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p className="text-xl text-gray-600 mb-8 text-center font-semibold mt-4">You have not uploaded any files.</p>
                )}
    
                <div className="flex flex-wrap -mx-2 mb-8 justify-center">
                    <UploadForm />
                    <IngestForm />
                </div>
            </div>
        </div>
    );
}

import { ActionFunctionArgs, LoaderFunctionArgs, redirect, json } from "@remix-run/node";
import { IngestedFile } from "~/interfaces";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import { useLoaderData, useFetcher, Form } from "@remix-run/react";
import { ingest, uploadCourseCSV } from "~/models/admin.server";
import path from "path";
import fs from 'fs/promises';



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

    const currentFiles = await prisma.ingestedFile.findMany();
    return json({ currentFiles });
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

    console.log(formId)
    switch(formId) {
        case 'upload':
            const errors: string[] = [];
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
                return json({ status: 200, newCourses }, { status: 200 });
            }catch(error: any){
                errors.push(error.message);
            }
            



            if (errors.length > 0) {
                return json({ status: 400, errors: errors }, { status: 400 });
            }
            break;
        case 'ingest':
            break;
        default:
            return null;

    }
    return null;



    // const apiKey = formData.get('apiKey');
    // if (typeof apiKey !== 'string') {
    //     throw new Error('API Key is required');
    // }

    

    // try {
    //     if (paths.length > 0) {
    //         const result = await ingest(paths, apiKey);
    //         // Do something with result if needed
    //     }
    // } catch (error) {
    //     console.error('Error ingesting files:', error);
    //     // Handle the error
    // }

    // return null; // Or redirect or show success message
}

export default function Admin() {
    const { currentFiles } = useLoaderData<{ currentFiles: IngestedFile[] }>();
    const actionData = useFetcher().data;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
       
            
            <div className="overflow-x-auto">
                <p>This is a list of all files that have been ingested into the database</p>
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="py-3 px-6 text-left">Ingested at</th>
                            <th className="py-3 px-6 text-left">Name</th>
                            <th className="py-3 px-6 text-left">Download Link</th>
                            <th className="py-3 px-6 text-center">Ingested</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {currentFiles.map((file) => (
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
                                <td className="py-3 px-6 text-center">
                                    {file.ingested ? 'Yes' : 'No'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Ingest New File(s)</h2>
                <form method='post' encType="multipart/form-data">
                    <input type="hidden" name="formId" value="upload" />
                    <div>
                        <label htmlFor="files" className="block text-sm font-medium text-gray-700">
                            Select files
                        </label>
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
                </form>
              
                
                <form method="post" encType="multipart/form-data" className="space-y-4">
                    
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
                    <div>
                        
                    </div>
                </form>
            </div>
        </div>
    );
}

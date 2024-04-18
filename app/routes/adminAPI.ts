import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import fs from "fs";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import path from "path"; 
import { uploadCourseCSV } from "~/models/admin.server";


/*
    I am certain this is not how remix is supposed to be used, but I am not sure how to do it properly.
    Any file containing API in the name is being used to handle API requests.
    This functionality is supposed to be handled by the routes themselves, but I am not sure how to do that.
*/

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user?.isAdmin) {
        return redirect("/courseplanner");
    }

    if (request.method === 'GET') {

        const url = new URL(request.url);
        const requestedFile = url.searchParams.get("fileId");
        if (requestedFile) {
            const file = await prisma.ingestedFile.findUnique({
                where: {
                    id: requestedFile,
                },
            });
            if (!file) {
                return json({ error: "File not found" }, { status: 404 });
            }
            // Read the file into memory as a buffer
            const fileBuffer = fs.readFileSync(file?.filePath);
            
            // Convert the buffer to an ArrayBuffer
            const fileArrayBuffer = new Uint8Array(fileBuffer).buffer;
            
            return new Response(fileArrayBuffer, {
                headers: {
                    "Content-Type": "application/octet-stream",
                },
            });
        }
        const currentFiles = await prisma.ingestedFile.findMany();
        return json({ currentFiles });
    }

}

export const action = async({ request }: ActionFunctionArgs) => {
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
                        fs.writeFile(filePath, Buffer.from(fileBuffer), (err) => {
                            if (err) {
                                console.error(err);
                            }
                        });

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


}
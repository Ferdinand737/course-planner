import { Specialization, SpecializationType } from "@prisma/client";
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { prisma } from "~/db.server";
import { createCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";


export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const availableMajors = await prisma.specialization.findMany({where: {specializationType: SpecializationType.MAJOR}})
    const availableMinors = await prisma.specialization.findMany({where: {specializationType: SpecializationType.MINOR}})
    
    return json({ availableMajors, availableMinors});
};


export const action = async ({ params, request }: ActionFunctionArgs) => {
    const userId = await requireUserId(request);

    const formData = await request.formData();

    const planName = formData.get("planName")?.toString();

    const majorId = formData.get("major")?.toString();
    //const minorId = formData.get("minor")?.toString();

    if (!planName) {
        return json({errors: {planName: "Plan Name is required"}}, {status: 400});
    }

    
    const major = await prisma.specialization.findUnique({
        where: {id: majorId},
        include: {
            requirements:{
                include:{
                    alternatives: true,
                    electiveCourse: true,  
                },
            },
        }
    });

    // const minor = await prisma.specialization.findUnique({
    //     where: {id: minorId},
    //     include: {
    //         requirements:{
    //             include:{
    //                 alternatives: true,
    //             }
    //         },
    //     }
    // });

    if (!major) {
        return json({errors: {major: "Invalid major or minor"}}, {status: 400});
    }



    await createCoursePlan(planName, [major], userId);


    return json({ errors: null, message: "success" }, { status: 201 });

};

export default function NewCoursePlan(){
    const { availableMajors, availableMinors } = useLoaderData<{ availableMajors: Specialization[], availableMinors: Specialization[] }>();
    const actionData = useActionData<typeof action>();
    const minorRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (actionData?.errors?.major) {
            minorRef.current?.focus()
        }
    }, [actionData]);

    return(
        <>
            <Form method="post" className="max-w-md mx-auto my-8">
                <div className="mb-6">
                    <label htmlFor="planName" className="block text-sm font-medium text-gray-700">Plan Name:</label>
                    <input type="text" id="planName" name="planName" required 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div className="mb-6">
                    <label htmlFor="major" className="block text-sm font-medium text-gray-700">Major:</label>
                    <select id="major" name="major" required 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        {availableMajors.map((major: Specialization) => (
                        <option key={major.id} value={major.id}>
                            {major.name} 
                        </option>
                        ))}
                    </select>
                </div>
                {/* <div className="mb-6">
                    <label htmlFor="minor" className="block text-sm font-medium text-gray-700">Minor:</label>
                    <select ref={minorRef} id="minor" name="minor" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">None</option>
                        {availableMinors.map((minor: Specialization) => (
                        <option key={minor.id} value={minor.id}>
                            {minor.name}
                        </option>
                        ))}
                    </select>
                    {actionData?.errors?.minor ? (
                        <div className="pt-1 text-red-700" id="minor-error">
                            {actionData.errors.minor}
                        </div>
                    ) : null}
                </div> */}
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Submit
                </button>
            </Form>
        </>
    );
}
import { Specialization, SpecializationType } from "~/interfaces";
import {  ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { prisma } from "~/db.server";
import { createCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";


export async function loader({ request }: LoaderFunctionArgs) {
    await requireUserId(request);
    const availableMajors = await prisma.specialization.findMany({
        where: {
          OR: [
            { specializationType: SpecializationType.MAJOR },
            { specializationType: SpecializationType.HONOURS },
          ],
        },
      });

    const availableMinors = await prisma.specialization.findMany({where: {specializationType: SpecializationType.MINOR}})
    return json({ availableMajors, availableMinors});
}

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    const formData = await request.formData();

    const planName = formData.get("planName")?.toString();
    const majorId = formData.get("major")?.toString();
    const minorId = formData.get("minor")?.toString();

    let errors: {
        plan?: string,
        major?: string,
        minor?: string,
    } = {};

    if (!planName) {
        errors.plan = "Plan name is required";
    }

    try {
        const major = majorId ? await prisma.specialization.findUnique({
            where: {id: majorId},
            include: {
                requirements: true
            }
        }) as Specialization : undefined;

        
        const minor = minorId ? await prisma.specialization.findUnique({
            where: {id: minorId},
            include: {
                requirements: true
            }
        }) as Specialization : undefined;
        
        if(planName) {
            if (major){
                await createCoursePlan(planName, major, minor, userId);
            }else{
                errors.major = "Major is required";
            }
        }

        if (Object.values(errors).some(error => error !== undefined)) {
            return json({ errors, message: "Failure" }, { status: 400 });
    }

        return json({ errors: null, message: "Success" }, { status: 201 });
    } catch (error) {
        return json({ errors: { plan: undefined, major: undefined, minor: undefined }, message: "An unexpected error occurred" }, { status: 500 });
    }
}


export default function NewCoursePlan(){
    const { availableMajors, availableMinors } = useLoaderData<{ availableMajors: Specialization[], availableMinors: Specialization[] }>();
    const actionData = useActionData<typeof action>();

    const majors: Specialization[] = availableMajors as unknown as Specialization[];
    const minors: Specialization[] = availableMinors as unknown as Specialization[];

    return(
        <>
            <Form method="post" className="max-w-md mx-auto my-8">
                <div className="mb-6">
                    <label htmlFor="planName" className="block text-sm font-medium text-gray-700">Plan Name:</label>
                    <input type="text" id="planName" name="planName" required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    {actionData?.errors?.plan ? (
                        <div className="pt-1 text-red-700" id="minor-error">
                            {actionData.errors.plan}
                        </div>
                    ) : null}
                </div>
                <div className="mb-6">
                    <label htmlFor="major" className="block text-sm font-medium text-gray-700">Major:</label>
                    <select id="major" name="major" required 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        {majors.map((major: Specialization) => (
                        <option key={major.id} value={major.id}>
                            {major.name} 
                        </option>
                        ))}
                    </select>
                    {actionData?.errors?.major ? (
                        <div className="pt-1 text-red-700" id="minor-error">
                            {actionData.errors.major}
                        </div>
                    ) : null}
                </div>
                <div className="mb-6">
                    <label htmlFor="minor" className="block text-sm font-medium text-gray-700">Minor:</label>
                    <select id="minor" name="minor" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="None">None</option>
                        {minors.map((minor: Specialization) => (
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
                </div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Submit
                </button>
            </Form>
        </>
    );
}
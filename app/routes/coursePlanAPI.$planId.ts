import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getCoursePlan, setCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const coursePlan = await getCoursePlan(params.planId || '');
    return json({ coursePlan });
};

export const action = async({ params, request }: { params: any, request: Request }) => { 
    const requestBody = await request.json();
    return await setCoursePlan(requestBody)
}
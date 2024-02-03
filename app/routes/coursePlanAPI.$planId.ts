import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getUserCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const coursePlan = await getUserCoursePlan(params.planId || '');
    return json({ coursePlan });
};
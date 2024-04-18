import { LoaderFunctionArgs, json } from "@remix-run/node";
import { prisma } from "~/db.server";
import { getCoursePlan, setCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";

/*
    I am certain this is not how remix is supposed to be used, but I am not sure how to do it properly.
    Any file containing API in the name is being used to handle API requests.
    This functionality is supposed to be handled by the routes themselves, but I am not sure how to do that.
*/

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    await requireUserId(request);

    if (request.method === 'GET') {
        const planId = params.planId ?? '';
        const coursePlan = await getCoursePlan(planId);
        if (!coursePlan) {
            return json("Course plan not found", { status: 404 });
        }
        return json({ coursePlan });
    }
}

export const action = async({ params, request }: { params: any, request: Request }) => {
    await requireUserId(request);

    if (request.method === 'DELETE') {
        await prisma.plannedCourse.deleteMany({ where: { coursePlanId: params.planId } });
        await prisma.coursePlan.delete({ where: { id: params.planId } });
        return json({ success: true });
    }

    if (request.method === 'POST') {
        const requestBody = await request.json();
        return await setCoursePlan(requestBody)
    }
}
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { prisma } from "~/db.server";
import { getCoursePlan, setCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";


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
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { prisma } from "~/db.server";
import { SpecializationType } from "~/interfaces";
import { getAlternatives, getCoursePlan, getElectivePlaceholder, setCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);

    const url = new URL(request.url);
    const plannedCourseId = url.searchParams.get("plannedCourseId") || '';
    const alternativeSearch = url.searchParams.get("alternativeSearch") || '';
    const getSpecializations = url.searchParams.get("getSpecializations") === 'true';
    const resetElective = url.searchParams.get("resetElective") === 'true';

    if (getSpecializations) {
        const availableMajors = await prisma.specialization.findMany({where: {specializationType: SpecializationType.MAJOR}})
        const availableMinors = await prisma.specialization.findMany({where: {specializationType: SpecializationType.MINOR}})
        return json({ availableMajors, availableMinors});
    }

    if (plannedCourseId && !resetElective) {
        const alternativeData = await getAlternatives(plannedCourseId, alternativeSearch);
        return json({ alternativeData });
    }

    if(plannedCourseId && resetElective){
        const electiveCourse = await getElectivePlaceholder(plannedCourseId);
        return json({ electiveCourse });
    }

    const coursePlan = await getCoursePlan(params.planId ?? '');
    return json({ coursePlan });
};


export const action = async({ params, request }: { params: any, request: Request }) => {

    if (request.method === 'DELETE') {
        await prisma.plannedCourse.deleteMany({ where: { coursePlanId: params.planId } });
        await prisma.coursePlan.delete({ where: { id: params.planId } });
        return json({ success: true });
    }

    const requestBody = await request.json();
    return await setCoursePlan(requestBody)
}
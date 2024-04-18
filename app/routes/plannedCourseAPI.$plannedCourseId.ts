import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getAlternatives, getElectivePlaceholder } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    await requireUserId(request);

    if (request.method === 'GET') {
        const plannedCourseId = params.plannedCourseId ?? '';
        const url = new URL(request.url);
        const alternativeSearch = url.searchParams.get("alternativeSearch") || '';
        const resetElective = url.searchParams.get("resetElective") === 'true';

        if (plannedCourseId && !resetElective) {
            const alternativeData = await getAlternatives(plannedCourseId, alternativeSearch);
            return json({ alternativeData });
        }

        if(plannedCourseId && resetElective){
            const electiveCourse = await getElectivePlaceholder(plannedCourseId);
            return json({ electiveCourse });
        }
    }
};



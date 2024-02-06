import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getCoursePlan, setCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";
import { Request } from "express";
import { getCourse } from "~/models/course.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const course = await getCourse(params.courseId || '');
    return json({ course });
};


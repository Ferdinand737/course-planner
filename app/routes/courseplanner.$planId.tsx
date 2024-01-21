import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getUserCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";


export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const coursePlan = await getUserCoursePlan(params.planId || '');
    console.log(coursePlan);
    return json({ coursePlan });
};


export const action = async ({ params, request }: ActionFunctionArgs) => {

};

export default function NewCoursePlan(){
    const data = useLoaderData<typeof loader>();
    const plan = data.coursePlan;

    return(
        <>
            {plan && <p>{plan.title}</p>}
            {plan?.courses.map((course) => {
                return(
                    <div key={course.id}>
                        <p>{course.code}</p>
                        <p>{course.description}</p>
                    </div>
                );
            })}
          
        </>
    );
}
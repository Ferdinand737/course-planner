import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getUserCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const coursePlan = await getUserCoursePlan(params.planId || '');
    return json({ coursePlan });
};


export const action = async ({ params, request }: ActionFunctionArgs) => {

};

export default function NewCoursePlan(){
    const data = useLoaderData<typeof loader>();
    const plan = data.coursePlan;

    const plannedCourses = plan?.plannedCourses;



    function RenderCourse({ course, index }: { course: any, index: number }){
        return(
            <div className="p-2 m-2 bg-gray-100 rounded-md">
                <p>{course.course.code}</p>
            </div>
        )
    }
    
    function RenderTerm({ absoluteTerm }: { absoluteTerm: number }){
        const termNames = ["Winter 1", "Winter 2", "Summer 1", "Summer 2"];
        return(
            <div className="p-4 border-b flex flex-col md:flex-row justify-between w-full">
                <h1 className="font-bold text-lg">{termNames[(absoluteTerm - 1) % 4]}</h1>
                <div className="flex flex-wrap">
                    {plannedCourses?.filter(course => course.term === absoluteTerm).map((course, index) => (
                        <RenderCourse key={course.id} course={course} index={index} />
                    ))}
                </div>
            </div>
        )
    }
    
    function RenderYear(props: { year: number }){
        return(
            <div className="max-w-full bg-white rounded-xl shadow-md overflow-hidden md:max-w-full m-4">
                <div className="p-8 w-full">
                    <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
                        Year {props.year}
                    </div>
                    {Array.from({ length: 4 }, (_, index) => (
                        <RenderTerm key={index} absoluteTerm={(props.year - 1) * 4 + index + 1} />
                    ))}
                </div>
            </div>
        )
    }

    function RenderPlan(){

        const numYears = plan?.numTerms / 4 ?? 0;
        

        return(
            <>
                {Array.from({ length: numYears }, (_, index) => (
                        <RenderYear key={index} year={index+1} />
                    ))}
            </>
        );
        
    }

    return(
        <>
            <RenderPlan /> 
        </>
    );
}
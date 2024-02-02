import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getUserCoursePlan } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";
import { Suspense, lazy, useEffect, useState } from "react";
import { PlannedCourse } from "@prisma/client";
import React from "react";
import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle } from "react-beautiful-dnd";





export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const coursePlan = await getUserCoursePlan(params.planId || '');
    return json({ coursePlan });
};


export const action = async ({ params, request }: ActionFunctionArgs) => {

};

// export async function clientLoader({request,params}: LoaderFunctionArgs) {
//     const userId = await requireUserId(request);
//     const coursePlan = await getUserCoursePlan(params.planId || '');
//     console.log(coursePlan)
//     return json({ coursePlan });
//   }
  
// export function HydrateFallback() {
//     return <p>Loading...</p>;
// }

export default function CoursePlan(){
    const data = useLoaderData<typeof loader>();
    const plan = data.coursePlan;

    const plannedCourses = plan?.plannedCourses;
    const numYears = plan?.numTerms / 4 ?? 0;
    
   const groupByTerm = (courses: PlannedCourse[], totalTerms: number): Record<number, PlannedCourse[]> => {
    // Initialize the accumulator with empty arrays for each term
    const initialAcc: Record<number, PlannedCourse[]> = {};
    for (let i = 1; i <= totalTerms; i++) {
      initialAcc[i] = [];
    }
  
    // Reduce the courses into the accumulator
    return courses.reduce((acc: Record<number, PlannedCourse[]>, course: PlannedCourse) => {
      acc[course.term].push(course);
      return acc;
    }, initialAcc);
  };
  
    const groupedCourses = Object.values(groupByTerm(plannedCourses || [], numYears * 4));


    function RenderCourse(props:{ plannedCourse: PlannedCourse, idx: number }){
        const { plannedCourse, idx } = props;

        const course  = plannedCourse.course;

        return(
            <Draggable
                key={plannedCourse.id}
                draggableId={plannedCourse.id}
                index={idx}
            >
                {(provided, snapshot) => (
                    <div 
                        className="p-2 m-2 bg-gray-100 rounded-md"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                    >
                        <p>{course.code}</p>
                    </div>
                )}
            </Draggable>
        )
    }
    
    function RenderTerm(props: { term: PlannedCourse[], idx: number}){
        const termNames = ["Winter 1", "Winter 2", "Summer 1", "Summer 2"];
        const { term, idx } = props;
        const absoluteTerm = idx + 1;
        return(
            <Droppable
                key={idx}
                droppableId={`${idx}`}
                direction="horizontal"
            >
                {(provided, snapshot) => (
                    <div 
                        //className="p-4 border-b flex flex-col md:flex-row justify-between w-full"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        <h1 className="font-bold text-lg">{termNames[(absoluteTerm - 1) % 4]}</h1>
                        <div className="flex flex-wrap">
                            {term.map((plannedCourse, idx) => (
                                <RenderCourse key={plannedCourse.id} plannedCourse={plannedCourse} idx={idx} />
                            ))}
                        </div>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        )
    }
    
    // function RenderYear(props: { year: number }){
    //     return(
    //         <div className="max-w-full bg-white rounded-xl shadow-md overflow-hidden md:max-w-full m-4">
    //             <div className="p-8 w-full">
    //                 <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
    //                     Year {props.year}
    //                 </div>
    //                 {Array.from({ length: 4 }, (_, index) => (
    //                     <RenderTerm key={index} absoluteTerm={(props.year - 1) * 4 + index + 1} />
    //                 ))}
    //             </div>
    //         </div>
    //     )
    // }

    function onDragEnd(result: { source: any; destination: any; }) {
        const { source, destination } = result;
        console.log("Hello")
        if (!destination) {
            return;
        }
    }


    return(
        <>
        <div>
            <DragDropContext onDragEnd={onDragEnd}>
                <div>
                    {groupedCourses.map((term, idx) => (
                        <RenderTerm key={idx} term={term} idx={idx} />
                    ))}
                </div>
            </DragDropContext>
        </div>
            
        </>
    );
}

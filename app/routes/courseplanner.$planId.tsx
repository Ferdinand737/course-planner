import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { PlannedCourse } from "@prisma/client";
import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle } from "react-beautiful-dnd";
import { ArcherContainer, ArcherElement } from 'react-archer';
import { c } from "vitest/dist/reporters-5f784f42";




export async function clientLoader({params}: {params: any}) {
    // This is just here to force client side rendering and get the planId
    return params.planId;
};


export default function CoursePlan(){

    const id = useLoaderData();
   
    const [coursePlan, setCoursePlan] = useState(null); 
    const [loading, setLoading] = useState(true); 
    const [groupedCourses, setGroupedCourses] = useState([]);


    const groupByTerm = (courses: PlannedCourse[], totalTerms: number): Record<number, PlannedCourse[]> => {
        const initialAcc: Record<number, PlannedCourse[]> = {};
        for (let i = 1; i <= totalTerms; i++) {
          initialAcc[i] = [];
        }
      
        return courses.reduce((acc: Record<number, PlannedCourse[]>, course: PlannedCourse) => {
          acc[course.term].push(course);
          return acc;
        }, initialAcc);
    };


    useEffect(() => {
        async function fetchCoursePlan() {
            const response = await fetch(`/coursePlanAPI/${id}`); 
            const data = await response.json();
            setCoursePlan(data.coursePlan);
            setLoading(false); 
        }
        fetchCoursePlan();
    }, []);
    
    useEffect(() => {
        if (coursePlan && coursePlan.plannedCourses) {
            const numYears = coursePlan.numTerms / 4 ?? 0;
            setGroupedCourses(Object.values(groupByTerm(coursePlan.plannedCourses, numYears * 4)));
        }
    }, [coursePlan]);



    

    if(loading){
        return(
            <h1>Loading...</h1>
        )
    }

    const move = (source:  PlannedCourse[], destination: PlannedCourse[], droppableSource:any, droppableDestination:any) => {
        const sourceClone = Array.from(source);
        const destClone = Array.from(destination);
        const [removed] = sourceClone.splice(droppableSource.index, 1);
        
        destClone.splice(droppableDestination.index, 0, removed);
        
        const result = {};
        result[droppableSource.droppableId] = sourceClone;
        result[droppableDestination.droppableId] = destClone;
        
        return result;
    };


    const reorder = (list: PlannedCourse[], startIndex: number, endIndex: number) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        
        return result;
    };
    

    function onDragEnd(result) {
        const { source, destination } = result;
    
        if (!destination) {
            return;
        }
        const sInd = +source.droppableId;
        const dInd = +destination.droppableId;
    
        if (sInd === dInd) {
            const items = reorder(groupedCourses[sInd], source.index, destination.index);
            const newState = [...groupedCourses];
            newState[sInd] = items;
            setGroupedCourses(newState);
        } else {
            const result = move(groupedCourses[sInd], groupedCourses[dInd], source, destination);
            const newState = [...groupedCourses];
            newState[sInd] = result[sInd];
            newState[dInd] = result[dInd];
    
            setGroupedCourses(newState);
        }
    }
            


    function RenderCourse(props:{ plannedCourse: PlannedCourse, idx: number }){

        function extractCourseValues(node) {
            let courses = [];
            
            // Check if node itself is a leaf of type course
            if (node.type === "course") {
                return [node.value];
            }
            
            // If node has 'and' or 'or', recursively search within
            for (const key of Object.keys(node)) {
                if (key === "and" || key === "or") {
                    for (const child of node[key]) {
                        courses = courses.concat(extractCourseValues(child));
                    }
                }
            }
            
            return courses;
        }



        const { plannedCourse, idx } = props;

        const course  = plannedCourse.course;

        const thisCourseAPreRequisite = []

        coursePlan?.plannedCourses.forEach(plannedCourse => {
            const preRequisites =  extractCourseValues(plannedCourse.course.preRequisites);
                
                if(preRequisites.includes(course.code)){
                    thisCourseAPreRequisite.push(plannedCourse)
                }
        });

        

        return(
            <Draggable
                key={plannedCourse.id}
                draggableId={plannedCourse.id}
                index={idx}
            >
                {(provided, snapshot) => (
                    <div 
                    className="p-2 m-2 bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    >
                    <ArcherElement
                    id={plannedCourse.id}
                    relations={thisCourseAPreRequisite.map(plannedCourse => ({
                        targetId: plannedCourse.id,
                        targetAnchor: 'top', 
                        sourceAnchor: 'bottom', 
                        style: {strokeColor: '#34a4eb'},
                    }))}
                >
                        <p>{course.code}</p>
                </ArcherElement>
                        </div>
                )}
            </Draggable>
        )
    }
    
    function RenderTerm(props: { term: PlannedCourse[], idx: number}){
        const termNames = ["Winter 1", "Winter 2", "Summer 1", "Summer 2"];
        const { term, idx } = props;
        const absoluteTerm = idx + 1;
        const year = Math.floor((absoluteTerm - 1) / 4) + 1;
        const showYear = idx % 4 === 0;

        return(
            <>
                {showYear && 
                
                <h1 className="font-bold text-lg mt-2">
                    Year: {year}
                </h1>
                }
                <Droppable
                    key={idx}
                    droppableId={`${idx}`}
                    direction="horizontal"
                >
                    {(provided, snapshot) => (
                        <div 
                        className="p-4 border-b flex flex-col md:flex-row justify-between w-full h-[100px]" 
                        ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <h1 className="font-bold text-lg">{termNames[(absoluteTerm - 1) % 4]}</h1>
                            <div className="flex flex-wrap justify-center space-x-20 w-full">
                                {term.map((plannedCourse, idx) => (
                                    <RenderCourse key={plannedCourse.id} plannedCourse={plannedCourse} idx={idx} />
                                ))}
                            </div>
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </>
        )
    }


    return(
        <>
            <div>
                <ArcherContainer strokeColor="red">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div>
                            {groupedCourses.map((term, idx) => (
                                <RenderTerm key={idx} term={term} idx={idx} />
                            ))}
                        </div>
                    </DragDropContext>
                </ArcherContainer>
            </div>
        </>
    );
}



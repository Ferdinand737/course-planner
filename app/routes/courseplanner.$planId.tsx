import { useEffect, useState } from "react";
import { PlannedCourse } from "@prisma/client";
import { DragDropContext, Droppable, Draggable} from "react-beautiful-dnd";
import { ArcherContainer, ArcherElement } from 'react-archer';
import { useLoaderData, Link, Outlet } from "@remix-run/react";


export async function clientLoader({params}: {params: any}) {
    // This is just here to force client side rendering and get the planId
    return params.planId;
};


export default function CoursePlan(){

    const id = useLoaderData();
   
    const [coursePlan, setCoursePlan] = useState(null); 
    const [loading, setLoading] = useState(true); 
    const [groupedCourses, setGroupedCourses] = useState([]);
    const [hoveredCourseId, setHoveredCourseId] = useState<string>();


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

    useEffect(() => {
        async function postCoursePlan(){
            // Update coursePlan with new plannedCourses before posting
            const updatedCoursePlan = {
                ...coursePlan, // Spread existing coursePlan to maintain other properties
                plannedCourses: groupedCourses.flat() // Update plannedCourses with flattened groupedCourses
            };
    
            const response = await fetch(`/coursePlanAPI/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Send the updated coursePlan in the request body
                body: JSON.stringify({coursePlan: updatedCoursePlan})
            });
            const data = await response.json();
        }
        if(groupedCourses && coursePlan){
            postCoursePlan();
        }
    },[groupedCourses, coursePlan]); 




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

    function updateTermNumbers(newGroupedCourses: PlannedCourse[][]){
        for(let i = 0; i < newGroupedCourses.length; i++){
            for(let j = 0; j < newGroupedCourses[i].length; j++){
                newGroupedCourses[i][j].term = i + 1;
            }
        }
        return newGroupedCourses;
    }


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
            setGroupedCourses(updateTermNumbers(newState));
        } else {
            const result = move(groupedCourses[sInd], groupedCourses[dInd], source, destination);
            const newState =[...groupedCourses];
            newState[sInd] = result[sInd];
            newState[dInd] = result[dInd];
    
            setGroupedCourses(updateTermNumbers(newState));
        }
    }
   

    function RenderCourse(props:{ plannedCourse: PlannedCourse, idx: number }){

        function extractCourseValues(node) {
            let courses = [];
            // Check if node itself is a leaf of type COURSE
            if (node.type === "LEAF" && node.subtype === "COURSE") {
                return [node.value];
            }
            // Recursively search through child nodes if they exist
            if (node.childNodes && node.childNodes.length > 0) {
                node.childNodes.forEach(child => {
                    courses = courses.concat(extractCourseValues(child));
                });
            }   
            return courses;
        }
        
 
        const { plannedCourse, idx } = props;

        const course  = plannedCourse.course;

        const thisCourseAPreRequisite: PlannedCourse[] = []

        coursePlan?.plannedCourses.forEach(plannedCourse => {
            const preRequisites =  extractCourseValues(plannedCourse.course.preRequisites);

            for(const preRequisite of preRequisites){
                if (preRequisite.includes(course.code)) {
                    thisCourseAPreRequisite.push(plannedCourse);
                }
            }
        });

        let arrowColor = '#d3d3d3'
        
        
        if(thisCourseAPreRequisite.includes(hoveredCourseId) || hoveredCourseId === plannedCourse.id){
            arrowColor = '#cb8cf5'
        }
            

        return(
            <>
            <Draggable
                key={plannedCourse.id}
                draggableId={plannedCourse.id}
                index={idx}
                
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        >
                    <ArcherElement
                            id={plannedCourse.id}
                            relations={thisCourseAPreRequisite.map((plannedCourse) => ({
                                targetId: plannedCourse.id,
                                targetAnchor: 'top',
                                sourceAnchor: 'bottom',
                                style: {
                                    strokeColor: arrowColor,
                                },
                            }))}
                            >
                        <Link to={`${course.id}`}>
                            <div className="p-2 m-2 rounded-full w-18 h-18 flex items-center justify-center bg-blue-200" style={{ position: 'relative', zIndex: 1, backgroundColor: '#7ddcff' }}
                            onMouseEnter={() => setHoveredCourseId(plannedCourse.id)}
                            //onMouseLeave={() => setHoveredCourseId(null)}  this line breaks dragging             
                            >
                                <p style={{ fontSize: '0.8rem' }}>{course.code}</p> 
                            </div>
                        </Link>
                        </ArcherElement>
                    </div>
                )}
            </Draggable>
            </>
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
                {showYear && (
                    <div className="flex items-baseline space-x-2 mt-4 mb-2">
                    <h1 className="text-xl font-semibold text-gray-800">
                        Year {year}
                    </h1>
                    </div>
                )}
                <Droppable
                    key={idx}
                    droppableId={`${idx}`}
                    direction="horizontal"
                >
                    {(provided, snapshot) => (
                    <div 
                        className={`p-4 border-b flex ${snapshot.isDraggingOver ? 'bg-gray-100' : 'bg-white'} flex-col md:flex-row justify-between w-full h-auto shadow-md rounded-lg`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        <div className="flex items-baseline space-x-1">
                        <h1 className="text-lg font-semibold text-blue-600">
                            {termNames[(absoluteTerm - 1) % 4].split(" ")[0]}
                        </h1>
                        <h1 className="text-lg font-semibold text-blue-600">
                            {termNames[(absoluteTerm - 1) % 4].split(" ")[1]}
                        </h1>
                        </div>
                        <div className="flex flex-wrap justify-center gap-5 w-full">
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


    return (
        <div className="flex h-full min-h-screen"> 
            <div className="flex-1"> 
                <ArcherContainer>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div>
                            {groupedCourses.map((term, idx) => (
                                <RenderTerm key={idx} term={term} idx={idx} />
                            ))}
                        </div>
                    </DragDropContext>
                </ArcherContainer>
            </div>
            <div className="w-80">
                <Outlet/>
            </div>
        </div>
    );
    
}



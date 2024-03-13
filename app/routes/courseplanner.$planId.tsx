import { useEffect, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { ArcherContainer } from 'react-archer';
import { useLoaderData } from "@remix-run/react";
import CourseInfoPanel from "~/components/courseInfoPanel";
import { Course, CoursePlan, PlannedCourse } from "~/interfaces";
import { Button, message } from "antd";
import { PlusOutlined } from '@ant-design/icons';
import TermComponent from "~/components/term";


export async function clientLoader({params}: {params: any}) {
    // This is just here to force client side rendering and get the planId
    return params.planId;
};


export default function CoursePlanPage(){

    const id = useLoaderData();
   
    const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
    const [loading, setLoading] = useState(true); 
    const [groupedCourses, setGroupedCourses] = useState<PlannedCourse[][]>([]);
    const [selectedCourse, setSelectedCourse] = useState<PlannedCourse>();
    const [hoveredCourseId, setHoveredCourseId] = useState<string>();


    useEffect(() => {
        async function fetchCoursePlan() {
            const response = await fetch(`/coursePlanAPI/${id}`); 
            const data = await response.json();
            setCoursePlan(data.coursePlan);
            setLoading(false); 
        }
        fetchCoursePlan();
    }, []);
    

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
    },[groupedCourses]); 


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
        
        const result: {[key: string]: PlannedCourse[]} = {}; 
        
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
    

    function onDragEnd(result: { source: any; destination: any; }) {
        const { source, destination } = result;
    
        if (!destination) {
            return;
        }
        const sInd = +source.droppableId;
        const dInd = +destination.droppableId;
    
        let newState = [...groupedCourses]; // Ensure newState is a new array
    
        if (sInd === dInd) {
            const items = reorder(newState[sInd], source.index, destination.index);
            newState[sInd] = items;
        } else {
            const result = move(newState[sInd], newState[dInd], source, destination);
            newState = newState.map((group, index) => { // Create a new array for newState
                if (index === sInd) return result[sInd];
                if (index === dInd) return result[dInd];
                return group;
            });
        }
    
        setGroupedCourses(updateTermNumbers(newState));
    }


    function selectCourse(course: PlannedCourse){
        setSelectedCourse(course);
    }
    

    function hoverCourse(course: PlannedCourse){
        setHoveredCourseId(course.id);
    }
   

    const updateElectiveCourse = (course: PlannedCourse, alternative: Course) => {
        const newGroupedCourses = [...groupedCourses];
        for (const existingPlanned of newGroupedCourses.flat()) {
            if(existingPlanned?.course?.id === alternative.id){     
                message.error('This course is already planned');
                return;
            }
        }
        const term = newGroupedCourses[course.term - 1];
        const index = term.findIndex((plannedCourse) => plannedCourse.id === course.id);
        term[index] = {
            ...course,
            course: alternative,
        };

        setCoursePlan((prevState: CoursePlan | null) => ({
            ...prevState!,
            plannedCourses: newGroupedCourses.flat()
        }));
    }


    const addYear = () => {
        setCoursePlan((prevState: CoursePlan | null) => ({
            ...prevState!,
            numTerms: prevState!.numTerms + 4
        }));
    };


    const removeYear = (year:number) => {
        const yearToRemove = groupedCourses.slice((year - 1) * 4, year * 4);
        const flattenedYear = yearToRemove.flat();

        const startIdx = (year - 1) * 4;
        const endIdx = year * 4;

        if (flattenedYear.length > 0) {
            message.error('Cannot remove year with planned courses');
            return;
        }

        const updatedGroupedCourses = groupedCourses
        .filter((_, index) => index < startIdx || index >= endIdx)
        .map((termGroup, index) => {
            // Only adjust terms that come after the removed year.
            if (index >= startIdx) {
                return termGroup.map(plannedCourse => ({
                    ...plannedCourse,
                    term: plannedCourse.term - 4
                }));
            }
            return termGroup;
        });

        setCoursePlan((prevState: CoursePlan | null) => ({
            ...prevState!,
            plannedCourses:updatedGroupedCourses.flat(),
            numTerms: prevState!.numTerms - 4
        }));
    }

    
    return (
        <div className="flex h-full min-h-screen"> 
            <div className="flex-1"> 
                <ArcherContainer>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div>
                            {groupedCourses.map((term, idx) => (
                                <TermComponent 
                                    key={idx} 
                                    term={term} 
                                    idx={idx}
                                    coursePlan={coursePlan!}
                                    selectCourse={selectCourse}
                                    hoverCourse={hoverCourse}
                                    removeYear={removeYear}
                                    groupedCourses={groupedCourses}
                                    hoveredCourseId={hoveredCourseId}   
                                />
                            ))}
                        </div>
                    </DragDropContext>
                </ArcherContainer>
                <div className="bg-primary w-full">
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    className="m-2 w-full text-white bg-blue-600 hover:bg-blue-700"
                    onClick={addYear} // Add this line
                >
                    Add Year
                </Button>
            </div>
            </div>
            {selectedCourse && coursePlan ? (
                <div className="w-80">
                    <CourseInfoPanel 
                        plannedCourse={selectedCourse} 
                        updateElectiveCourse={updateElectiveCourse} 
                        planId={coursePlan.id}
                    />
                </div>
            ):(null)}
        </div>
    );
    
}



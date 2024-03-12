import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable} from "react-beautiful-dnd";
import { ArcherContainer, ArcherElement } from 'react-archer';
import { useLoaderData } from "@remix-run/react";
import CourseInfoPanel from "~/components/courseInfoPanel";
import { Course, CoursePlan, PlannedCourse } from "~/interfaces";
import { Button, message } from "antd";
import { Tooltip } from 'antd';
import { ExclamationCircleOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';


export async function clientLoader({params}: {params: any}) {
    // This is just here to force client side rendering and get the planId
    return params.planId;
};


export default function CoursePlanPage(){

    const id = useLoaderData();
   
    const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
    const [loading, setLoading] = useState(true); 
    const [groupedCourses, setGroupedCourses] = useState<PlannedCourse[][]>([]);
    const [hoveredCourseId, setHoveredCourseId] = useState<string>();
    const [selectedCourse, setSelectedCourse] = useState<PlannedCourse>();

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
   

    function RenderCourse(props:{ plannedCourse: PlannedCourse, idx: number }){

        const { idx } = props;
        const  thisPlannedCourse  = props.plannedCourse

        function courseIsInPlan(courseCode: string){
            return coursePlan?.plannedCourses?.some((plannedCourse) => plannedCourse.course?.code === courseCode);
        }

        function getCourseTerm(courseCode: string){
            return Number(coursePlan?.plannedCourses?.find((plannedCourse) => plannedCourse.course?.code === courseCode)?.term);
        }


        function checkPreRequisites(node: { type: string; subtype: string; value: any; childNodes: any[]; } | any) {

            let failedConditions: string[] = []; 

            // This is for courses without pre-requisites
            if (!node.subtype) {
                return { result: true, failedConditions: [] };
            }

            const thisNodeSubType = node.subtype.toUpperCase();
            
            if (thisNodeSubType === "COURSE") {
                const isInPlan = courseIsInPlan(node.value) && getCourseTerm(node.value) < thisPlannedCourse.term;
                return { 
                    result: isInPlan, 
                    failedConditions: isInPlan ? [] : [`Course ${node.value} is not in plan`]
                };
            }
        
            if (thisNodeSubType=== "AND" || thisNodeSubType === "GRADE") {
                const allPassed = node.childNodes.every((child:{ type: string; subtype: string; value: any; childNodes: any[]; }) => {
                    const { result, failedConditions: childFailed } = checkPreRequisites(child);
                    failedConditions = failedConditions.concat(childFailed);
                    return result;
                });
                return { result: allPassed, failedConditions };
            }
        
            if (thisNodeSubType === "OR") {
                let passed = false;
                node.childNodes.forEach((child:{ type: string; subtype: string; value: any; childNodes: any[]; }) => {
                    const { result, failedConditions: childFailed } = checkPreRequisites(child);
                    if (result) {
                        passed = true;
                    } else {
                        failedConditions = failedConditions.concat(childFailed);
                    }
                });
                return { result: passed, failedConditions: passed ? [] : failedConditions };
            }
        
            if (thisNodeSubType === "N_OF") {
                let count = 0;
                node.childNodes.forEach((child:{ type: string; subtype: string; value: any; childNodes: any[]; }) => {
                    const { result, failedConditions: childFailed } = checkPreRequisites(child);
                    if (result) {
                        count++;
                    } else {
                        failedConditions = failedConditions.concat(childFailed);
                    }
                });
                const n = node.value;
                return { 
                    result: count >= n, 
                    failedConditions: count >= n ? [] : [`N_OF (${n}): only ${count} conditions passed`]
                };
            }
        
                  
            if (thisNodeSubType === "YEAR") {
                const yearRequirement = Math.floor((thisPlannedCourse.term - 1) / 4) + 1 >= Number(node.value);
                return { 
                    result: yearRequirement, 
                    failedConditions: yearRequirement ? [] : [`Year requirement ${node.value} not met`]
                };
            }
        
            // Return a default failure case for unknown types
            return { result: true, failedConditions: [`Unknown subtype ${thisNodeSubType}`] };
        }
        

        function extractCourseValues(node: { type: string; subtype: string; value: any; childNodes: any[]; } | any) {
     
            let courses: any[] = [];
            // Check if node itself is a leaf of type COURSE
            if (node.type === "LEAF" && node.subtype === "COURSE") {
                return [node.value];
            }
            // Recursively search through child nodes if they exist
            if (node.childNodes && node.childNodes.length > 0) {
                node.childNodes.forEach((child: { type: string; subtype: string; value: any; childNodes: any[]; }) => {
                    courses = courses.concat(extractCourseValues(child));
                });
            }   
            return courses;
        }
        
        const thisCourse  = thisPlannedCourse.course;

        const thisCourseAPreRequisite: PlannedCourse[] = []
        
        coursePlan?.plannedCourses?.forEach((plannedCourse: PlannedCourse) => {
            
            const preRequisites =  extractCourseValues(plannedCourse?.course?.preRequisites);

            for(const preRequisite of preRequisites){
                if (preRequisite.includes(thisCourse?.code)) {
                    thisCourseAPreRequisite.push(plannedCourse);
                }
            }
        });

        let courseColor = '#7ddcff';

        if(thisPlannedCourse.isElective){
            if(thisPlannedCourse.electiveType == "CHOICE"){
                courseColor = '#aaffaa';
            }else{
                courseColor = '#ff7de7';
            }
        }

        const check = checkPreRequisites(thisCourse?.preRequisites);

        if(check.result !== true){
            courseColor = '#f7576f';
        }

        return(
            <>
            <Draggable
                key={thisPlannedCourse.id}
                draggableId={thisPlannedCourse.id}
                index={idx}
                
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        >
                        <ArcherElement
                            id={thisPlannedCourse.id}
                            relations={thisCourseAPreRequisite.filter(plannedCourse => plannedCourse.id === hoveredCourseId || hoveredCourseId === thisPlannedCourse.id)
                                .map((plannedCourse) => ({
                                    targetId: plannedCourse.id,
                                    targetAnchor: 'top',
                                    sourceAnchor: 'bottom',
                                    style: {
                                        strokeColor: '#cb8cf5'
                                    },
                                }))
                            }
                        >
                        <div className="p-2 m-2 rounded-full w-18 h-18 flex items-center justify-center" 
                                style={{ position: 'relative', zIndex: 1, backgroundColor: courseColor}}
                             onMouseEnter={() => setHoveredCourseId(thisPlannedCourse.id)}
                             onClick={() => {
                                 console.log(thisPlannedCourse);
                                 console.log(check);
                                 setSelectedCourse(thisPlannedCourse);
                             }}
                        >
                            {check.result !== true && (
                                <Tooltip title={`Failed Conditions: ${check.failedConditions.join(', ')}`}>
                                    <ExclamationCircleOutlined className="absolute top-0 right-0 text-red-500" style={{ fontSize: '16px', transform: 'translate(50%, -50%)' }}/>
                                </Tooltip>
                            )}
                            <p style={{ fontSize: '0.8rem' }}>{thisCourse?.code}</p> 
                        </div>
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
        const canRemove = groupedCourses.slice((year - 1) * 4, year * 4).flat().length == 0;

        return(
                <>
                {showYear && (
                    <div className="flex items-baseline space-x-2 mt-4 mb-2">
                        <h1 className="text-xl font-semibold text-gray-800">
                            Year {year}
                        </h1>
                        {
                            canRemove && (
                                <Tooltip title="Remove Year">
                                    <Button 
                                        icon={<MinusOutlined />} 
                                        onClick={() => removeYear(year)}
                                        className="p-1"
                                    />
                                </Tooltip>
                            )
                        }
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
        setGroupedCourses(newGroupedCourses);
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
                                <RenderTerm key={idx} term={term} idx={idx} />
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
                    <CourseInfoPanel plannedCourse={selectedCourse} updateElectiveCourse={updateElectiveCourse} planId={coursePlan.id}/>
                </div>
            ):(null)}
        </div>
    );
    
}



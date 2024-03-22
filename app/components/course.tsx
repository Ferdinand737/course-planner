import { Tooltip } from "antd";
import { ArcherElement } from "react-archer";
import { Draggable } from "react-beautiful-dnd";
import { Course, CoursePlan, ElectiveType, PlannedCourse } from "~/interfaces";
import { ExclamationCircleOutlined, RetweetOutlined } from '@ant-design/icons';
import React from "react";


export default function CourseComponent(props: {
    plannedCourse: PlannedCourse, 
    idx: number,
    hoveredCourseId: string|undefined,
    coursePlan: CoursePlan|null,
    selectCourse: (plannedCourse: PlannedCourse) => void,
    hoverCourse: (plannedCourse: PlannedCourse) => void,
    updateElectiveCourse: (course: PlannedCourse, alternative: Course) => void,
}) {
    const { idx, coursePlan, hoveredCourseId, selectCourse, hoverCourse, updateElectiveCourse } = props;

    const thisPlannedCourse = props.plannedCourse;
    const thisCourse = props.plannedCourse?.course;


    function courseIsInPlan(courseCode: string){
        return coursePlan?.plannedCourses?.some((plannedCourse) => plannedCourse.course?.code === courseCode);
    }


    function getCourseTerm(courseCode: string){
        return Number(coursePlan?.plannedCourses?.find((plannedCourse) => plannedCourse.course?.code === courseCode)?.term);
    }


    function checkPreRequisites(node: { type: string; subtype: string; value: any; childNodes: any[]; } | any) {

        let failedConditions: string[] = []; 

        // Base case: No subtype means no pre-requisites
        if (!node.subtype) {
            return { result: true, failedConditions: [] };
        }
    
        const thisNodeSubType = node.subtype.toUpperCase();
        
        // Case for individual courses
        if (thisNodeSubType === "COURSE") {
            const isInPlan = courseIsInPlan(node.value) && getCourseTerm(node.value) < thisPlannedCourse.term;
            if (!isInPlan) {
                failedConditions.push(`${node.value} is not in plan`);
            }
            return { result: isInPlan, failedConditions };
        }
    
        // Handling AND logic
        if (thisNodeSubType === "AND" || thisNodeSubType === "GRADE") {
            node.childNodes.forEach((child: { type: string; subtype: string; value: any; childNodes: any[]; }) => {
                const childResult = checkPreRequisites(child);
                if (!childResult.result) {
                    failedConditions = [...failedConditions, ...childResult.failedConditions];
                }
            });
            return { result: failedConditions.length === 0, failedConditions };
        }
    
        // Handling OR logic
        if (thisNodeSubType === "OR") {
            let passed = false;
            node.childNodes.forEach((child: { type: string; subtype: string; value: any; childNodes: any[]; }) => {
                const childResult = checkPreRequisites(child);
                if (childResult.result) {
                    passed = true;
                } else {
                    failedConditions = [...failedConditions, ...childResult.failedConditions];
                }
            });
            return { result: passed, failedConditions: passed ? [] : failedConditions };
        }
    
        // Handling N_OF logic
        if (thisNodeSubType === "N_OF") {
            let count = 0;
            node.childNodes.forEach((child: { type: string; subtype: string; value: any; childNodes: any[]; }) => {
                const childResult = checkPreRequisites(child);
                if (childResult.result) {
                    count++;
                } else {
                    failedConditions = [...failedConditions, ...childResult.failedConditions];
                }
            });

            return { result: count >= node.value, failedConditions };
        }
    
        // Handling YEAR logic
        if (thisNodeSubType === "YEAR") {
            const yearRequirement = Math.floor((thisPlannedCourse.term - 1) / 4) + 1 >= Number(node.value);
            if (!yearRequirement) failedConditions.push(`Year requirement ${node.value} not met`);
            return { result: yearRequirement, failedConditions };
        }
    
        // Handling unknown types
        return { result: true, failedConditions: [`Unknown subtype ${thisNodeSubType}`] };
    }
    


    function getThisCoursePostRequisites(thisPlannedCourse: PlannedCourse){
        const thisCoursePostRequisites: PlannedCourse[] = []

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

        coursePlan?.plannedCourses?.forEach((plannedCourse: PlannedCourse) => {
        
            const preRequisites =  extractCourseValues(plannedCourse?.course?.preRequisites);
    
            for(const preRequisite of preRequisites){
                if (preRequisite.includes(thisPlannedCourse.course?.code)) {
                    thisCoursePostRequisites.push(plannedCourse);
                }
            }
        });

        return thisCoursePostRequisites;
    }


    const thisCoursePostRequisites: PlannedCourse[] = getThisCoursePostRequisites(thisPlannedCourse);
    
    let courseColor = '#7ddcff';

    if(thisPlannedCourse.isElective){
        if(thisPlannedCourse.electiveType == ElectiveType.CHOICE){
            courseColor = '#8ef58e';
        }else{
            courseColor = '#af91db';
        }
    }

    const check = checkPreRequisites(thisCourse?.preRequisites);

    let borderColor = courseColor;
    if(check.result !== true){
        borderColor = '#f7576f';
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
                        relations={thisCoursePostRequisites.filter(plannedCourse => plannedCourse.id === hoveredCourseId || hoveredCourseId === thisPlannedCourse.id)
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
                            style={{ position: 'relative', zIndex: 1, backgroundColor: courseColor, borderColor: borderColor, borderWidth: '3px', borderStyle: 'solid'}}
                         onMouseEnter={() => hoverCourse(thisPlannedCourse)}
                         onClick={() => {
                             selectCourse(thisPlannedCourse);
                         }}
                    >
                        {check.result !== true && (
                           <Tooltip 
                           title={
                               <div>
                                   <strong>Missing Pre-Requisites</strong>
                                   {check.failedConditions.map((condition, index) => (
                                       <React.Fragment key={index}>
                                           <br />{condition}
                                       </React.Fragment>
                                   ))}
                               </div>
                           }
                       >
                           <ExclamationCircleOutlined className="absolute top-0 right-0 text-red-500" style={{ fontSize: '16px', transform: 'translate(50%, -50%)' }}/>
                       </Tooltip>
                        )}
                            {thisPlannedCourse.isElective && (
                                <Tooltip
                                title={'Reset Elective'}>

                                    <RetweetOutlined 
                                        className="absolute bottom-0 right-0 text-blue-600 cursor-pointer" 
                                        style={{ 
                                            fontSize: '16px', 
                                            transform: 'translate(50%, 50%)'
                                        }}
                                        onClick={async () => {
                                            const response = await fetch(`/coursePlanAPI/${coursePlan?.id}?plannedCourseId=${thisPlannedCourse.id}&resetElective=true`);
                                            const data = await response.json();
                                            updateElectiveCourse(thisPlannedCourse, data.electiveCourse)
                                        }}
                                    />

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
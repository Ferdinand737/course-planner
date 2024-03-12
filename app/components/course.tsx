import { Tooltip } from "antd";
import { ArcherElement } from "react-archer";
import { Draggable } from "react-beautiful-dnd";
import { CoursePlan, PlannedCourse } from "~/interfaces";
import { ExclamationCircleOutlined } from '@ant-design/icons';


export default function CourseComponent(props: {
    plannedCourse: PlannedCourse, 
    idx: number,
    hoveredCourseId: string|undefined,
    coursePlan: CoursePlan|null,
    selectCourse: (plannedCourse: PlannedCourse) => void
    hoverCourse: (plannedCourse: PlannedCourse) => void
}) {
    const { idx, coursePlan, hoveredCourseId, selectCourse, hoverCourse } = props;

    const thisPlannedCourse = props.plannedCourse;
    const thisCourse = props.plannedCourse.course;


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
                            style={{ position: 'relative', zIndex: 1, backgroundColor: courseColor}}
                         onMouseEnter={() => hoverCourse(thisPlannedCourse)}
                         onClick={() => {
                             console.log(thisPlannedCourse);
                             console.log(check);
                             selectCourse(thisPlannedCourse);
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
import { CoursePlan, PlannedCourse } from "~/interfaces";
import CourseComponent from "./course";
import { Button, Tooltip } from "antd";
import { Droppable } from "react-beautiful-dnd";
import { MinusOutlined } from '@ant-design/icons';

export default function TermComponent(props: {
    idx: number,
    term: PlannedCourse[],
    coursePlan: CoursePlan,
    groupedCourses: PlannedCourse[][],
    hoveredCourseId: string|undefined,
    selectCourse: (plannedCourse: PlannedCourse) => void,
    hoverCourse: (plannedCourse: PlannedCourse) => void,
    removeYear: (year: number) => void,
}) {
    const { term, coursePlan, selectCourse, hoverCourse, removeYear, hoveredCourseId, idx, groupedCourses } = props;

    const termNames = ["Winter 1", "Winter 2", "Summer 1", "Summer 2"];
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
                            <CourseComponent 
                            key={plannedCourse.id} 
                            plannedCourse={plannedCourse} 
                            idx={idx} 
                            coursePlan={coursePlan}
                            selectCourse={selectCourse}
                            hoverCourse={hoverCourse}
                            hoveredCourseId={hoveredCourseId}
                            />
                        ))}
                    </div>
                    {provided.placeholder}
                </div>
                )}
            </Droppable>
        </>
    )
}
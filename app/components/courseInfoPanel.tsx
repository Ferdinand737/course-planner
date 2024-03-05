
import { Course, ElectiveType, PlannedCourse } from '../interfaces';
import { useEffect, useState } from 'react';

export default function CourseInfoPanel(props: {
    plannedCourse: PlannedCourse,
    planId: string,
    updateElectiveCourse: (course: PlannedCourse, alternative: Course) => void,
}) {
    const { plannedCourse, updateElectiveCourse, planId } = props;

    const course = plannedCourse?.course;
    const [searchTerm, setSearchTerm] = useState('');

    const [alternatives, setAlternatives] = useState<Course[]>([]);

    useEffect(() => {
        async function fetchAlternatives() {
            const response = await fetch(`/coursePlanAPI/${planId}?plannedCourseId=${plannedCourse.id}&alternativeSearch=${searchTerm}`);
            const data = await response.json();
            setAlternatives(data.alternativeData);
        }
        if(plannedCourse.electiveType == ElectiveType.CHOICE || searchTerm.length > 3){
            // "CHOICE" Type electives usually only have a few alternatives, so we just get them all
            fetchAlternatives();
        }else{
            setAlternatives([]);
        }
    },[plannedCourse, searchTerm])


    const terms = [
        course.winterTerm1 ? 'Winter Term 1' : '',
        course.winterTerm2 ? 'Winter Term 2' : '',
        course.summerTerm1 ? 'Summer Term 1' : '',
        course.summerTerm2 ? 'Summer Term 2' : '',
    ].filter(Boolean).join(', ');

    const filteredAlternatives = alternatives.filter(alternative =>
        alternative.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectAlternative = (alternative: Course) => {
        updateElectiveCourse(plannedCourse, alternative);
    };

    const renderAlternativeCourses = () => {
        if (filteredAlternatives.length === 0) {
            return <p className="text-gray-500">No alternatives match your search.</p>;
        }
    
        return (
            <ul className="max-h-80 overflow-y-auto mt-2">
                {filteredAlternatives.map((alternative, index) => (
                    <li
                        key={index}
                        onClick={() => handleSelectAlternative(alternative)}
                        className="cursor-pointer p-2 hover:bg-blue-100 transition-colors rounded-md my-1"
                    >
                        {alternative.name}
                    </li>
                ))}
            </ul>
        );
    };
    
    return (
        <div className="p-5 my-2 bg-white shadow-md rounded-lg sticky top-0">
            <h2 className="text-xl font-semibold">{course.name}</h2>
            <hr className="my-4" />
            {course.description && <p className="mb-4">{course.description}</p>}
            <p><strong>Terms Offered:</strong> {terms || 'Not available'}</p>
            <p><strong>Duration:</strong> {course.durationTerms} term(s)</p>
            <p><strong>Credits:</strong> {course.credits}</p>
            <p><strong>Honours:</strong> {course.isHonours ? 'Yes' : 'No'}</p>
            {course.preRequisiteString && <p><strong>Pre-requisites:</strong> {course.preRequisiteString}</p>}
            {plannedCourse.isElective ? (
                <>
                    <hr className="my-4" />
                    <h3 className="text-lg font-semibold">Alternative Courses</h3>
                    <input
                        type="text"
                        placeholder="Search alternatives..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded-md mb-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    {renderAlternativeCourses()}
                </>
            ): null}
        </div>
    );
}
import { json, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { getCourse } from "~/models/course.server";



export async function clientLoader({params}: {params: any}) {
    // This is just here to force client side rendering and get the planId
    return params.courseId;
};

const cardStyle = {
    padding: '20px',
    margin: '10px 0',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
};

export default function CourseInfoPanel() {
    const courseId = useLoaderData();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCoursePlan() {
            const response = await fetch(`/courseAPI/${courseId}`); 
            const data = await response.json();
            setCourse(data.course);
            setLoading(false); 
        }
        fetchCoursePlan();
    }, []);

    if(loading){
        return(
            <h1>Loading...</h1>
        )
    }



    const terms = [
        course.winterTerm1 ? 'Winter Term 1' : '',
        course.winterTerm2 ? 'Winter Term 2' : '',
        course.summerTerm1 ? 'Summer Term 1' : '',
        course.summerTerm2 ? 'Summer Term 2' : '',
    ].filter(Boolean).join(', ');

    return (
        <div style={cardStyle}>
            <h2>{course.name}</h2>
            <br></br>
            <hr></hr>
            <br></br>
            {course.description && <p>{course.description}</p>}
            <br></br>
            <hr></hr>
            <br></br>            
            <p><strong>Terms Offered:</strong> {terms || 'Not available'}</p>
            <p><strong>Duration:</strong> {course.durationTerms} term(s)</p>
            <p><strong>Credits:</strong> {course.credits}</p>
            <p><strong>Honours:</strong> {course.isHonours ? 'Yes' : 'No'}</p>
        </div>
    );
}
import { Course } from "@prisma/client";

const cardStyle = {
    padding: '20px',
    margin: '10px 0',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    position:'sticky',
    top:'0',
};

export default function CourseInfoPanel(props: { course: Course }) {
    const { course } = props;

    const terms = [
        course.winterTerm1 ? 'Winter Term 1' : '',
        course.winterTerm2 ? 'Winter Term 2' : '',
        course.summerTerm1 ? 'Summer Term 1' : '',
        course.summerTerm2 ? 'Summer Term 2' : '',
    ].filter(Boolean).join(', ');

    console.log(course);

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
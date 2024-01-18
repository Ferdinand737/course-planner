import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
 return json({});
};

export const action = async ({ params, request }: ActionFunctionArgs) => {

};


export default function CoursePlanner() {
    return(
        <div>
            <h1>Course Planner Web App</h1>
        </div>
    )
}
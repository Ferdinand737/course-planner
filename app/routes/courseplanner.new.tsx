import { ActionFunctionArgs } from "@remix-run/node";


// export const loader = async ({ params, request }: LoaderFunctionArgs) => {
//     const userId = await requireUserId(request);
//     const userCoursePlans = await getUserCoursePlans(userId);
//     return json({ userCoursePlans });
// };


export const action = async ({ params, request }: ActionFunctionArgs) => {

};

export default function NewCoursePlan(){
    return(
        <>
        <h1>New Course Plan Form here</h1>
        </>
    );
}
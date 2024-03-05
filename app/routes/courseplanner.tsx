import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { getUserCoursePlans } from "~/models/coursePlan.server";
import { requireUserId } from "~/session.server";


export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    const userCoursePlans = await getUserCoursePlans(userId);
    return json({ userCoursePlans });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {

};


export default function CoursePlanner() {
    const data = useLoaderData<typeof loader>();
    //const user = useUser();
    return(
        <div className="flex h-full min-h-screen flex-col">
            <main className="flex h-full bg-white">
            <div className="h-full w-80 border-r bg-gray-50">
                <Link to="new" className="block p-4 text-xl text-blue-500">
                + New Course Plan
                </Link>
    
                <hr />
    
                {data.userCoursePlans.length === 0 ? (
                <p className="p-4">No Course Plans yet</p>
                ) : (
                <ol>
                    {data.userCoursePlans.map((plan) => (
                    <li key={plan.id}>
                        <NavLink
                            className={({ isActive }) =>
                                `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                            }
                            to={plan.id}
                            >
                            📝 {plan.title}
                        </NavLink>
                    </li>
                    ))}
                </ol>
                )}
            </div>
    
            <div className="flex-1 p-6">
                <Outlet />
            </div>
            </main>
        </div>
    );
    
}
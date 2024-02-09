import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { useOptionalUser } from "~/utils";

export const meta: MetaFunction = () => [{ title: "Course Planner" }];

export default function Index() {
  const user = useOptionalUser();
  return (
    <main className="relative min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white shadow-xl rounded-lg p-6">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Welcome to the UBC Course Planner</h2>
        <div className="mt-8 space-y-4">
          {user ? (
            <div className="text-center">
              <p className="font-medium">You're logged in!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Link
                to="/join"
                className="w-full flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 transition duration-150 ease-in-out"
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className="w-full flex items-center justify-center rounded-md bg-green-500 px-4 py-3 text-base font-medium text-white hover:bg-green-600 transition duration-150 ease-in-out"
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

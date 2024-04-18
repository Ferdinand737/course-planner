import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  useLoaderData,
} from "@remix-run/react";

import type { User } from "~/models/user.server";

import { getUser } from "~/session.server";
import stylesheet from "~/tailwind.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({ user: await getUser(request) });
};

export default function App() {
  const { user } = useLoaderData<{ user: User }>()

  function Document({ children, title }: { children: React.ReactNode, title: string }) {
    return (
      <html lang='en'>
        <head>
          <meta charSet='utf-8' />
          <meta name='viewport' content='width=device-width,initial-scale=1' />
          <Meta />
          <Links />
          <title>{title ? title : 'Course Planner'}</title>
        </head>
        <body>
          {children}
          {process.env.NODE_ENV === 'development' ? <LiveReload /> : null}
        </body>
      </html>
    )
  }

  function Layout({ children }: { children: React.ReactNode }) {
    return (
      <>
        <nav className="bg-blue-500 p-6">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center flex-shrink-0 text-white mr-6">
              <Link to="/" className="font-semibold text-xl tracking-tight">
                Home
              </Link>
            </div>
            <div className="block lg:hidden">
            </div>
            <div className="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
              <div className="text-sm lg:flex-grow">
                <Link
                  to="/courseplanner"
                  className="block mt-4 lg:inline-block lg:mt-0 text-teal-200 hover:text-white mr-4"
                >
                  Course Planner
                </Link>
                {user && user.isAdmin? (
                  <Link
                    to="/admin"
                    className="block mt-4 lg:inline-block lg:mt-0 text-teal-200 hover:text-white mr-4"
                  >
                    Admin Panel
                  </Link>
                ) : null}
              </div> 
              <div>
                {user ? (
                  <form action="/logout" method="POST">
                    <button
                      type="submit"
                      className="inline-block text-sm px-4 py-2 leading-none border rounded text-white border-white hover:border-transparent hover:text-teal-500 hover:bg-white mt-4 lg:mt-0"
                    >
                      Logout
                    </button>
                  </form>
                ) : (
                  <Link
                    to="/login"
                    className="inline-block text-sm px-4 py-2 leading-none border rounded text-white border-white hover:border-transparent hover:text-teal-500 hover:bg-white mt-4 lg:mt-0"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
        <div className="container max-w-none px-0">{children}</div>
      </>
    );
  }

  return (
    <Document title={"Course Planner"}>
      <Layout>
        <Outlet />
      </Layout>
    </Document>
  )
}
import { Link } from "@remix-run/react";

export default function NoteIndexPage() {
  return (
    <p>
      No plan selected. Select a plan on the left, or{" "}
      <Link to="new" className="text-blue-500 underline">
        create a new course plan.
      </Link>
    </p>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { SchoolDoor } from "../components/SchoolDoor";

/** School-code signup — see components/SchoolDoor for the shared page. */
export const Route = createFileRoute("/school-signup")({
  component: () => <SchoolDoor mode="signup" />,
});

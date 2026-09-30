import { createFileRoute } from "@tanstack/react-router";
import { SchoolDoor } from "../components/SchoolDoor";

/** School-code sign-in — see components/SchoolDoor for the shared page. */
export const Route = createFileRoute("/school-login")({
  component: () => <SchoolDoor mode="login" />,
});

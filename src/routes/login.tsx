import { createFileRoute } from "@tanstack/react-router";
import { AuthDoor } from "../components/AuthDoor";

/** The student door — see components/AuthDoor for the shared sign-in page. */
export const Route = createFileRoute("/login")({
  component: () => <AuthDoor />,
});

import { createFileRoute } from "@tanstack/react-router";
import { AuthDoor } from "../components/AuthDoor";

/**
 * The Educator's Door — a dedicated sign-in entrance for teachers (gold
 * livery, console-voiced copy). Same auth backend as /login; role-aware
 * routing means a student who wanders in still lands at /app.
 */
export const Route = createFileRoute("/educator")({
  component: () => <AuthDoor educator />,
});

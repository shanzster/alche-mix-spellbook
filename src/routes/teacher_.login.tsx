import { createFileRoute } from "@tanstack/react-router";
import { TechLogin } from "../components/TechLogin";

/**
 * The Educator's Door at /teacher/login — minimalistic, role-locked to teachers.
 * (The trailing underscore de-nests it from the guarded /teacher console.)
 */
export const Route = createFileRoute("/teacher_/login")({
  component: () => <TechLogin title="Teacher sign-in" expectedRole="teacher" to="/teacher" />,
});

import { createFileRoute } from "@tanstack/react-router";
import { SchoolDoor } from "../components/SchoolDoor";

/** School-code sign-in — `?code=ABC123` from a teacher's share link autofills. */
export const Route = createFileRoute("/school-login")({
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s.code === "string" && s.code.length > 0 ? { code: s.code } : {},
  component: SchoolLoginPage,
});

function SchoolLoginPage() {
  const { code } = Route.useSearch();
  return <SchoolDoor mode="login" initialCode={code} />;
}

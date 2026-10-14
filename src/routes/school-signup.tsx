import { createFileRoute } from "@tanstack/react-router";
import { SchoolDoor } from "../components/SchoolDoor";

/** School-code signup — `?code=ABC123` from a teacher's share link autofills. */
export const Route = createFileRoute("/school-signup")({
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s.code === "string" && s.code.length > 0 ? { code: s.code } : {},
  component: SchoolSignupPage,
});

function SchoolSignupPage() {
  const { code } = Route.useSearch();
  return <SchoolDoor mode="signup" initialCode={code} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { TechLogin } from "../components/TechLogin";

/** Dedicated super-admin door at /admin/login (de-nested from the guarded /admin). */
export const Route = createFileRoute("/admin_/login")({
  component: () => <TechLogin title="Super Admin sign-in" expectedRole="admin" to="/admin" />,
});

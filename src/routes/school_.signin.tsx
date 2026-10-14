import { createFileRoute } from "@tanstack/react-router";
import { TechLogin } from "../components/TechLogin";

/**
 * Dedicated school-admin door at /school/signin (de-nested from the guarded
 * /school console). Note: NOT /school/login — that identifier collides with the
 * student class-code door at /school-login in the generated route tree.
 */
export const Route = createFileRoute("/school_/signin")({
  component: () => <TechLogin title="School Admin sign-in" expectedRole="school_admin" to="/school" />,
});

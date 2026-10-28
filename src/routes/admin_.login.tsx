import { createFileRoute } from "@tanstack/react-router";
import { AdminLogin } from "../components/AdminLogin";

/** Dedicated super-admin door at /admin/login (de-nested from the guarded /admin). */
export const Route = createFileRoute("/admin_/login")({
  component: AdminLogin,
});

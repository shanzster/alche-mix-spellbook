import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * There is no "sign in with a class code" door any more. A class code belongs
 * to REGISTRATION only (/school-signup) — once a student has an account it is
 * already connected to their school, so they sign in through the normal door
 * (/login) and are routed to their class by role. This route now just forwards
 * there, so any old links or bookmarks keep working.
 */
export const Route = createFileRoute("/school-login")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});

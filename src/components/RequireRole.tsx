import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { onAuthChange, signOut, type User } from "../lib/auth";
import { useUserProfile, type Role } from "../lib/profile";
import { TeacherVerification } from "./TeacherVerification";
import { AlcheLoader } from "./AlcheLoader";

function Loader() {
  return <AlcheLoader label="Preparing…" />;
}

function homeFor(role: Role): string {
  return role === "admin" ? "/admin"
    : role === "school_admin" ? "/school"
    : role === "teacher" ? "/teacher"
    : "/app";
}

/**
 * Gates a route by role. Redirects to /login when signed out, bounces users to
 * their own dashboard when they don't match `role`, and routes unapproved
 * teachers through the identity-verification flow.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { profile, loading } = useUserProfile();

  useEffect(() => onAuthChange((u) => { setUser(u); setAuthReady(true); }), []);

  const actualRole: Role = profile?.role ?? "student";
  const ready = authReady && (!user || !loading);

  useEffect(() => {
    if (!ready) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (actualRole !== role) navigate({ to: homeFor(actualRole) });
  }, [ready, user, actualRole, role, navigate]);

  if (!ready) return <Loader />;
  if (!user) return null;                 // redirecting to /login
  if (actualRole !== role) return null;   // redirecting to the right dashboard

  // Teachers must pass admin verification before reaching the console.
  if (role === "teacher" && profile?.status !== "approved") {
    return (
      <TeacherVerification
        uid={user.uid}
        name={profile?.displayName ?? user.displayName ?? null}
        email={profile?.email ?? user.email ?? null}
        onSignOut={async () => { await signOut(); navigate({ to: "/" }); }}
      />
    );
  }

  return <>{children}</>;
}

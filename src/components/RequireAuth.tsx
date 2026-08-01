import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { onAuthChange, type User } from "../lib/auth";

/**
 * Gates a route behind authentication. While Firebase resolves the current
 * session it shows a loader; if there's no user it redirects to /login.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthChange((u) => { setUser(u); setReady(true); }), []);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login" });
  }, [ready, user, navigate]);

  if (!ready) {
    return (
      <div className="bg-arcane min-h-screen flex flex-col items-center justify-center gap-4 text-parchment">
        <FlaskConical className="h-8 w-8 text-teal animate-spin" />
        <p className="text-xs tracking-[0.3em] uppercase">Opening the lab…</p>
      </div>
    );
  }

  if (!user) return null; // redirecting

  return <>{children}</>;
}

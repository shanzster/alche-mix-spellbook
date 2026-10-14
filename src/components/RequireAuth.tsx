import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { onAuthChange, type User } from "../lib/auth";
import { AlcheLoader } from "./AlcheLoader";

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
    return <AlcheLoader label="Opening the lab…" />;
  }

  if (!user) return null; // redirecting

  return <>{children}</>;
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Check, X, LogOut, IdCard, Camera, Inbox, ScanFace } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut } from "../lib/auth";
import { usePendingVerifications, approveTeacher, rejectTeacher, type Verification } from "../lib/admin";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireRole role="admin">
      <AdminPanel />
    </RequireRole>
  ),
});

function VerificationCard({ v }: { v: Verification }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: (uid: string) => Promise<void>) => { setBusy(true); await fn(v.uid); /* list updates via snapshot */ };

  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="mb-3">
        <h3 className="font-display text-lg">{v.name ?? "Unnamed"}</h3>
        <p className="text-xs text-parchment/60">{v.email}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <figure>
          <figcaption className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1 flex items-center gap-1"><IdCard className="h-3 w-3" /> ID</figcaption>
          <img src={v.idImage} alt="ID document" className="w-full h-32 object-contain rounded-lg bg-black/40" style={{ border: "1px solid var(--color-border)" }} />
        </figure>
        <figure>
          <figcaption className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1 flex items-center gap-1"><Camera className="h-3 w-3" /> Selfie</figcaption>
          <img src={v.selfie} alt="Selfie" className="w-full h-32 object-cover rounded-lg" style={{ border: "1px solid var(--color-border)" }} />
        </figure>
      </div>
      {/* On-device AI face-match result */}
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
        style={{
          background: `color-mix(in oklab, ${v.faceMatched ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 12%, transparent)`,
          border: `1px solid color-mix(in oklab, ${v.faceMatched ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 35%, transparent)`,
          color: v.faceMatched ? "var(--color-emerald-elixir)" : "var(--color-gold)",
        }}>
        <ScanFace className="h-3.5 w-3.5" />
        {v.faceMatched
          ? `AI face check: match${typeof v.faceMatch === "number" ? ` (${v.faceMatch}%)` : ""}`
          : "AI face check: needs manual review"}
      </div>
      <p className="text-[11px] text-parchment/50 mb-3">Confirm the faces match, then approve or reject.</p>
      <div className="flex gap-3">
        <button onClick={() => act(approveTeacher)} disabled={busy} className="btn-arcane btn-arcane-hover flex-1 justify-center text-xs disabled:opacity-50">
          <Check className="h-4 w-4" /> Approve
        </button>
        <button onClick={() => act(rejectTeacher)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs tracking-[0.12em] uppercase transition disabled:opacity-50"
          style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 40%, transparent)", background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)" }}>
          <X className="h-4 w-4" /> Reject
        </button>
      </div>
    </div>
  );
}

function AdminPanel() {
  const navigate = useNavigate();
  const { items, loading } = usePendingVerifications();

  return (
    <div className="bg-arcane min-h-screen text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-50" />

      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 h-16 border-b backdrop-blur-xl" style={{ borderColor: "var(--color-border)", background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--color-wraith) 60%, transparent))" }} />
          <span className="font-display text-lg tracking-[0.15em]">AlcheMix <span className="text-wraith">Admin</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="!h-9 !w-9" />
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="inline-flex items-center gap-1.5 text-xs text-parchment/70 hover:text-crimson transition">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8 py-8">
        <PageHeader eyebrow="Administration" title="Teacher Verifications" subtitle="Review each educator's ID against their live selfie, then approve or reject their access." icon={ShieldCheck} accent="var(--color-wraith)" />

        {loading ? (
          <p className="text-sm text-parchment/60">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl px-5 py-12 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
            <Inbox className="h-8 w-8 text-parchment/50 mx-auto mb-3" />
            <p className="font-display text-base mb-1">No pending verifications</p>
            <p className="text-sm text-parchment/60">When an educator submits their ID and selfie, it'll appear here for review.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((v) => <VerificationCard key={v.uid} v={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}

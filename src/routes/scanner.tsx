import { createFileRoute } from "@tanstack/react-router";
import { ScanLine, Camera, Box, Sparkles } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { CrystalAR } from "../components/CrystalAR";

export const Route = createFileRoute("/scanner")({
  component: () => (
    <RequireAuth>
      <Scanner />
    </RequireAuth>
  ),
});

function Step({ icon: Icon, title, body }: { icon: typeof Camera; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-parchment/10 bg-slate-sunken/40 p-4">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-elixir/15">
        <Icon className="h-4.5 w-4.5 text-emerald-elixir" />
      </div>
      <div>
        <p className="font-medium text-parchment">{title}</p>
        <p className="mt-0.5 text-sm text-parchment/60">{body}</p>
      </div>
    </div>
  );
}

function Scanner() {
  return (
    <ModuleShell
      title="AR Scanner"
      eyebrow="Augmented Reality"
      subtitle="Scan the AlcheMix element card to summon its 3D crystal in augmented reality."
      icon={ScanLine}
      accent="var(--color-emerald-elixir)"
    >
      <div className="space-y-6">
        {/* The camera / AR viewport — full width. */}
        <div className="mx-auto w-full max-w-4xl">
          <CrystalAR />
        </div>

        {/* How-to steps, below the viewport. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Step
            icon={Camera}
            title="1 · Allow the camera"
            body="Click Start scanning and grant camera access. Needs HTTPS (or localhost)."
          />
          <Step
            icon={ScanLine}
            title="2 · Aim at the card"
            body="Fill the frame with the AlcheMix element trigger image, well lit and roughly flat."
          />
          <Step
            icon={Box}
            title="3 · Watch it rise"
            body="The 3D crystal stands up out of the card and turns. Move the card and it tracks along."
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3 text-sm text-parchment/70">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
          <span>
            Tracking works best on a printed or on-screen copy of the trigger image with plenty of
            detail and even lighting. Glare and motion blur are its enemies.
          </span>
        </div>
      </div>
    </ModuleShell>
  );
}

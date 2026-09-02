import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Compass, Smartphone } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { useUserProfile } from "../lib/profile";
import { guideStatus } from "../lib/guide";
import { usePlatform } from "../lib/platform";

export const Route = createFileRoute("/guide")({
  component: () => (
    <RequireAuth>
      <GuidePage />
    </RequireAuth>
  ),
});

/**
 * The Guide — the W3Schools-style table of contents of AlcheMix, on its own
 * page. Every module in the recommended order, with live done-ticks from the
 * profile and a single highlighted "You are here" next step. Nothing is
 * locked; the guide points the way rather than barring it.
 * (Formerly lived at the top of the Grimoire — the Grimoire is now purely
 * the card collection.)
 */
function GuidePage() {
  const { profile } = useUserProfile();
  const platform = usePlatform();
  const status = guideStatus(profile);
  const mobile = platform.arCapable;
  let lastChapter = "";

  return (
    <ModuleShell
      title="The Guide"
      eyebrow="Learning Path"
      subtitle="What to learn first, in order — each chapter builds on the last."
      icon={Compass}
      accent="var(--color-emerald-elixir)"
    >
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Compass className="h-4 w-4 text-emerald-elixir" />
          <h3 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
            The Guide
          </h3>
          <span className="ml-auto font-display text-xs text-parchment/60">
            {status.doneCount}/{status.total} steps
          </span>
        </div>

        {/* Overall progress */}
        <div
          className="mb-4 h-2 overflow-hidden rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-parchment) 18%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${status.pct}%`,
              background: "linear-gradient(90deg, var(--color-emerald-elixir), var(--color-gold))",
            }}
          />
        </div>

        <p className="mb-4 px-1 text-sm text-parchment/60">
          {status.nextIndex === -1
            ? "Every step of the path is complete — you've mastered the whole Guide. Revisit any chapter freely."
            : "Follow the chapters in order — each one builds on the last. Your recommended next step is marked."}
          {mobile && " Deep-study chapters open best on the website (computer)."}
        </p>

        <ol className="space-y-1.5">
          {status.steps.map(({ step, done, detail }, i) => {
            const isNext = i === status.nextIndex;
            const chapterHeading = step.chapter !== lastChapter ? step.chapter : null;
            lastChapter = step.chapter;
            return (
              <li key={step.id}>
                {chapterHeading && (
                  <p className="mt-4 mb-1.5 px-1 text-[10px] tracking-[0.25em] uppercase text-parchment/45 first:mt-0">
                    {chapterHeading}
                  </p>
                )}
                <Link
                  to={step.to as any}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 hover:-translate-y-0.5"
                  style={{
                    background: isNext
                      ? "linear-gradient(90deg, color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 55%, transparent))"
                      : "color-mix(in oklab, var(--color-slate-sunken) 45%, transparent)",
                    border: `1px solid ${isNext ? "color-mix(in oklab, var(--color-emerald-elixir) 45%, transparent)" : done ? "color-mix(in oklab, var(--color-gold) 25%, transparent)" : "var(--color-border)"}`,
                    boxShadow: isNext ? "0 0 26px -12px var(--color-emerald-elixir)" : "none",
                    opacity: done || isNext ? 1 : 0.75,
                  }}
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-display text-xs"
                    style={
                      done
                        ? {
                            background: "color-mix(in oklab, var(--color-gold) 16%, transparent)",
                            color: "var(--color-gold)",
                            border:
                              "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)",
                          }
                        : {
                            background:
                              "color-mix(in oklab, var(--color-parchment) 10%, transparent)",
                            color: isNext
                              ? "var(--color-emerald-elixir)"
                              : "var(--color-parchment)",
                            border: "1px solid var(--color-border)",
                          }
                    }
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <step.icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{
                      color: isNext ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm text-spectral">{step.title}</span>
                      {step.mobileSide && (
                        <Smartphone
                          className="h-3 w-3 text-parchment/50"
                          aria-label="Best on your phone"
                        />
                      )}
                      {detail && (
                        <span className="text-[10px] text-parchment/50">· {detail}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-parchment/55">{step.why}</p>
                  </div>
                  {isNext && (
                    <span
                      className="flex-shrink-0 rounded-full px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase"
                      style={{
                        color: "var(--color-emerald-elixir)",
                        background:
                          "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)",
                        border:
                          "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)",
                      }}
                    >
                      You are here
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </ModuleShell>
  );
}

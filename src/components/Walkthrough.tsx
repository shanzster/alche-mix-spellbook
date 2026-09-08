import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { markWalkthroughDone, useUserProfile } from "../lib/profile";

/**
 * The first-login walkthrough.
 *
 * On a student's first visit to the Bench, a modal offers a quick tour of the
 * workshop. Accepting walks them page to page through TOUR_STEPS — each stop
 * shows a floating card with a short introduction and Back / Next controls
 * (user-paced; nothing auto-advances on a timer). Declining, finishing, or
 * closing mid-tour stamps `walkthroughDone` on the profile so the offer never
 * returns on any device. The in-progress step lives in localStorage so the
 * tour survives the page-to-page navigation.
 */

interface TourStep {
  to: string;
  title: string;
  body: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    to: "/app",
    title: "The Apprentice's Bench",
    body: "Home base. Every module lives here, grouped by chapter — and the teal card at the top always knows your next step.",
  },
  {
    to: "/guide",
    title: "The Guide",
    body: "A recommended order through the chapters. It suggests where to go next, but nothing here is ever locked.",
  },
  {
    to: "/cards",
    title: "The Grimoire",
    body: "Your card collection. Scan the physical AR cards to claim them, mix cards to forge compounds, and print what you forge.",
  },
  {
    to: "/periodic-table",
    title: "The Periodic Table",
    body: "All 118 elements under four lenses — families, states, trends, and discovery. Click any element for its story.",
  },
  {
    to: "/study",
    title: "The Study",
    body: "Guided lessons: learn, practise, assess. Concepts return for review right before you'd forget them.",
  },
  {
    to: "/app",
    title: "Find your way",
    body: "That's the tour. The rail on the left holds every chapter (⌘K opens the full contents), and the Arcade is there when you've earned a break.",
  },
];

const STEP_KEY = "alchemix.walkthrough.step";

/**
 * TEMP — owner preview mode: offer the walkthrough on every visit to the
 * Bench, ignoring the `walkthroughDone` stamp. Set to false to restore the
 * real first-login-only behaviour before students use this.
 */
const PREVIEW_ALWAYS_OFFER = true;

function readStoredStep(): number | null {
  const raw = localStorage.getItem(STEP_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < TOUR_STEPS.length ? n : null;
}

export function Walkthrough() {
  const { uid, profile, loading } = useUserProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // null = no tour running. Read from storage in an effect (SSR-safe).
  const [step, setStep] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStep(readStoredStep());
  }, []);

  const endTour = () => {
    localStorage.removeItem(STEP_KEY);
    setStep(null);
    setDismissed(true);
    markWalkthroughDone(uid);
  };

  const goTo = (n: number) => {
    if (n < 0) return;
    if (n >= TOUR_STEPS.length) {
      endTour();
      return;
    }
    localStorage.setItem(STEP_KEY, String(n));
    setStep(n);
    if (TOUR_STEPS[n].to !== pathname) navigate({ to: TOUR_STEPS[n].to as any });
  };

  // ── The tour card — floats above the page chrome while touring ──
  if (step !== null) {
    const s = TOUR_STEPS[step];
    const last = step === TOUR_STEPS.length - 1;
    return (
      <div
        key={step}
        className="glass-strong sheet-up fixed bottom-24 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl p-4 md:bottom-20"
        role="dialog"
        aria-label={`Walkthrough — ${s.title}`}
      >
        <div className="flex items-start gap-3">
          <span className="orb-rune orb-rune-active h-10 w-10 flex-shrink-0 text-emerald-elixir">
            <Compass className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-ui text-sm font-semibold text-spectral">{s.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-parchment">{s.body}</p>
          </div>
          <button
            onClick={endTour}
            aria-label="End the walkthrough"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-parchment/60 transition-colors hover:bg-teal/10 hover:text-spectral"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "1.1rem" : "0.35rem",
                background:
                  i <= step
                    ? "var(--color-emerald-elixir)"
                    : "color-mix(in oklab, var(--color-parchment) 30%, transparent)",
              }}
            />
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            {step > 0 && (
              <button
                onClick={() => goTo(step - 1)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-parchment transition-colors hover:bg-teal/10 hover:text-spectral"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            <button
              onClick={() => goTo(step + 1)}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-105"
              style={{
                background: "var(--color-primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {last ? "Finish" : "Next"}
              {!last && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </span>
        </div>
      </div>
    );
  }

  // ── The invitation — first arrival at the Bench only ──
  const shouldOffer =
    !loading &&
    !!uid &&
    !!profile &&
    (PREVIEW_ALWAYS_OFFER || !profile.walkthroughDone) &&
    profile.role !== "teacher" &&
    pathname === "/app" &&
    !dismissed;
  if (!shouldOffer) return null;

  const decline = () => {
    setDismissed(true);
    markWalkthroughDone(uid);
  };
  const accept = () => {
    markWalkthroughDone(uid);
    goTo(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={decline} aria-hidden />
      <div
        className="glass-strong sheet-up relative z-10 w-full max-w-sm rounded-2xl p-6 text-center"
        role="dialog"
        aria-label="Walkthrough offer"
      >
        <span className="orb-rune orb-rune-active mx-auto flex h-14 w-14 text-emerald-elixir">
          <Compass className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-ui text-lg font-semibold text-spectral">
          First time at the bench?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-parchment">
          I can show you around the workshop — {TOUR_STEPS.length} quick stops, at your own pace.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={accept} className="btn-arcane btn-arcane-hover w-full">
            Show me around
          </button>
          <button
            onClick={decline}
            className="rounded-lg px-4 py-2 text-sm font-medium text-parchment transition-colors hover:bg-teal/10 hover:text-spectral"
          >
            I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}

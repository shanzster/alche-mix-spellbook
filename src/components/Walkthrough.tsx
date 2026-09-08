import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, X } from "lucide-react";
import { markWalkthroughDone, useUserProfile } from "../lib/profile";

/**
 * The first-login walkthrough.
 *
 * On a student's first visit to the Bench, a modal offers a quick tour of the
 * workshop. Accepting walks them page to page through TOUR_STEPS — each stop
 * spotlights a real element on screen (the page dims around it and a bobbing
 * arrow points at it from the guide card) with Back / Next controls
 * (user-paced; nothing auto-advances on a timer). Declining, finishing, or
 * closing mid-tour stamps `walkthroughDone` on the profile so the offer never
 * returns on any device. The in-progress step lives in localStorage so the
 * tour survives the page-to-page navigation.
 *
 * Anchors are `data-tour="…"` attributes on the UI (rail, tabs, continue
 * card, page headers). A step lists selectors in preference order — the first
 * visible match wins — and a step with no live anchor falls back to a plain
 * floating card, so mobile/desktop differences degrade gracefully.
 */

interface TourStep {
  to: string;
  title: string;
  body: string;
  /** data-tour selectors, first visible match wins. Omit for a free card. */
  anchors?: string[];
}

const PAGE_HEADER = ['[data-tour="page-header"]'];

/** Every module of the book, in reading order — the full tour. */
const TOUR_STEPS: TourStep[] = [
  {
    to: "/app",
    title: "Your next step",
    body: "This card always knows where your path leads next — one click and you're back to learning.",
    anchors: ['[data-tour="continue"]'],
  },
  {
    to: "/app",
    title: "The chapters",
    body: "Every chapter of the book lives here — open one to see its pages and jump anywhere. Nothing is ever locked.",
    anchors: ['[data-tour="rail"]', '[data-tour="tabs"]'],
  },
  {
    to: "/cards",
    title: "The Grimoire",
    body: "Your card collection. Scan the physical AR cards to claim them, mix cards to forge compounds, and print what you forge.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/guide",
    title: "The Guide",
    body: "A recommended order through the chapters, so you always know what to study next.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/starters",
    title: "Starters for Ten",
    body: "The daily ritual — ten quick questions that feed your review schedule and keep your streak alight.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/assignments",
    title: "Assignments",
    body: "Quizzes and missions your teacher sets for the class land here.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/lab-safety",
    title: "Lab Safety",
    body: "Hazard symbols and apparatus come before any experiment — plus scenarios where failing is the safest way to learn.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/atomic-builder",
    title: "Atomic Builder",
    body: "Build atoms shell by shell — protons, neutrons, electrons — with missions and a 15-challenge trial.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/periodic-table",
    title: "The Periodic Table",
    body: "All 118 elements under four lenses — families, states, trends, and discovery. Click any element for its story.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/states",
    title: "States of Matter",
    body: "Watch particles dance through solid, liquid and gas — and read a real heating curve.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/study",
    title: "The Study",
    body: "Guided lessons: learn, practise, assess. Concepts return for review right before you'd forget them.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/molecules",
    title: "Molecule Shapes",
    body: "Turn real molecules in 3D and see why their shapes are what they are (VSEPR).",
    anchors: PAGE_HEADER,
  },
  {
    to: "/forces",
    title: "Invisible Bonds",
    body: "The forces between molecules — and a boiling-point race that makes them visible.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/reactions",
    title: "Reaction Theatre",
    body: "Eight reactions on stage, with a ledger proving mass is always conserved.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/equation-balancer",
    title: "Equation Balancer",
    body: "Balance 24 real equations across three difficulties — or race the clock in Time Attack.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/codex",
    title: "Compound Codex",
    body: "An encyclopedia that fills in as you discover — mix elements and see what compounds are truly possible.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/gas-laws",
    title: "Gas Laws",
    body: "Squeeze, heat and pump a gas — PV = nRT, live — then prove it in a five-problem trial.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/solutions",
    title: "The Elixir Bench",
    body: "Dissolve, dilute and hit target molarities — with real solubility limits.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/thermo",
    title: "Cauldron of Heat",
    body: "Coffee-cup calorimetry with real ΔH data — measure the heat of a reaction with q = mcΔT.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/rates",
    title: "Reaction Rates",
    body: "Collision theory as a sim — turn up temperature, concentration, surface area or add a catalyst.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/equilibrium",
    title: "Equilibrium",
    body: "Stress a live N₂O₄ ⇌ NO₂ system and watch Le Chatelier push back.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/electro",
    title: "The Voltaic Forge",
    body: "Build galvanic cells from real electrode potentials and watch the electrons flow.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/titration",
    title: "Titration Lab",
    body: "Drip, swirl, and catch the endpoint — strong and weak acids, three indicators, unknown assays.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/decay",
    title: "Radioactive Decay",
    body: "Six real isotopes and a half-life slider — watch nuclei give up their energy.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/quiz",
    title: "3D Visual Quiz",
    body: "Prove your craft against questions built from the 3D models themselves.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/duel",
    title: "Duel the Alchemist",
    body: "The Arcade begins — card battles against the Alchemist, with stats drawn from real chemistry.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/duels",
    title: "Class Duels",
    body: "Challenge your classmates to asynchronous duels — your best cards against theirs.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/table-game",
    title: "Placement Trials",
    body: "Race to place elements on the table — names, symbols, then riddles.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/leaderboard",
    title: "Hall of Records",
    body: "Class standings — stars, duels, compounds and streaks.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/shop",
    title: "The Emporium",
    body: "Spend the aurum you earn on card frames, titles and charms.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/scanner",
    title: "AR Scanner",
    body: "Point your phone at the physical cards to bring them to life — and mix two to forge a compound. Lives on mobile.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/scavenger",
    title: "AI Scavenger Hunt",
    body: "Hunt real objects with your camera and let the AI judge your finds — evidence goes to your teacher.",
    anchors: PAGE_HEADER,
  },
  {
    to: "/app",
    title: "Find your way",
    body: "That's the whole workshop. Press ⌘K anywhere for the full table of contents — and welcome to the bench, apprentice.",
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

/**
 * Finds the step's anchor element (retrying while the page renders in),
 * scrolls it into view, and tracks its viewport rect through scroll/resize.
 */
function useTourAnchor(step: number, pathname: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const elRef = useRef<Element | null>(null);

  useEffect(() => {
    setRect(null);
    elRef.current = null;
    const selectors = TOUR_STEPS[step]?.anchors;
    if (!selectors?.length) return;

    let tries = 0;
    const measure = () => {
      const el = elRef.current;
      if (el) setRect(el.getBoundingClientRect());
    };
    // The target may render a beat after navigation (profile loads, lazy
    // content) — poll briefly until a visible match appears.
    const find = () => {
      for (const sel of selectors) {
        const cand = document.querySelector(sel);
        if (!cand) continue;
        const r = cand.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          elRef.current = cand;
          if (getComputedStyle(cand).position !== "fixed") {
            cand.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          measure();
          return true;
        }
      }
      return false;
    };
    const poll = window.setInterval(() => {
      if (find() || ++tries > 16) window.clearInterval(poll);
    }, 150);
    find();

    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step, pathname]);

  return rect;
}

type Placement = "below" | "above" | "right" | "free";

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

  const anchorRect = useTourAnchor(step ?? -1, pathname);

  // Dock the card beside the spotlight (below → above → right → free).
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: Placement } | null>(null);
  useLayoutEffect(() => {
    if (step === null) return;
    const card = cardRef.current;
    if (!card) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    if (!anchorRect) {
      setPos({ top: vh - ch - 96, left: (vw - cw) / 2, placement: "free" });
      return;
    }
    const centred = Math.max(12, Math.min(anchorRect.left + anchorRect.width / 2 - cw / 2, vw - cw - 12));
    if (anchorRect.left < 90 && anchorRect.height > anchorRect.width) {
      // The chapter rail — dock to its right.
      setPos({
        top: Math.max(12, Math.min(anchorRect.top + anchorRect.height / 2 - ch / 2, vh - ch - 12)),
        left: Math.min(anchorRect.right + 28, vw - cw - 12),
        placement: "right",
      });
    } else if (anchorRect.bottom + ch + 40 < vh) {
      setPos({ top: anchorRect.bottom + 28, left: centred, placement: "below" });
    } else if (anchorRect.top - ch - 40 > 0) {
      setPos({ top: anchorRect.top - ch - 28, left: centred, placement: "above" });
    } else {
      setPos({ top: vh - ch - 96, left: (vw - cw) / 2, placement: "free" });
    }
  }, [step, anchorRect]);

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

  // ── The tour — spotlight + docked guide card ──
  if (step !== null) {
    const s = TOUR_STEPS[step];
    const last = step === TOUR_STEPS.length - 1;
    const pad = 8;
    const placement = pos?.placement ?? "free";
    return (
      <>
        {/* Spotlight — a glowing cut-out over the anchored element; the giant
            shadow dims everything else. Morphs smoothly between steps. */}
        {anchorRect && (
          <div
            aria-hidden
            className="pointer-events-none fixed z-40 rounded-2xl"
            style={{
              left: anchorRect.left - pad,
              top: anchorRect.top - pad,
              width: anchorRect.width + pad * 2,
              height: anchorRect.height + pad * 2,
              boxShadow:
                "0 0 0 9999px rgba(5, 9, 20, 0.62), " +
                "0 0 0 2px color-mix(in oklab, var(--color-emerald-elixir) 70%, transparent), " +
                "0 0 28px 2px color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)",
              transition: "left 0.35s ease, top 0.35s ease, width 0.35s ease, height 0.35s ease",
            }}
          />
        )}

        <div
          key={step}
          ref={cardRef}
          className="glass-strong sheet-up fixed z-50 w-[min(92vw,24rem)] rounded-2xl p-4"
          style={pos ? { top: pos.top, left: pos.left } : { bottom: 96, left: "50%", transform: "translateX(-50%)" }}
          role="dialog"
          aria-label={`Walkthrough — ${s.title}`}
        >
          {/* The arrow — bobs toward the highlighted element */}
          {anchorRect && placement === "below" && (
            <span className="tour-bob-up absolute -top-9 left-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-elixir text-white shadow-lg">
              <ArrowUp className="h-4 w-4" />
            </span>
          )}
          {anchorRect && placement === "above" && (
            <span className="tour-bob-down absolute -bottom-9 left-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-elixir text-white shadow-lg">
              <ArrowDown className="h-4 w-4" />
            </span>
          )}
          {anchorRect && placement === "right" && (
            <span className="tour-bob-left absolute -left-9 top-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-elixir text-white shadow-lg">
              <ArrowLeft className="h-4 w-4" />
            </span>
          )}

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
          <div className="mt-3 flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="h-1 flex-1 overflow-hidden rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--color-parchment) 25%, transparent)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
                    background: "var(--color-emerald-elixir)",
                  }}
                />
              </div>
              <span className="flex-shrink-0 text-[10px] tabular-nums text-parchment/60">
                {step + 1}/{TOUR_STEPS.length}
              </span>
            </div>
            <span className="flex flex-shrink-0 items-center gap-1.5">
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
      </>
    );
  }

  // ── The invitation — first arrival at the Bench only ──
  // Preview mode only needs a signed-in user — the profile read may fail
  // while Firestore rules are undeployed, and the offer should still show.
  const shouldOffer =
    !loading &&
    !!uid &&
    (PREVIEW_ALWAYS_OFFER
      ? true
      : !!profile && !profile.walkthroughDone && profile.role !== "teacher") &&
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
          I can walk you through the whole workshop — a quick stop at every module, at your own
          pace. Leave any time with the ✕.
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

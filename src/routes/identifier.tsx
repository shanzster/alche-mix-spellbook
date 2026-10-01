import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Eye,
  Fingerprint,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  ScrollText,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { MobileHandoff } from "../components/MobileHandoff";
import { RequireAuth } from "../components/RequireAuth";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";
import {
  elementByNumber,
  PERIODIC_ELEMENTS,
  type TableElement,
} from "../lib/periodic-table-data";
import { ELEMENT_LORE } from "../lib/element-lore";
import { useAI } from "../lib/useAI";
import { downscaleImage } from "../lib/scavenger";
import {
  detectImageItems,
  startItemScanner,
  type ItemDetection,
} from "../lib/element-vision";
import type { IdentifiedItem } from "../lib/ai";
import { usePlatform } from "../lib/platform";

export const Route = createFileRoute("/identifier")({
  component: () => (
    <RequireAuth>
      <Identifier />
    </RequireAuth>
  ),
});

/**
 * Element Identifier — two instruments on one bench.
 *
 * THE LENS (default): point the camera at anything. Every item in the frame
 * is identified and broken down into the chemical elements it really contains
 * (a mouse → copper wiring, silicon chips, carbon plastics…). Gemini is the
 * source of truth for accuracy; keyless, the on-device COCO-SSD eye + a
 * curated composition map give an honest offline estimate.
 *
 * THE TRIAL: the original deduction game — five mystery elements described
 * through five progressively sharper clues, fully deterministic, no AI.
 */

const ACCENT = "var(--color-emerald-elixir)";

type Mode = "lens" | "trial";

function Identifier() {
  const [mode, setMode] = useState<Mode>("lens");
  const ai = useAI();
  // The lens is a capture-companion experience — phone / installed PWA only.
  // On the website side the whole module hands off to the phone, like /scanner.
  const platform = usePlatform();

  return (
    <ModuleShell
      title="Element Identifier"
      eyebrow={mode === "lens" ? "The Assayer's Lens" : "The Assayer's Trial"}
      icon={Fingerprint}
      subtitle={
        !platform.arCapable
          ? "The lens lives on your phone — the deep study lives here on the website."
          : mode === "lens"
            ? "Point the lens at anything. Every item in the frame is read for the chemical elements it truly contains."
            : "Five mystery elements, five clues each — real data only. Name each one in as few clues as you can."
      }
      right={
        platform.arCapable && mode === "lens" ? (
          ai.configured === false ? (
            <span
              className="text-[10px] tracking-[0.15em] uppercase rounded-full px-3 py-1.5 whitespace-nowrap"
              style={{
                color: "var(--color-gold)",
                background: "color-mix(in oklab, var(--color-gold) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
              }}
            >
              Offline estimate
            </span>
          ) : ai.configured ? (
            <span
              className="text-[10px] tracking-[0.15em] uppercase rounded-full px-3 py-1.5 whitespace-nowrap inline-flex items-center gap-1.5"
              style={{
                color: ACCENT,
                background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
              }}
            >
              <Sparkles className="h-3 w-3" /> AI-verified
            </span>
          ) : undefined
        ) : undefined
      }
    >
      {/* Wait for platform detection so SSR/first paint never flashes the wrong side. */}
      {!platform.ready ? null : !platform.arCapable ? (
        <MobileHandoff
          path="/identifier"
          title="The Assayer's Lens needs a camera in your hand"
          body="You're on the website — the in-depth side of AlcheMix. The Element Identifier unlocks on a phone or the installed app: open this page there, sweep the lens over everyday things, and every item in the frame is read for the chemical elements it truly contains."
          steps={[
            "Scan the QR code with your phone (or open the same address).",
            "Sign in with the same account.",
            "Point the lens at anything — a mouse, a spoon, your lunch — and assay the frame.",
          ]}
        />
      ) : (
        <>
          {/* Mode switch — the two instruments */}
          <div
            className="mb-6 inline-flex rounded-full p-1"
            style={{
              background: "color-mix(in oklab, var(--color-mist) 60%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            {(
              [
                { key: "lens", label: "Live Lens", icon: ScanSearch },
                { key: "trial", label: "Deduction Trial", icon: ScrollText },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-ui text-xs font-semibold transition"
                style={
                  mode === key
                    ? {
                        background: `color-mix(in oklab, ${ACCENT} 18%, transparent)`,
                        color: ACCENT,
                      }
                    : { color: "var(--color-parchment)" }
                }
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === "lens" ? <LiveLens ai={ai} /> : <AssayTrial />}
        </>
      )}
    </ModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  THE LENS — camera → every item → its elements
// ════════════════════════════════════════════════════════════════════════════

const elementName = (symbol: string): string =>
  PERIODIC_ELEMENTS.find((e) => e.symbol === symbol)?.name ?? symbol;

/** Offline estimate: turn on-device detections into result items. */
const itemsFromDetections = (dets: ItemDetection[]): IdentifiedItem[] =>
  dets
    .filter((d) => d.elements.length > 0)
    .slice(0, 6)
    .map((d) => ({
      item: d.label,
      confidence: d.score,
      elements: d.elements.map((symbol) => ({
        symbol,
        name: elementName(symbol),
        note: "",
      })),
    }));

interface AssayResult {
  items: IdentifiedItem[];
  summary: string;
  source: "gemini" | "fallback";
}

function LiveLens({ ai }: { ai: ReturnType<typeof useAI> }) {
  const { uid } = useUserProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveItemsRef = useRef<ItemDetection[]>([]);

  const [camState, setCamState] = useState<"idle" | "live" | "denied">("idle");
  const [eye, setEye] = useState<"loading" | "live" | "off">("loading");
  const [liveCount, setLiveCount] = useState(0);
  const [shot, setShot] = useState<{ dataUrl: string; base64: string } | null>(null);
  const [assaying, setAssaying] = useState(false);
  const [result, setResult] = useState<AssayResult | null>(null);
  const loggedRef = useRef(false);

  // The live eye: box every recognised object with the elements it contains.
  useEffect(() => {
    if (camState !== "live" || !videoRef.current || !overlayRef.current) return;
    setEye("loading");
    const scanner = startItemScanner({
      video: videoRef.current,
      canvas: overlayRef.current,
      onReady: () => setEye("live"),
      onError: () => setEye("off"),
      onUpdate: (items) => {
        liveItemsRef.current = items;
        setLiveCount(items.length);
      },
    });
    return scanner.stop;
  }, [camState]);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCam = async () => {
    setResult(null);
    setShot(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("no camera API (needs HTTPS or localhost)");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCamState("live");
    } catch (err) {
      console.warn("[Identifier] camera unavailable:", err);
      setCamState("denied");
    }
  };

  // Attach the stream AFTER the <video> exists (same race as the scavenger).
  useEffect(() => {
    if (camState !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [camState]);

  useEffect(() => stopCam, []);

  /** Run one assay over items + a frame: AI first, on-device estimate second. */
  const assay = async (base64: string, offlineItems: ItemDetection[]) => {
    setAssaying(true);
    setResult(null);
    let out: AssayResult;
    try {
      const r = await ai.identifyItems({ imageBase64: base64 });
      out =
        r.source === "gemini" && r.items.length > 0
          ? { items: r.items.slice(0, 6), summary: r.summary, source: "gemini" }
          : { items: itemsFromDetections(offlineItems), summary: "", source: "fallback" };
    } catch {
      out = { items: itemsFromDetections(offlineItems), summary: "", source: "fallback" };
    }
    setResult(out);
    setAssaying(false);
    if (uid && !loggedRef.current && out.items.length > 0) {
      loggedRef.current = true;
      void logPractice(uid, "identifier");
    }
  };

  /** Freeze the live frame and assay it. */
  const captureAndAssay = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.9);
    const offline = liveItemsRef.current;
    stopCam();
    setCamState("idle");
    const small = await downscaleImage(raw);
    setShot(small);
    await assay(small.base64, offline);
  };

  /** Uploaded photo: downscale, detect on-device for the fallback, assay. */
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const small = await downscaleImage(file);
    setShot(small);
    setCamState("idle");
    stopCam();
    let offline: ItemDetection[] = [];
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = small.dataUrl;
      });
      offline = await detectImageItems(img);
    } catch {
      /* AI path may still succeed */
    }
    await assay(small.base64, offline);
  };

  const reset = () => {
    setShot(null);
    setResult(null);
    setCamState("idle");
  };

  return (
    <section>
      {/* Camera / photo stage */}
      <div
        className="relative mb-4 overflow-hidden rounded-2xl"
        style={{
          border: "1px solid var(--color-border)",
          background: "#0b1220",
          aspectRatio: "4/3",
          maxWidth: "42rem",
        }}
      >
        {shot ? (
          <img src={shot.dataUrl} alt="Your frame" className="h-full w-full object-cover" />
        ) : camState === "live" ? (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas
              ref={overlayRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            <div
              className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[92%] -translate-x-1/2 truncate rounded-2xl px-3 py-1.5 text-center text-xs backdrop-blur"
              style={{
                background: "rgba(11,18,32,0.78)",
                color: liveCount > 0 ? "#2dd4bf" : "var(--color-parchment)",
                border: `1px solid ${liveCount > 0 ? "rgba(45,212,191,0.5)" : "rgba(232,220,192,0.2)"}`,
              }}
            >
              {eye === "loading"
                ? "Summoning the Assayer's lens…"
                : liveCount > 0
                  ? `${liveCount} item${liveCount === 1 ? "" : "s"} in view — assay the frame!`
                  : "Sweep the lens over everyday things…"}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-parchment/60">
            <ScanSearch className="h-9 w-9" style={{ color: ACCENT }} />
            {camState === "denied" ? (
              <p className="text-sm">
                Camera unavailable — allow camera permission and use HTTPS (or localhost). You can
                still upload a photo instead.
              </p>
            ) : (
              <p className="text-sm">
                Open the lens and point it at anything — a mouse, a spoon, your lunch. Every item
                is read for its elements.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {camState === "live" ? (
          <button
            onClick={captureAndAssay}
            className="btn-arcane btn-arcane-hover text-sm"
            style={liveCount > 0 ? { boxShadow: "0 0 24px -6px #2dd4bf" } : undefined}
          >
            <Camera className="h-4 w-4" /> Assay the frame
          </button>
        ) : (
          <>
            <button onClick={startCam} className="btn-arcane btn-arcane-hover text-sm">
              <Camera className="h-4 w-4" /> Open the lens
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost-arcane text-sm">
              <Upload className="h-4 w-4" /> Upload a photo
            </button>
            {(shot || result) && (
              <button onClick={reset} className="btn-ghost-arcane text-sm">
                <RotateCcw className="h-4 w-4" /> Clear
              </button>
            )}
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
      </div>

      {/* Reading */}
      {assaying && (
        <div className="mt-6 flex items-center gap-3 text-sm text-parchment/70">
          <Loader2 className="h-4 w-4 animate-spin text-teal" />
          The Alchemist studies the frame…
        </div>
      )}

      {result && !assaying && (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
            <h2 className="font-ui text-sm font-medium uppercase tracking-[0.2em] text-parchment/70">
              The reading
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em]"
              style={
                result.source === "gemini"
                  ? {
                      color: ACCENT,
                      background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
                    }
                  : {
                      color: "var(--color-gold)",
                      background: "color-mix(in oklab, var(--color-gold) 12%, transparent)",
                      border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
                    }
              }
            >
              {result.source === "gemini" ? "AI-verified" : "Offline estimate"}
            </span>
          </div>

          {result.items.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-sm text-parchment/70"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
                border: "1px solid var(--color-border)",
              }}
            >
              The lens found nothing it could name in that frame. Move closer, add light, and try
              a clear everyday object — cutlery, a phone, a plant, a snack.
            </div>
          ) : (
            <>
              {result.summary && (
                <p className="mb-4 max-w-2xl px-1 font-serif text-sm text-parchment">
                  {result.summary}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {result.items.map((it, idx) => (
                  <div
                    key={`${it.item}-${idx}`}
                    className="rounded-2xl p-5"
                    style={{
                      background:
                        "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)",
                      border: `1px solid color-mix(in oklab, ${ACCENT} 25%, transparent)`,
                    }}
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h3 className="text-base capitalize">{it.item}</h3>
                      <span className="flex-shrink-0 text-[10px] text-parchment/50">
                        {Math.round(Math.min(1, Math.max(0, it.confidence)) * 100)}% sure
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {it.elements.map((el) => (
                        <li key={el.symbol} className="flex items-start gap-2.5">
                          <Link
                            to="/periodic-table"
                            search={{ element: el.symbol }}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-ui text-xs font-bold transition-transform hover:scale-110"
                            style={{
                              color: ACCENT,
                              background: `color-mix(in oklab, ${ACCENT} 14%, transparent)`,
                              border: `1px solid color-mix(in oklab, ${ACCENT} 38%, transparent)`,
                            }}
                            title={`${el.name} in the periodic table`}
                          >
                            {el.symbol}
                          </Link>
                          <div className="min-w-0">
                            <div className="font-ui text-sm font-medium">{el.name}</div>
                            {el.note && (
                              <div className="text-[11px] leading-snug text-parchment/60">
                                {el.note}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 px-1 text-[11px] text-parchment/50">
                {result.source === "gemini"
                  ? "Read by the Alchemist's eye from your photo — tap any symbol to study that element."
                  : "Estimated on-device from what the lens recognised — connect the AI key for a true per-item reading."}
              </p>
            </>
          )}
        </section>
      )}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  THE TRIAL — the original five-round deduction game (deterministic, no AI)
// ════════════════════════════════════════════════════════════════════════════

// Well-known elements a middle/high-schooler can reasonably deduce.
const POOL_NUMBERS = [
  1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24,
  26, 28, 29, 30, 35, 47, 50, 53, 74, 78, 79, 80, 82, 92,
];

const ROUNDS = 5;
const CLUES_PER_ROUND = 5;
/** Points for a correct call = 6 − clues seen, so 5 down to 1. */
const MAX_SCORE = ROUNDS * CLUES_PER_ROUND;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lanthanides/actinides sit on pulled-out rows 9/10 but belong to periods 6/7. */
const periodOf = (el: TableElement) => (el.ypos === 9 ? 6 : el.ypos === 10 ? 7 : el.ypos);

const ROOM_K = 298;
function stateAtRoomTemp(el: TableElement): string | null {
  if (el.meltK === undefined) return null;
  if (el.meltK > ROOM_K) return "solid";
  if (el.boilK !== undefined && el.boilK < ROOM_K) return "gas";
  return "liquid";
}

/** Strip the element's own name out of lore text so a clue can't say it outright. */
function conceal(text: string, el: TableElement): string {
  return text.replace(new RegExp(el.name, "gi"), "this element");
}

function buildClues(el: TableElement): string[] {
  const clues: string[] = [];

  clues.push(
    `It is classified as a ${el.category.toLowerCase()}, and it sits in period ${periodOf(el)} of the table.`,
  );

  const state = stateAtRoomTemp(el);
  const discovery = el.ancient
    ? "Humans have known it since antiquity."
    : el.discoveryYear
      ? `It was discovered in ${el.discoveryYear}.`
      : "";
  clues.push(
    [state ? `At room temperature it is a ${state}.` : "", discovery]
      .filter(Boolean)
      .join(" ") || `Its electrons fill ${el.shells.split(",").length} shells.`,
  );

  const props: string[] = [];
  if (el.meltK !== undefined) props.push(`it melts at about ${Math.round(el.meltK - 273.15)} °C`);
  if (el.electronegativity !== undefined)
    props.push(`its electronegativity is ${el.electronegativity} on the Pauling scale`);
  clues.push(
    props.length > 0
      ? `Measured in the lab: ${props.join(", and ")}.`
      : `It belongs to group ${el.xpos} of the table.`,
  );

  const lore = ELEMENT_LORE[el.symbol];
  clues.push(
    lore
      ? `The origin of its name: ${conceal(lore.etymology, el)}`
      : `It belongs to group ${el.xpos}, with electrons arranged ${el.shells}.`,
  );

  clues.push(
    `It has ${el.number} protons and an atomic mass of ${el.mass}. Its electrons fill shells as ${el.shells}.`,
  );

  return clues.slice(0, CLUES_PER_ROUND);
}

const matches = (guess: string, el: TableElement) => {
  const g = guess.trim().toLowerCase();
  return g.length > 0 && (g === el.name.toLowerCase() || g === el.symbol.toLowerCase());
};

const identifierStars = (score: number) =>
  score >= 20 ? 3 : score >= 14 ? 2 : score >= 8 ? 1 : 0;

function StarRow({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className="h-4 w-4"
          style={{
            color: i < n ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 35%, transparent)",
            fill: i < n ? "var(--color-gold)" : "transparent",
          }}
        />
      ))}
    </span>
  );
}

interface RoundState {
  el: TableElement;
  clues: string[];
  revealed: number;
  /** null = still guessing; true = named it; false = round lost. */
  solved: boolean | null;
  pointsEarned: number;
}

function AssayTrial() {
  const { uid, profile } = useUserProfile();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [elements, setElements] = useState<TableElement[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<RoundState | null>(null);
  const [guess, setGuess] = useState("");
  const [wrongGuess, setWrongGuess] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [saved, setSaved] = useState(false);

  const startRound = (els: TableElement[], idx: number) => {
    const el = els[idx];
    setRound({ el, clues: buildClues(el), revealed: 1, solved: null, pointsEarned: 0 });
    setGuess("");
    setWrongGuess(null);
  };

  const start = () => {
    const els = shuffle(
      POOL_NUMBERS.map(elementByNumber).filter((e): e is TableElement => e !== undefined),
    ).slice(0, ROUNDS);
    setElements(els);
    setRoundIdx(0);
    setScore(0);
    setSaved(false);
    startRound(els, 0);
    setPhase("play");
  };

  const revealNext = () => {
    if (!round || round.solved !== null) return;
    setWrongGuess(null);
    if (round.revealed < round.clues.length) {
      setRound({ ...round, revealed: round.revealed + 1 });
    }
  };

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!round || round.solved !== null || guess.trim().length === 0) return;
    if (matches(guess, round.el)) {
      const pts = CLUES_PER_ROUND + 1 - round.revealed;
      setScore((s) => s + pts);
      setRound({ ...round, solved: true, pointsEarned: pts });
      setWrongGuess(null);
    } else if (round.revealed < round.clues.length) {
      // A wrong call costs a clue — the assay narrows either way.
      setWrongGuess(guess.trim());
      setRound({ ...round, revealed: round.revealed + 1 });
      setGuess("");
    } else {
      // All clues spent and still wrong — the element reveals itself.
      setWrongGuess(guess.trim());
      setRound({ ...round, solved: false, pointsEarned: 0 });
    }
  };

  const giveUp = () => {
    if (!round || round.solved !== null) return;
    setRound({ ...round, revealed: round.clues.length, solved: false, pointsEarned: 0 });
  };

  const nextRound = async () => {
    if (roundIdx + 1 >= ROUNDS) {
      setPhase("done");
      if (uid && !saved) {
        setSaved(true);
        logPractice(uid, "identifier");
        recordTrial(uid, "identifier", {
          score,
          outOf: MAX_SCORE,
          stars: identifierStars(score),
        });
      }
    } else {
      setRoundIdx((i) => i + 1);
      startRound(elements, roundIdx + 1);
    }
  };

  const lore = round ? ELEMENT_LORE[round.el.symbol] : undefined;

  return (
    <>
      {phase === "intro" && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <Fingerprint className="h-12 w-12 text-teal mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Can you name the unknown?</h2>
          <p className="text-parchment text-sm max-w-md mx-auto mb-6">
            An assayer identifies a substance from its properties alone. Each mystery element offers
            up to {CLUES_PER_ROUND} clues — family, state, measured values, the story of its name,
            and finally its proton count. The fewer clues you need, the more points you earn. Answer
            with the element's name or its symbol.
          </p>
          <button onClick={start} className="btn-arcane btn-arcane-hover">
            <Timer className="h-4 w-4" /> Begin the assay
          </button>
          {profile?.trials?.identifier && (
            <div
              className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-sm"
              style={{
                background: "color-mix(in oklab, var(--color-gold) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
              }}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">Best run</span>
              <span className="font-ui font-medium text-gold">
                {profile.trials.identifier.best}/{profile.trials.identifier.outOf}
              </span>
              <StarRow n={profile.trials.identifier.stars} />
              <span className="text-xs text-parchment/50">
                {profile.trials.identifier.plays} play{profile.trials.identifier.plays === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      )}

      {phase === "play" && round && (
        <>
          <div className="mb-4 inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-parchment/70">
            <Fingerprint className="h-4 w-4 text-teal" /> Element {roundIdx + 1} / {ROUNDS} · {score} pts
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* The clue scroll */}
            <div
              className="rounded-2xl p-6"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--color-violet-deep) 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-gold" />
                <h2 className="font-ui font-medium text-spectral">The assay notes</h2>
                <span className="ml-auto text-xs text-parchment/50">
                  clue {round.revealed} / {round.clues.length}
                </span>
              </div>
              <ol className="space-y-3">
                {round.clues.slice(0, round.revealed).map((clue, i) => (
                  <li
                    key={i}
                    className="rounded-r-lg py-2.5 pl-4 pr-3 font-serif text-sm text-parchment"
                    style={{
                      borderLeft: "3px solid color-mix(in oklab, var(--color-gold) 45%, transparent)",
                      background: "color-mix(in oklab, var(--color-gold) 6%, transparent)",
                    }}
                  >
                    {clue}
                  </li>
                ))}
              </ol>
              {round.solved === null && round.revealed < round.clues.length && (
                <button
                  onClick={revealNext}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-parchment/80 transition-colors hover:text-spectral"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  <Eye className="h-4 w-4" /> Reveal another clue (−1 point)
                </button>
              )}
            </div>

            {/* The guess */}
            <div>
              <h2 className="font-display text-2xl mb-4">Name the element</h2>
              {round.solved === null ? (
                <>
                  <form onSubmit={submitGuess} className="flex gap-2">
                    <input
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="Name or symbol — e.g. Iron or Fe"
                      aria-label="Your guess"
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl px-4 py-3 font-ui text-sm text-spectral placeholder:text-parchment/35 outline-none transition-colors focus:border-emerald-elixir"
                      style={{
                        background: "color-mix(in oklab, var(--color-slate-sunken) 62%, transparent)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={guess.trim().length === 0}
                      className="btn-arcane btn-arcane-hover flex-shrink-0 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Call it
                    </button>
                  </form>
                  {wrongGuess && (
                    <div
                      className="mt-4 rounded-r-lg py-3 pl-4 pr-3 text-sm text-parchment"
                      style={{
                        borderLeft: "3px solid color-mix(in oklab, var(--color-gold) 60%, transparent)",
                        background: "color-mix(in oklab, var(--color-gold) 7%, transparent)",
                      }}
                    >
                      <span className="font-ui font-medium text-gold">Not {wrongGuess}. </span>
                      A wrong call isn't wasted — the next clue narrows the field. Read the notes again.
                    </div>
                  )}
                  <button
                    onClick={giveUp}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-parchment/50 transition-colors hover:text-parchment"
                  >
                    <X className="h-3.5 w-3.5" /> Concede this element
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="rounded-2xl p-6"
                    style={{
                      background: `color-mix(in oklab, ${round.solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 8%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${round.solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 35%, transparent)`,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">
                      {round.solved ? `Named it — +${round.pointsEarned} points` : "It was"}
                    </p>
                    <p className="mt-1 font-display text-3xl text-spectral">
                      {round.el.name}{" "}
                      <span className="text-parchment/60 text-2xl">({round.el.symbol})</span>
                    </p>
                    <p className="mt-1 text-sm text-parchment/70">
                      Element {round.el.number} · {round.el.category} · mass {round.el.mass}
                    </p>
                    {lore && (
                      <p className="mt-3 font-serif text-sm text-parchment">{lore.history}</p>
                    )}
                  </div>
                  <button onClick={nextRound} className="btn-arcane btn-arcane-hover mt-5 w-full justify-center">
                    {roundIdx + 1 >= ROUNDS ? "See results" : "Next element"}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {phase === "done" && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
          }}
        >
          <Trophy className="h-12 w-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl mb-2">
            {score === MAX_SCORE ? "A master assayer!" : "Assay complete"}
          </h2>
          <p className="font-display text-5xl text-teal my-4">
            {score}/{MAX_SCORE}
          </p>
          <div className="mb-4 flex justify-center">
            <StarRow n={identifierStars(score)} />
          </div>
          <p className="text-sm text-parchment mb-6">
            {score === MAX_SCORE
              ? "Every element named from a single clue. The bench has nothing left to teach you here."
              : "The fewer clues you need, the more points you earn — run the assay again and trust the early clues."}
          </p>
          <button onClick={start} className="btn-arcane btn-arcane-hover">
            <RefreshCw className="h-4 w-4" /> Assay again
          </button>
        </div>
      )}
    </>
  );
}

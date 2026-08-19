import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera, ScanSearch, Check, X, RotateCcw, Upload, Loader2,
  Sparkles, Clock, ArrowLeft, ImageOff,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { useUserProfile } from "../lib/profile";
import { useAI } from "../lib/useAI";
import {
  SCAVENGER_ELEMENTS, buildMissionQuestion, downscaleImage, submitEvidence,
  useEvidence, type ScavengerElement, type EvidenceEntry,
} from "../lib/scavenger";
import { startElementDetector, type LiveDetection } from "../lib/element-vision";
import { uploadEvidenceImage } from "../lib/image-upload";
import type { ScanResult } from "../lib/ai";

/** Grab the current video frame as small JPEG base64 (no data: prefix). */
function grabFrameBase64(video: HTMLVideoElement, maxDim = 384, quality = 0.55): string | null {
  if (!video.videoWidth) return null;
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? null;
}

export const Route = createFileRoute("/scavenger")({
  component: () => (
    <RequireRole role="student">
      <ScavengerHunt />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-emerald-elixir)";

type Step = "pick" | "capture" | "result";

function ScavengerHunt() {
  const { uid } = useUserProfile();
  const ai = useAI();
  const { entries } = useEvidence(uid);

  const [step, setStep] = useState<Step>("pick");
  const [element, setElement] = useState<ScavengerElement | null>(null);
  const [shot, setShot] = useState<{ dataUrl: string; base64: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<EvidenceEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setElement(null); setShot(null); setAnswer(""); setVerdict(null); setStep("pick");
  };

  const pick = (el: ScavengerElement) => {
    setElement(el); setShot(null); setAnswer(""); setVerdict(null); setStep("capture");
  };

  const submit = async () => {
    if (!element || !shot || !uid) return;
    setSaving(true);
    const question = buildMissionQuestion(element);
    let result;
    try {
      result = await ai.verifyMission({ question, answer, imageBase64: shot.base64 });
    } catch {
      result = {
        correct: false, confidence: 0, needsManualReview: true,
        feedback: "Something went wrong reaching the AI — your find was saved for your teacher to review.",
        source: "fallback" as const,
      };
    }
    // Cloudinary when configured; inline data URL in Firestore otherwise.
    const { url: imageUrl } = await uploadEvidenceImage(shot.dataUrl);
    const entry: EvidenceEntry = {
      id: "pending",
      element: element.symbol, elementName: element.name,
      answer, question, image: imageUrl,
      correct: result.correct, confidence: result.confidence,
      feedback: result.feedback, needsManualReview: result.needsManualReview,
      source: result.source,
    };
    setVerdict(entry);
    setStep("result");
    const { id: _id, teacherApproved: _ta, createdAt: _ca, ...input } = entry;
    try {
      await submitEvidence(uid, input);
    } catch (e) {
      console.error("submitEvidence failed:", e);
    }
    setSaving(false);
  };

  return (
    <StudentShell title="Scavenger Hunt">
      <PageHeader
        eyebrow="AI Scavenger Hunt"
        title="Hunt an element in the real world."
        subtitle="Pick an element, find something at home that contains it, and photograph your proof. The Alchemist's eye will judge your find."
        icon={ScanSearch}
        accent={ACCENT}
        right={
          ai.configured === false ? (
            <span className="text-[10px] tracking-[0.15em] uppercase rounded-full px-3 py-1.5 whitespace-nowrap"
              style={{ color: "var(--color-gold)", background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
              Teacher-reviewed
            </span>
          ) : ai.configured ? (
            <span className="text-[10px] tracking-[0.15em] uppercase rounded-full px-3 py-1.5 whitespace-nowrap inline-flex items-center gap-1.5"
              style={{ color: ACCENT, background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)` }}>
              <Sparkles className="h-3 w-3" /> AI-graded
            </span>
          ) : null
        }
      />

      {step === "pick" && <PickStep onPick={pick} />}
      {step === "capture" && element && (
        <CaptureStep
          ai={ai}
          element={element} shot={shot} setShot={setShot}
          answer={answer} setAnswer={setAnswer}
          saving={saving} onSubmit={submit} onBack={reset}
        />
      )}
      {step === "result" && verdict && element && (
        <ResultStep verdict={verdict} element={element} onAgain={reset} onRetry={() => pick(element)} />
      )}

      {/* ── Past finds ── */}
      {step === "pick" && entries.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Clock className="h-4 w-4 text-teal" />
            <h2 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70">Your Finds</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entries.map((e) => <EvidenceCard key={e.id} e={e} />)}
          </div>
        </section>
      )}
    </StudentShell>
  );
}

// ── Step 1: pick an element ───────────────────────────────────────────────────
function PickStep({ onPick }: { onPick: (el: ScavengerElement) => void }) {
  return (
    <section>
      <p className="text-sm text-parchment/70 mb-4 px-1">Choose an element to hunt:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SCAVENGER_ELEMENTS.map((el) => (
          <button
            key={el.symbol}
            onClick={() => onPick(el)}
            className="group text-left rounded-2xl p-4 transition-all duration-200 hover:-translate-y-1"
            style={{
              background: `linear-gradient(150deg, color-mix(in oklab, ${el.color} 16%, transparent), color-mix(in oklab, var(--color-slate-sunken) 60%, transparent))`,
              border: `1px solid color-mix(in oklab, ${el.color} 32%, transparent)`,
              boxShadow: `0 8px 30px -20px ${el.color}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-2xl leading-none" style={{ color: el.color }}>{el.symbol}</span>
              <span className="text-[10px] text-parchment/50 font-display">{el.number}</span>
            </div>
            <div className="font-display text-sm mb-1">{el.name}</div>
            <div className="text-[11px] text-parchment/60 leading-snug">{el.hint}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Step 2: capture / upload a photo ──────────────────────────────────────────
function CaptureStep({
  ai, element, shot, setShot, answer, setAnswer, saving, onSubmit, onBack,
}: {
  ai: ReturnType<typeof useAI>;
  element: ScavengerElement;
  shot: { dataUrl: string; base64: string } | null;
  setShot: (s: { dataUrl: string; base64: string } | null) => void;
  answer: string; setAnswer: (s: string) => void;
  saving: boolean; onSubmit: () => void; onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camState, setCamState] = useState<"idle" | "live" | "denied">("idle");
  const [eye, setEye] = useState<"loading" | "live" | "off">("loading");
  const [best, setBest] = useState<LiveDetection | null>(null);
  // The smarter, Gemini-backed read of the live frame (sees rings, water, etc.).
  const [smart, setSmart] = useState<ScanResult | null>(null);
  const smartLockedRef = useRef(false);

  // The live "AI eye": on-device object detection over the camera feed.
  // Green reticle = that object plausibly contains the hunted element.
  useEffect(() => {
    if (camState !== "live" || !videoRef.current || !overlayRef.current) return;
    setEye("loading");
    setBest(null);
    const detector = startElementDetector({
      video: videoRef.current,
      canvas: overlayRef.current,
      elementSymbol: element.symbol,
      onReady: () => setEye("live"),
      onError: () => setEye("off"),
      onUpdate: setBest,
    });
    return detector.stop;
  }, [camState, element.symbol]);

  // The "Alchemist's eye": every few seconds, send a small frame to Gemini and
  // let it REASON about materials/contents — catching what COCO-SSD can't (a
  // gold ring, the water inside a cup, a powder). Stops once it locks on, to
  // keep calls minimal. Silently inert when no AI key is configured.
  useEffect(() => {
    if (camState !== "live" || ai.configured === false) return;
    let cancelled = false;
    let inFlight = false;
    smartLockedRef.current = false;
    setSmart(null);

    const scan = async () => {
      const video = videoRef.current;
      if (!video || cancelled || inFlight || smartLockedRef.current) return;
      const b64 = grabFrameBase64(video);
      if (!b64) return;
      inFlight = true;
      try {
        const r = await ai.scanFrame({
          elementName: element.name,
          elementSymbol: element.symbol,
          examples: element.examples,
          imageBase64: b64,
        });
        if (!cancelled && r.source === "gemini") {
          setSmart(r);
          if (r.present) smartLockedRef.current = true; // locked — stop scanning
        }
      } catch {
        /* on-device eye still runs */
      } finally {
        inFlight = false;
      }
    };

    const id = window.setInterval(scan, 2800);
    void scan(); // first pass promptly
    return () => { cancelled = true; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camState, element.symbol, ai.configured]);

  // A confident lock from either eye. Gemini's reasoning wins when it fires.
  const smartMatch = smart?.present === true;
  const locked = smartMatch || best?.match === true;
  const lockedLabel = smartMatch ? smart!.label : best?.label ?? "";

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCam = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API (needs HTTPS or localhost)");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, audio: false,
      });
      streamRef.current = stream;
      setCamState("live"); // the <video> renders on this state — stream attaches in the effect below
    } catch (err) {
      console.warn("[Scavenger] camera unavailable:", err);
      setCamState("denied");
    }
  };

  // Attach the stream AFTER the <video> exists. (Setting srcObject inside
  // startCam raced the render: the ref was still null, leaving a black box.)
  useEffect(() => {
    if (camState !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => { /* autoplay is fine: muted + playsInline */ });
  }, [camState]);

  // Clean up the camera when leaving this step.
  useEffect(() => stopCam, []);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.9);
    // If either eye had the element locked on, pre-fill "what is it?".
    if (locked && !answer && lockedLabel) setAnswer(lockedLabel);
    stopCam();
    setCamState("idle");
    setShot(await downscaleImage(raw));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setShot(await downscaleImage(file));
  };

  const retake = () => { setShot(null); setCamState("idle"); };

  return (
    <section>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-parchment/60 hover:text-teal mb-4 transition">
        <ArrowLeft className="h-3.5 w-3.5" /> Choose a different element
      </button>

      {/* Mission card */}
      <div className="rounded-2xl p-5 mb-5"
        style={{ background: `color-mix(in oklab, ${element.color} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${element.color} 30%, transparent)` }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-xl flex-shrink-0"
            style={{ color: element.color, background: `color-mix(in oklab, ${element.color} 18%, transparent)`, border: `1px solid color-mix(in oklab, ${element.color} 40%, transparent)` }}>
            {element.symbol}
          </span>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50">Your mission</div>
            <div className="font-display text-lg">Find <span style={{ color: element.color }}>{element.name}</span> at home</div>
          </div>
        </div>
        <p className="text-sm text-parchment/70">{element.hint} <span className="text-parchment/50">e.g. {element.examples.slice(0, 3).join(", ")}.</span></p>
      </div>

      {/* Camera / photo area */}
      <div className="rounded-2xl overflow-hidden mb-4 relative"
        style={{ border: "1px solid var(--color-border)", background: "#0b1220", aspectRatio: "4/3" }}>
        {shot ? (
          <img src={shot.dataUrl} alt="Your capture" className="h-full w-full object-cover" />
        ) : camState === "live" ? (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {/* Reticle overlay — green = contains the element, red = not it. */}
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            {/* AI-eye status chip */}
            <div
              className="pointer-events-none absolute left-1/2 top-3 z-10 flex max-w-[92%] -translate-x-1/2 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-center text-xs backdrop-blur"
              style={{
                background: "rgba(11,18,32,0.78)",
                color: locked ? "#34d399" : eye === "live" || ai.configured ? "var(--color-parchment)" : "var(--color-gold)",
                border: `1px solid ${locked ? "rgba(52,211,153,0.5)" : "rgba(232,220,192,0.2)"}`,
              }}
            >
              <span className="max-w-full truncate">
                {locked
                  ? `${element.name} found${lockedLabel ? `: ${lockedLabel}` : ""} ✓ — capture it!`
                  : eye === "loading" && ai.configured !== true
                    ? "Summoning the Alchemist's eye…"
                    : `Looking for ${element.name}… try ${element.examples[0]}`}
              </span>
              {/* Gemini's reasoning (why it locked on) — the smart layer. */}
              {smartMatch && smart?.reason && (
                <span className="max-w-full truncate text-[10px] font-normal text-parchment/70">{smart.reason}</span>
              )}
              {/* Subtle "AI is thinking" hint while a scan is in flight and not yet locked. */}
              {!locked && ai.configured === true && (
                <span className="inline-flex items-center gap-1 text-[10px] font-normal text-teal/80">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Alchemist's eye analysing…
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-parchment/60 p-6 text-center">
            <Camera className="h-9 w-9" style={{ color: ACCENT }} />
            {camState === "denied"
              ? <p className="text-sm">Camera unavailable — allow camera permission and use HTTPS (or localhost). You can still upload a photo instead.</p>
              : <p className="text-sm">Snap a live photo, or upload one from your device.</p>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {shot ? (
          <>
            <button onClick={retake} className="btn-ghost-arcane text-sm">
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button onClick={onSubmit} disabled={saving} className="btn-arcane btn-arcane-hover text-sm disabled:opacity-60">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : <><ScanSearch className="h-4 w-4" /> Submit for review</>}
            </button>
          </>
        ) : camState === "live" ? (
          <button onClick={capture} className="btn-arcane btn-arcane-hover text-sm"
            style={locked ? { boxShadow: "0 0 24px -6px #34d399" } : undefined}>
            <Camera className="h-4 w-4" /> {locked && lockedLabel ? `Capture the ${lockedLabel}` : "Capture"}
          </button>
        ) : (
          <>
            <button onClick={startCam} className="btn-arcane btn-arcane-hover text-sm">
              <Camera className="h-4 w-4" /> Open camera
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost-arcane text-sm">
              <Upload className="h-4 w-4" /> Upload photo
            </button>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      </div>

      {/* Optional caption */}
      {shot && (
        <div className="mt-4">
          <label className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5 block">
            What is it? (optional)
          </label>
          <input
            value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder={`e.g. "${element.examples[0]}"`}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none"
            style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)", border: "1px solid var(--color-border)" }}
          />
        </div>
      )}
    </section>
  );
}

// ── Step 3: verdict ───────────────────────────────────────────────────────────
function ResultStep({
  verdict, element, onAgain, onRetry,
}: {
  verdict: EvidenceEntry; element: ScavengerElement; onAgain: () => void; onRetry: () => void;
}) {
  const pending = verdict.needsManualReview;
  const good = verdict.correct && !pending;
  const tone = pending ? "var(--color-gold)" : good ? ACCENT : "var(--color-crimson)";
  const Icon = pending ? Clock : good ? Check : X;
  const title = pending ? "Sent to your teacher" : good ? "Verified!" : "Not quite";

  return (
    <section className="max-w-xl">
      <div className="rounded-2xl overflow-hidden mb-5" style={{ border: `1px solid color-mix(in oklab, ${tone} 40%, transparent)`, boxShadow: `0 0 50px -24px ${tone}` }}>
        {verdict.image && <img src={verdict.image} alt="Your find" className="w-full max-h-72 object-cover" />}
        <div className="p-5" style={{ background: `color-mix(in oklab, ${tone} 8%, transparent)` }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full flex-shrink-0"
              style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)`, border: `1px solid color-mix(in oklab, ${tone} 45%, transparent)`, color: tone }}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <div className="font-display text-xl" style={{ color: tone }}>{title}</div>
              <div className="text-xs text-parchment/60">
                Hunting {element.name} ({element.symbol})
                {!pending && verdict.source === "gemini" && ` · ${Math.round(verdict.confidence * 100)}% confident`}
                {verdict.source === "fallback" && " · teacher review"}
              </div>
            </div>
          </div>
          <p className="text-sm text-parchment leading-relaxed">{verdict.feedback}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={onAgain} className="btn-arcane btn-arcane-hover text-sm">
          <Sparkles className="h-4 w-4" /> Hunt another element
        </button>
        {!good && (
          <button onClick={onRetry} className="btn-ghost-arcane text-sm">
            <RotateCcw className="h-4 w-4" /> Try {element.symbol} again
          </button>
        )}
      </div>
    </section>
  );
}

// ── Evidence thumbnail (history) ──────────────────────────────────────────────
function EvidenceCard({ e }: { e: EvidenceEntry }) {
  const pending = e.needsManualReview && e.teacherApproved == null;
  const good = e.correct || e.teacherApproved === true;
  const tone = pending ? "var(--color-gold)" : good ? ACCENT : "var(--color-crimson)";
  const Icon = pending ? Clock : good ? Check : X;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid color-mix(in oklab, ${tone} 30%, transparent)` }}>
      <div className="relative aspect-square bg-slate-sunken">
        {e.image
          ? <img src={e.image} alt={e.elementName} className="h-full w-full object-cover" />
          : <div className="h-full w-full flex items-center justify-center text-parchment/30"><ImageOff className="h-6 w-6" /></div>}
        <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-sm"
          style={{ background: `color-mix(in oklab, ${tone} 55%, #000 20%)`, color: "#fff" }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="px-2.5 py-1.5 flex items-center justify-between">
        <span className="font-display text-sm" style={{ color: tone }}>{e.element}</span>
        <span className="text-[10px] text-parchment/50 truncate">{e.elementName}</span>
      </div>
    </div>
  );
}

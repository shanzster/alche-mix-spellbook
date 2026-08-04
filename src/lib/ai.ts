/**
 * AlcheMix AI server functions — the "server proxy" from
 * Free-Ai-Implementation-Tutorial.MD §3, implemented as TanStack Start
 * `createServerFn` handlers (the tutorial's Option B).
 *
 * Each function:
 *   1. tries the real Gemini call (`askGemini`, dynamically imported so the
 *      server-only key never reaches the client bundle), and
 *   2. falls back to a deterministic, keyless rule-based result if the key is
 *      still the placeholder / unset (or Gemini errors).
 *
 * Every result carries `source: "gemini" | "fallback"` so the UI can show an
 * honest "AI review pending" state while the key is blank.
 *
 * Client usage (safe — no key crosses the wire):
 *   import { aiVerifyMission } from "~/lib/ai";
 *   const verdict = await aiVerifyMission({ data: { question, answer } });
 *
 * Route-name mapping to the tutorial (for reference):
 *   aiVerifyMission   ↔  POST /api/ai/verify    (§1 AR scavenger, vision)
 *   aiGenerateProblem ↔  POST /api/ai/generate  (§4 problem sets)
 *   aiGradeAnswer     ↔  POST /api/ai/grade     (§4 auto-grade + explain)
 *   aiAskAlchemist    ↔  POST /api/ai/tutor     ("Ask the Alchemist" tutor)
 */
import { createServerFn } from "@tanstack/react-start";

export type AISource = "gemini" | "fallback";

// ── Result shapes ─────────────────────────────────────────────────────────────
export interface VerifyResult {
  correct: boolean;
  confidence: number; // 0..1
  feedback: string;
  needsManualReview: boolean;
  source: AISource;
}

export interface GeneratedProblem {
  topic: string;
  question: string;
  answer: number | string;
  unit?: string;
  workingSteps: string[];
  source: AISource;
}

export interface GradeResult {
  isCorrect: boolean;
  score: number; // 0..1
  correctAnswer?: string;
  explanation: string[];
  source: AISource;
}

export interface TutorResult {
  reply: string;
  source: AISource;
}

// ── Input shapes ──────────────────────────────────────────────────────────────
interface VerifyInput {
  question: string;
  answer: string;
  /** Raw base64 (no `data:` prefix). Optional — omit to force manual review. */
  imageBase64?: string;
}
interface GenerateInput {
  topic?: string; // e.g. "gas-laws" | "stoichiometry"
  /** Vary numbers per student — pass uid+timestamp so each gets a fresh problem. */
  seed?: string;
}
interface GradeInput {
  question: string;
  studentAnswer: string;
  correctAnswer?: string;
  topic?: string;
}
interface TutorInput {
  question: string;
  context?: string;
}

// ── Tiny deterministic RNG (server-side, seed → stable numbers) ────────────────
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: string) {
  let state = hashSeed(seed) || 1;
  return (min: number, max: number) => {
    // xorshift32 → [0,1)
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return min + (state / 0xffffffff) * (max - min);
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  1. AR scavenger-hunt verification (vision) — tutorial §4-A
// ════════════════════════════════════════════════════════════════════════════
export const aiVerifyMission = createServerFn({ method: "POST" })
  .validator((d: VerifyInput) => d)
  .handler(async ({ data }): Promise<VerifyResult> => {
    const { question, answer, imageBase64 } = data;
    try {
      const { askGemini } = await import("./server/gemini");
      const verdict = await askGemini<Omit<VerifyResult, "source" | "needsManualReview">>({
        system:
          "You are a chemistry teacher grading an AR scavenger-hunt submission. " +
          "Be encouraging but accurate.",
        jsonSchema: {
          type: "object",
          properties: {
            correct: { type: "boolean" },
            confidence: { type: "number" },
            feedback: { type: "string" },
          },
          required: ["correct", "feedback"],
        },
        parts: [
          {
            text:
              `Mission question: ${question}\nStudent's answer: ${answer}\n\n` +
              `Look at the attached photo. Does it satisfy the mission? Reply as JSON.`,
          },
          ...(imageBase64
            ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } as const }]
            : []),
        ],
      });
      return {
        correct: !!verdict.correct,
        confidence: verdict.confidence ?? 0.5,
        feedback: verdict.feedback,
        needsManualReview: false,
        source: "gemini",
      };
    } catch {
      // Keyless / error → route to the teacher. Never auto-fail a real student.
      return {
        correct: false,
        confidence: 0,
        feedback:
          "Automatic AI review isn't switched on yet — your submission was saved " +
          "for your teacher to review and grade manually.",
        needsManualReview: true,
        source: "fallback",
      };
    }
  });

// ════════════════════════════════════════════════════════════════════════════
//  2. AI-generated problem sets — tutorial §4-B
// ════════════════════════════════════════════════════════════════════════════
export const aiGenerateProblem = createServerFn({ method: "POST" })
  .validator((d: GenerateInput) => d)
  .handler(async ({ data }): Promise<GeneratedProblem> => {
    const topic = data.topic ?? "gas-laws";
    const seed = data.seed ?? "seedless";
    try {
      const { askGemini } = await import("./server/gemini");
      const problem = await askGemini<Omit<GeneratedProblem, "source" | "topic">>({
        system: "You generate high-school chemistry problems. Keep numbers realistic.",
        temperature: 0.9,
        jsonSchema: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "number" },
            unit: { type: "string" },
            workingSteps: { type: "array", items: { type: "string" } },
          },
          required: ["question", "answer", "workingSteps"],
        },
        parts: [
          {
            text:
              `Create ONE ${topic} word problem with fresh random values ` +
              `(nonce ${seed}). Include the numeric answer and step-by-step working.`,
          },
        ],
      });
      return { topic, source: "gemini", ...problem };
    } catch {
      return { ...localProblem(topic, seed), source: "fallback" };
    }
  });

/** Keyless problem generator — deterministic from the seed so it's reproducible. */
function localProblem(topic: string, seed: string): Omit<GeneratedProblem, "source"> {
  const rng = makeRng(`${topic}:${seed}`);
  const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

  if (topic === "stoichiometry") {
    const moles = round(rng(0.5, 4), 2);
    const answer = round(moles * 2, 2); // 2 H2O per ... simplified 1:2 ratio
    return {
      topic,
      question:
        `In the reaction 2 H₂ + O₂ → 2 H₂O, if ${moles} mol of O₂ react ` +
        `completely, how many moles of H₂O are produced?`,
      answer,
      unit: "mol",
      workingSteps: [
        "Read the mole ratio from the balanced equation: 1 O₂ : 2 H₂O.",
        `Multiply moles of O₂ by 2 → ${moles} × 2 = ${answer} mol H₂O.`,
      ],
    };
  }

  // Default: Ideal Gas Law, solve for pressure. PV = nRT → P = nRT / V
  const n = round(rng(0.2, 3), 2);
  const T = Math.round(rng(250, 400)); // Kelvin
  const V = round(rng(1, 10), 1); // litres
  const R = 0.0821;
  const P = round((n * R * T) / V, 2);
  return {
    topic: "gas-laws",
    question:
      `A sealed ${V} L container holds ${n} mol of an ideal gas at ${T} K. ` +
      `Using PV = nRT (R = 0.0821 L·atm·mol⁻¹·K⁻¹), find the pressure P in atm.`,
    answer: P,
    unit: "atm",
    workingSteps: [
      "Rearrange PV = nRT to P = nRT / V.",
      `Substitute: P = (${n} × 0.0821 × ${T}) / ${V}.`,
      `P ≈ ${P} atm.`,
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  3. Automated grading + explain-my-mistake — tutorial §4-C
// ════════════════════════════════════════════════════════════════════════════
export const aiGradeAnswer = createServerFn({ method: "POST" })
  .validator((d: GradeInput) => d)
  .handler(async ({ data }): Promise<GradeResult> => {
    const { question, studentAnswer, correctAnswer, topic } = data;
    try {
      const { askGemini } = await import("./server/gemini");
      const result = await askGemini<Omit<GradeResult, "source">>({
        system: "You are a strict but supportive chemistry grader.",
        jsonSchema: {
          type: "object",
          properties: {
            isCorrect: { type: "boolean" },
            score: { type: "number" },
            correctAnswer: { type: "string" },
            explanation: { type: "array", items: { type: "string" } },
          },
          required: ["isCorrect", "explanation"],
        },
        parts: [
          {
            text:
              `Topic: ${topic ?? "chemistry"}\nQuestion: ${question}\n` +
              `Student answer: ${studentAnswer}\n` +
              (correctAnswer ? `Reference answer: ${correctAnswer}\n` : "") +
              `Grade it (score 0..1) and give step-by-step reasoning for any mistake.`,
          },
        ],
      });
      return {
        ...result,
        score: result.score ?? (result.isCorrect ? 1 : 0),
        source: "gemini",
      };
    } catch {
      return { ...localGrade(studentAnswer, correctAnswer), source: "fallback" };
    }
  });

/** Keyless grader — exact/numeric compare when a reference answer is known. */
function localGrade(studentAnswer: string, correctAnswer?: string): Omit<GradeResult, "source"> {
  if (correctAnswer == null) {
    return {
      isCorrect: false,
      score: 0,
      explanation: [
        "AI grading isn't switched on yet, and no reference answer was provided,",
        "so this answer was saved for your teacher to grade manually.",
      ],
    };
  }
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const num = (s: string) => {
    const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  };
  const sNum = num(studentAnswer);
  const cNum = num(correctAnswer);
  let isCorrect: boolean;
  if (!Number.isNaN(sNum) && !Number.isNaN(cNum)) {
    // Accept within 1% of the reference (rounding tolerance).
    isCorrect = Math.abs(sNum - cNum) <= Math.max(0.01, Math.abs(cNum) * 0.01);
  } else {
    isCorrect = norm(studentAnswer) === norm(correctAnswer);
  }
  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    correctAnswer,
    explanation: isCorrect
      ? ["Correct — your answer matches the expected result."]
      : [
          `Not quite. The expected answer is ${correctAnswer}.`,
          "Re-check your working step by step and compare each line.",
        ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  4. "Ask the Alchemist" tutor chatbot
// ════════════════════════════════════════════════════════════════════════════
export const aiAskAlchemist = createServerFn({ method: "POST" })
  .validator((d: TutorInput) => d)
  .handler(async ({ data }): Promise<TutorResult> => {
    const { question, context } = data;
    try {
      const { askGemini } = await import("./server/gemini");
      const reply = await askGemini<string>({
        system:
          "You are 'The Alchemist', a warm, concise chemistry tutor for secondary " +
          "students. Explain simply, use analogies, never just give the final answer " +
          "for graded work — guide the student to it.",
        temperature: 0.6,
        parts: [{ text: (context ? `Context: ${context}\n\n` : "") + question }],
      });
      return { reply, source: "gemini" };
    } catch {
      return {
        reply:
          "🜁 The Alchemist is resting — the AI tutor isn't switched on yet. " +
          "In the meantime, try the Element Explorer and the Learn modules, or ask " +
          "your teacher. (Add a Gemini API key to wake the Alchemist.)",
        source: "fallback",
      };
    }
  });

// ── Convenience: is AI live? (server-checked, safe to call from the client) ────
export const aiStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isAIConfigured } = await import("./server/gemini");
  return { configured: isAIConfigured() };
});

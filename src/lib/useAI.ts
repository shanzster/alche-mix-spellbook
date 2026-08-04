/**
 * useAI — thin client wrapper around the AI server functions in `ai.ts`.
 *
 * The browser only ever calls these server functions (the key stays on the
 * server). While the Gemini key is still the placeholder, every call transparently
 * returns a `source: "fallback"` result, so the UI keeps working keyless.
 *
 *   const { verifyMission, askAlchemist, busy, configured } = useAI();
 *   const verdict = await verifyMission({ question, answer });
 *   if (verdict.needsManualReview) toast("Saved for your teacher to review");
 */
import { useCallback, useEffect, useState } from "react";
import {
  aiAskAlchemist,
  aiGenerateProblem,
  aiGradeAnswer,
  aiStatus,
  aiVerifyMission,
  type GeneratedProblem,
  type GradeResult,
  type TutorResult,
  type VerifyResult,
} from "./ai";

export function useAI() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = unknown yet; true/false once the server reports whether a key is set.
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    aiStatus()
      .then((s) => alive && setConfigured(s.configured))
      .catch(() => alive && setConfigured(false));
    return () => {
      alive = false;
    };
  }, []);

  /** Wrap a server-fn call with shared busy/error handling. */
  const run = useCallback(function run<TArgs, TOut>(
    fn: (opts: { data: TArgs }) => Promise<TOut>,
  ) {
    return async (args: TArgs): Promise<TOut> => {
      setBusy(true);
      setError(null);
      try {
        return await fn({ data: args });
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI request failed");
        throw e;
      } finally {
        setBusy(false);
      }
    };
  }, []);

  return {
    busy,
    error,
    /** null until the first status check resolves; then true if a real key is set. */
    configured,
    verifyMission: run<
      { question: string; answer: string; imageBase64?: string },
      VerifyResult
    >(aiVerifyMission),
    generateProblem: run<{ topic?: string; seed?: string }, GeneratedProblem>(
      aiGenerateProblem,
    ),
    gradeAnswer: run<
      { question: string; studentAnswer: string; correctAnswer?: string; topic?: string },
      GradeResult
    >(aiGradeAnswer),
    askAlchemist: run<{ question: string; context?: string }, TutorResult>(
      aiAskAlchemist,
    ),
  };
}

import { useEffect, useState } from "react";
import { finalizePlayerDraft, type PlayerDraftState } from "../../api/client";
const steps = [
  ["rosters", "finalizing rosters…"],
  ["schedule", "setting schedule…"],
  ["headlines", "drafting headlines…"],
] as const;
export function DraftCompletionToast({
  seasonId,
  completed,
  onFinished,
}: {
  seasonId: string;
  completed: boolean;
  onFinished: (state: PlayerDraftState) => Promise<unknown>;
}) {
  const [phase, setPhase] = useState<string>("idle"),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (completed) return;
    let live = true;
    async function launch() {
      try {
        let result: PlayerDraftState | undefined;
        for (const [stage, label] of steps) {
          if (!live) return;
          setPhase(label);
          setError("");
          const started = Date.now();
          result = await finalizePlayerDraft(seasonId, stage);
          // Keep each real operation readable even when local SQLite finishes immediately.
          await new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, 650 - (Date.now() - started))),
          );
          if (!live) return;
        }
        if (result) {
          setPhase("done");
          await onFinished(result);
        }
      } catch (e) {
        if (live) {
          setError(
            e instanceof Error ? e.message : "Unable to prepare the season.",
          );
          setPhase("error");
        }
      }
    }
    void launch();
    return () => {
      live = false;
    };
  }, [seasonId, completed, onFinished, attempt]);
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => setPhase("idle"), 6000);
    return () => clearTimeout(timer);
  }, [phase]);
  if (phase === "idle") return null;
  return (
    <aside
      className="draft-completion-toast"
      aria-label="Season preparation progress"
    >
      <div role={error ? "alert" : "status"} aria-live="polite">
        <span className="draft-eyebrow">
          {phase === "done" ? "SEASON READY" : "DRAFT COMPLETE"}
        </span>
        <strong>
          {phase === "done"
            ? "Rosters and schedule ready"
            : phase === "error"
              ? "Season preparation paused"
              : phase}
        </strong>
        <p>
          {error ||
            (phase === "done"
              ? "Week 1 is ready. Seven headline drafts are queued for future AI generation."
              : "Preparing your new season. Your progress is saved.")}
        </p>
      </div>
      {error ? (
        <button
          className="draft-primary"
          onClick={() => setAttempt(attempt + 1)}
        >
          Retry finalization
        </button>
      ) : phase === "done" ? (
        <button
          className="draft-secondary"
          aria-label="Dismiss season preparation toast"
          onClick={() => setPhase("idle")}
        >
          Dismiss
        </button>
      ) : (
        <span className="draft-completion-toast__progress" aria-hidden="true">
          {steps.map(([, label]) => (
            <i key={label} className={phase === label ? "is-current" : ""} />
          ))}
        </span>
      )}
    </aside>
  );
}

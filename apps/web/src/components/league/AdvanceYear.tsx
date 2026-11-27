import { useEffect, useRef, useState } from "react";
import { advanceYear, type LeagueSummary } from "../../api/client";
import "./seasonPreparation.css";
export function AdvanceYear({
  league,
  onAdvanced,
  onClose,
}: {
  league: LeagueSummary;
  onAdvanced: () => Promise<unknown>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [keepers, setKeepers] = useState(
    league.keeperCount === null ? "" : String(league.keeperCount),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (keepers === "" || !Number.isSafeInteger(Number(keepers))) return;
    setBusy(true);
    setError("");
    try {
      await advanceYear(league.seasonId, Number(keepers));
      await onAdvanced();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to advance the season.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="league-dialog"
      aria-labelledby="advance-year-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form className="league-dialog__form" onSubmit={submit}>
        <header className="league-dialog__header">
          <div>
            <p className="league-dialog__eyebrow">CHAMPIONSHIP COMPLETE</p>
            <h1 id="advance-year-title">
              Start Season {league.seasonNumber + 1}
            </h1>
          </div>
          <button
            className="league-dialog__close"
            type="button"
            aria-label="Close advance season"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="league-dialog__body">
          <p>
            Start a new year with an empty schedule. The previous season’s games
            and stats are preserved. Next, lock each team’s keepers and coaching
            decision in the Draft tab.
          </p>
          <label className="league-field">
            Keepers per team
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={keepers}
              onChange={(e) => setKeepers(e.target.value)}
              disabled={busy}
            />
            <small>
              Every team must keep exactly this many players. This also saves
              the league’s keeper limit.
            </small>
          </label>
          {error && (
            <p role="alert" className="league-dialog__error">
              {error}
            </p>
          )}
        </div>
        <footer className="league-dialog__footer">
          <span>
            Season {league.seasonNumber} stays in your league history.
          </span>
          <div>
            <button
              type="button"
              className="league-dialog__secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="league-dialog__primary"
              disabled={busy || keepers === ""}
            >
              {busy ? "Advancing…" : "Advance Season"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

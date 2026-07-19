import { useEffect, useRef, useState } from "react";
import { MainMenuButton } from "./MainMenuButton";
import type { MainMenuItem } from "./types";

const MENU_AMBIENCE_URL =
  "https://andrew-jacobson06.github.io/public-audio/stadiumNoise-menu.mp3";

const MENU_SONG_URL =
  "https://andrew-jacobson06.github.io/public-audio/Prime Time Kickoff(1).mp3";

const menuItems: MainMenuItem[] = [
  { label: "View Players", screen: "players" },
  {
    label: "Existing League",
    placeholderMessage:
      "Existing League has not been migrated yet. TODO: connect this button when the Games/League screen is ported.",
  },
  {
    label: "New League",
    placeholderMessage:
      "New League coming soon! TODO: port the old league creation flow when its backend/API behavior is available.",
  },
];

type MainMenuScreenProps = {
  onNavigate: (screen: MainMenuItem["screen"]) => void;
};

function fadeAudio(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
) {
  const start = performance.now();
  audio.volume = from;

  const step = (now: number) => {
    const progress = Math.min((now - start) / durationMs, 1);
    const nextVolume = from + (to - from) * progress;

    audio.volume = Math.max(0, Math.min(1, nextVolume));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

export function MainMenuScreen({ onNavigate }: MainMenuScreenProps) {
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const songRef = useRef<HTMLAudioElement | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);

  const [placeholderMessage, setPlaceholderMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const track = tickerRef.current;
    if (!track?.parentElement) return;

    const textWidth = track.scrollWidth;
    const containerWidth = track.parentElement.offsetWidth;

    if (textWidth < containerWidth * 2) {
      track.innerHTML = track.innerHTML + track.innerHTML;
    }
  }, []);

  useEffect(() => {
    const ambience = ambienceRef.current;
    const song = songRef.current;

    if (!ambience || !song) return;

    ambience.volume = 0.55;
    song.volume = 0;

    const startAudio = () => {
      ambience.muted = false;
      song.muted = false;

      ambience.volume = 0.55;
      song.volume = 0;

      void ambience.play();

      window.setTimeout(() => {
        void song.play();
        fadeAudio(song, 0, 0.82, 4500);
      }, 1800);
    };

    // Try autoplay first. Browsers may block this until user interaction.
    startAudio();

    const unlock = () => {
      startAudio();

      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    const resumeWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void ambience.play();
        void song.play();
      }
    };

    const toggleMute = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m") return;

      const shouldMute = !ambience.muted || !song.muted;

      ambience.muted = shouldMute;
      song.muted = shouldMute;
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", toggleMute);
    document.addEventListener("visibilitychange", resumeWhenVisible);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", toggleMute);
      document.removeEventListener("visibilitychange", resumeWhenVisible);
    };
  }, []);

  const handleSelect = (item: MainMenuItem) => {
    if (item.screen) {
      onNavigate(item.screen);
      return;
    }

    setPlaceholderMessage(
      item.placeholderMessage ?? `${item.label} has not been migrated yet.`,
    );
  };

  return (
    <section
      className="main-menu-screen"
      aria-label="Animal Football Main Menu"
    >
      <div className="corner tl" />
      <div className="corner tr" />
      <div className="corner bl" />
      <div className="corner br" />

      <div className="brand">Animal Football</div>

      <div className="menu-wrap">
        <div className="panel">
          <div className="ticker">
            <div className="track" id="tickerTrack" ref={tickerRef}>
              WEEK 1 • 8:00 PM ET • HOME vs AWAY <span className="sep">|</span>
              POWER RANKINGS UPDATE • TOP 5: ATL, DAL, DEN, SEA, CLT{" "}
              <span className="sep">|</span>
              WEATHER: CLEAR • 62°F • 5 MPH WNW <span className="sep">|</span>
              INJURY REPORT: RB QUESTIONABLE (ANKLE){" "}
              <span className="sep">|</span>
            </div>
          </div>

          <div className="rail top">
            <span className="runnerX" />
          </div>
          <div className="rail bottom">
            <span className="runnerX" />
          </div>
          <div className="rail left">
            <span className="runnerY" />
          </div>
          <div className="rail right">
            <span className="runnerY" />
          </div>

          <div className="node n1" />
          <div className="node n2" />
          <div className="node n3" />
          <div className="node n4" />

          <div className="tick t1" />
          <div className="tick t2" />
          <div className="tick t3" />
          <div className="tick t4" />

          {menuItems.map((item) => (
            <MainMenuButton
              item={item}
              key={item.label}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {placeholderMessage && (
          <div className="main-menu-placeholder" role="status">
            {placeholderMessage}
          </div>
        )}
      </div>

      <audio
        ref={ambienceRef}
        id="menuAmbience"
        src={MENU_AMBIENCE_URL}
        preload="auto"
        loop
        playsInline
      />

      <audio
        ref={songRef}
        id="menuSong"
        src={MENU_SONG_URL}
        preload="auto"
        loop
        playsInline
      />
    </section>
  );
}

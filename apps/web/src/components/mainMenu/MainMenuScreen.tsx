import { useEffect, useRef, useState } from "react";
import { MainMenuButton } from "./MainMenuButton";
import type { MainMenuItem } from "./types";

const MENU_AMBIENCE_URL = "https://andrew-jacobson06.github.io/public-audio/stadiumNoise-menu.mp3";

const menuItems: MainMenuItem[] = [
  { label: "View Players", screen: "players" },
  {
    label: "Existing League",
    placeholderMessage: "Existing League has not been migrated yet. TODO: connect this button when the Games/League screen is ported."
  },
  {
    label: "New League",
    placeholderMessage: "New League coming soon! TODO: port the old league creation flow when its backend/API behavior is available."
  }
];

type MainMenuScreenProps = {
  onNavigate: (screen: MainMenuItem["screen"]) => void;
};

export function MainMenuScreen({ onNavigate }: MainMenuScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);
  const [placeholderMessage, setPlaceholderMessage] = useState<string | null>(null);

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
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.88;
    audio.play().catch(() => undefined);

    const unlock = () => {
      audio.muted = false;
      audio.volume = 0.88;
      audio.play().catch(() => undefined);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    const resumeWhenVisible = () => {
      if (document.visibilityState === "visible") {
        audio.play().catch(() => undefined);
      }
    };

    const toggleMute = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "m") {
        audio.muted = !audio.muted;
      }
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

    setPlaceholderMessage(item.placeholderMessage ?? `${item.label} has not been migrated yet.`);
  };

  return (
    <section className="main-menu-screen" aria-label="Animal Football Main Menu">
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
              POWER RANKINGS UPDATE • TOP 5: ATL, DAL, DEN, SEA, CLT <span className="sep">|</span>
              WEATHER: CLEAR • 62°F • 5 MPH WNW <span className="sep">|</span>
              INJURY REPORT: RB QUESTIONABLE (ANKLE) <span className="sep">|</span>
            </div>
          </div>

          <div className="rail top"><span className="runnerX" /></div>
          <div className="rail bottom"><span className="runnerX" /></div>
          <div className="rail left"><span className="runnerY" /></div>
          <div className="rail right"><span className="runnerY" /></div>

          <div className="node n1" /><div className="node n2" />
          <div className="node n3" /><div className="node n4" />

          <div className="tick t1" /><div className="tick t2" />
          <div className="tick t3" /><div className="tick t4" />

          {menuItems.map((item) => (
            <MainMenuButton item={item} key={item.label} onSelect={handleSelect} />
          ))}
        </div>
        {placeholderMessage && (
          <div className="main-menu-placeholder" role="status">
            {placeholderMessage}
          </div>
        )}
      </div>

      <audio ref={audioRef} id="menuAmbience" src={MENU_AMBIENCE_URL} preload="auto" autoPlay muted loop playsInline />
    </section>
  );
}

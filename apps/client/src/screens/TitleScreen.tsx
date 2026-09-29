import { useState } from "react";
import "../theme/aow-theme.css";
import "./TitleScreen.css";

export interface TitleScreenProps {
  gameName: string;
  tagline: string;
  /** Whether the player already has a signed-in session -- swaps the primary button between "Continue" (resume) and "New Game" (their first visit, or signed out). */
  isReturningPlayer: boolean;
  onContinue: () => void;
}

export function TitleScreen({ gameName, tagline, isReturningPlayer, onContinue }: TitleScreenProps) {
  const [toast, setToast] = useState<string | null>(null);

  function handleStub(label: string) {
    setToast(`${label} isn't available yet.`);
    window.setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="aow aow-title">
      <div className="aow-title-rings" />
      <div className="aow-title-content">
        <div className="aow-title-divider">᛭ ᛭ ᛭</div>
        <h1 className="aow-title-wordmark">{gameName}</h1>
        <p className="aow-title-tagline">{tagline}</p>

        <div className="aow-title-menu">
          <button type="button" className="aow-title-item primary" onClick={onContinue}>
            <span>{isReturningPlayer ? "CONTINUE" : "NEW GAME"}</span>
            <span className="aow-title-item-sub">{isReturningPlayer ? "Resume your journey" : "Begin your journey"}</span>
          </button>
          <button type="button" className="aow-title-item" onClick={() => handleStub("SETTINGS")}>
            SETTINGS
          </button>
        </div>
      </div>

      {toast && <div className="aow-toast">{toast}</div>}

      <div className="aow-title-footer">
        <span>v0.1.0 · EARLY ACCESS</span>
      </div>
    </div>
  );
}

import { useState } from "react";
import "../theme/aow-theme.css";
import "./TitleScreen.css";

export interface TitleScreenProps {
  gameName: string;
  tagline: string;
  onContinue: () => void;
}

const STUB_ITEMS = ["NEW GAME", "LOAD GAME", "SETTINGS"];

export function TitleScreen({ gameName, tagline, onContinue }: TitleScreenProps) {
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
            <span>CONTINUE</span>
            <span className="aow-title-item-sub">Resume your journey</span>
          </button>
          {STUB_ITEMS.map((label) => (
            <button key={label} type="button" className="aow-title-item" onClick={() => handleStub(label)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {toast && <div className="aow-toast">{toast}</div>}

      <div className="aow-title-footer">
        <span>v0.1.0 · EARLY ACCESS</span>
      </div>
    </div>
  );
}

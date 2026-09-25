import { useEffect } from "react";
import { computeResourceMax, getClassResource, type Character } from "@eridan/engine";
import "../theme/aow-theme.css";
import "./GameShell.css";

export type NavId = "home" | "character" | "inventory" | "skills" | "talents" | "map";

interface NavItem {
  id: NavId;
  label: string;
  glyph: string;
  key: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", glyph: "ᚺ", key: "h" },
  { id: "character", label: "Character", glyph: "ᛗ", key: "c" },
  { id: "inventory", label: "Inventory", glyph: "ᛒ", key: "i" },
  { id: "skills", label: "Skills", glyph: "ᚲ", key: "k" },
  { id: "talents", label: "Talents", glyph: "ᛉ", key: "n" },
  { id: "map", label: "World Map", glyph: "ᛟ", key: "m" },
];

/** Nav destinations not yet rebuilt as dedicated pages in this style — shown, but not wired up yet. */
const COMING_SOON: NavId[] = ["talents"];

export interface GameShellProps {
  gameName: string;
  character: Character;
  active: NavId;
  onNavigate: (id: NavId) => void;
  children: React.ReactNode;
}

export function GameShell({ gameName, character, active, onNavigate, children }: GameShellProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      const item = NAV_ITEMS.find((n) => n.key === e.key.toLowerCase());
      if (item && !COMING_SOON.includes(item.id)) onNavigate(item.id);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigate]);

  const resourceConfig = getClassResource(character.classId);
  const resourceMax = computeResourceMax(character.abilityScores, character.classId);
  const hpPct = Math.max(0, Math.min(100, (character.hp / character.maxHp) * 100));
  const resourcePct =
    resourceConfig && resourceMax ? Math.max(0, Math.min(100, ((character.resource ?? 0) / resourceMax) * 100)) : 0;
  const initial = character.name.trim().charAt(0).toUpperCase();

  return (
    <div className="aow aow-shell">
      <header className="aow-header">
        <div className="aow-header-logo">
          <span className="aow-diamond aow-logo-diamond" />
          <span className="aow-wordmark">{gameName}</span>
        </div>
        <div className="aow-header-chip">
          <div className="aow-chip-avatar">{initial}</div>
          <div className="aow-chip-info">
            <div className="aow-chip-name">{character.name}</div>
            <div className="aow-chip-meta">
              LV {character.level} {character.classId.toUpperCase()}
            </div>
          </div>
          <div className="aow-chip-bars">
            <div className="aow-bar-track aow-chip-bar">
              <div className="aow-bar-fill hp" style={{ width: `${hpPct}%` }} />
            </div>
            {resourceConfig && (
              <div className="aow-bar-track aow-chip-bar">
                <div className="aow-bar-fill mana" style={{ width: `${resourcePct}%` }} />
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="aow-body">
        <nav className="aow-nav">
          {NAV_ITEMS.map((item) => {
            const soon = COMING_SOON.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`aow-nav-item${active === item.id ? " active" : ""}${soon ? " soon" : ""}`}
                onClick={() => !soon && onNavigate(item.id)}
                disabled={soon}
                title={soon ? `${item.label} — coming soon` : item.label}
              >
                <span className="aow-nav-glyph">{item.glyph}</span>
                <span className="aow-nav-label">{item.label}</span>
                <span className="aow-keycap">{item.key.toUpperCase()}</span>
              </button>
            );
          })}
        </nav>
        <main className="aow-main">{children}</main>
      </div>
    </div>
  );
}

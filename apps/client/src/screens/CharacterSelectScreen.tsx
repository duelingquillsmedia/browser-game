import { useEffect, useState } from "react";
import { CLASSES, LEVEL_CAP, RACES, xpToNextLevel, type Character } from "@eridan/engine";
import { getAvatarById } from "../game/avatars";
import { GAME_NAME } from "../game/lore";
import { deleteCharacterFromRoster, loadRoster, type RosterEntry } from "../game/roster";
import { currentLocationName } from "../game/setup";
import "../theme/aow-theme.css";
import "./CharacterSelectScreen.css";

export interface CharacterSelectScreenProps {
  onEnterWorld: (character: Character) => void;
  onCreateNew: () => void;
  onBack: () => void;
}

const SLOT_COUNT = 3;

/** Mirrors CharacterCreationScreen's own class color/glyph maps -- kept local rather than shared since each screen picks its own small subset of what it needs from them. */
const CLASS_COLOR_VAR: Record<string, string> = {
  cleric: "var(--aow-gold)",
  warrior: "var(--aow-hp)",
  soldier: "var(--aow-ember)",
  rogue: "var(--aow-violet)",
  ranger: "var(--aow-mana)",
  wizard: "var(--aow-frost)",
  druid: "var(--aow-green)",
};
const CLASS_GLYPHS: Record<string, string> = {
  cleric: "ᛋ",
  warrior: "ᛏ",
  soldier: "ᚦ",
  rogue: "ᚾ",
  ranger: "ᚱ",
  wizard: "ᚨ",
  druid: "ᛜ",
};

function formatLastPlayed(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

interface SlotCardProps {
  n: number;
  entry: RosterEntry | null;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
}

function SlotCard({ n, entry, isSelected, onSelect, onPlay }: SlotCardProps) {
  if (!entry) {
    return (
      <button type="button" className="aow-select-card aow-select-card-empty" onClick={onPlay}>
        <div className="aow-select-empty-diamond">
          <span>+</span>
        </div>
        <div className="aow-select-empty-slot-label">SLOT {n} · EMPTY</div>
        <div className="aow-select-empty-title">Create New Character</div>
        <div className="aow-select-empty-sub">Choose a race, class and name.</div>
      </button>
    );
  }

  const { character, updatedAt } = entry;
  const color = CLASS_COLOR_VAR[character.classId] ?? "var(--aow-ember)";
  const avatar = getAvatarById(character.appearance?.avatarId);
  const atLevelCap = character.level >= LEVEL_CAP;
  const xpNeeded = atLevelCap ? 0 : xpToNextLevel(character.level);
  const xpPct = atLevelCap ? 100 : Math.max(0, Math.min(100, (character.xp / xpNeeded) * 100));

  return (
    <div
      className={`aow-select-card${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      onDoubleClick={onPlay}
      role="button"
      tabIndex={0}
    >
      <div className="aow-select-portrait">
        {avatar ? (
          <img src={avatar.image} alt="" className="aow-select-portrait-avatar" />
        ) : (
          <span className="aow-select-portrait-glyph" style={{ color }}>
            {CLASS_GLYPHS[character.classId] ?? "?"}
          </span>
        )}
        <div className="aow-select-portrait-fade" />
        <div className="aow-select-tags">
          <span className="aow-select-tag">SLOT {n}</span>
          {isSelected && <span className="aow-select-tag selected">SELECTED</span>}
        </div>
        <div className="aow-select-identity">
          <div className="aow-select-level-diamond" style={{ borderColor: color, boxShadow: `0 0 12px ${color}` }}>
            <span>{character.level}</span>
          </div>
          <div className="aow-select-identity-text">
            <div className="aow-select-name">{character.name}</div>
            <div className="aow-select-race-class">
              <span>{(RACES[character.raceId]?.name ?? character.raceId).toUpperCase()}</span>
              <span className="dot">·</span>
              <span style={{ color }}>{(CLASSES[character.classId]?.name ?? character.classId).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="aow-select-stats">
        <div className="aow-bar-label">
          <span>EXPERIENCE</span>
          <span>{atLevelCap ? "Max Level" : `${character.xp.toLocaleString()} / ${xpNeeded.toLocaleString()}`}</span>
        </div>
        <div className="aow-bar-track aow-bar-track-xp">
          <div className="aow-bar-fill gold" style={{ width: `${xpPct}%` }} />
        </div>
        <div className="aow-select-tile-row">
          <div className="aow-select-tile">
            <span>LOCATION</span>
            <strong>{currentLocationName(character)}</strong>
          </div>
          <div className="aow-select-tile">
            <span>DAY</span>
            <strong>{character.worldMapState?.day ?? 1}</strong>
          </div>
          <div className="aow-select-tile">
            <span>GOLD</span>
            <strong>{character.gold}</strong>
          </div>
        </div>
        <div className="aow-select-last-played">LAST PLAYED · {formatLastPlayed(updatedAt).toUpperCase()}</div>
      </div>
    </div>
  );
}

/**
 * Up to three character slots, standing between the Title screen and Home
 * (see the Aetherwyn design handoff, `design_handoff_aetherwyn_character_select/`).
 * Slots are the account's own characters ordered oldest-created-first, not
 * the handoff's hand-authored sample/localStorage data. The cap at three is
 * enforced twice over: Character Creation is only reachable from an empty
 * slot here, and the Supabase schema itself rejects a fourth `characters`
 * row per account (see `game/roster.ts`'s own `loadRoster` doc comment).
 *
 * Two deliberate departures from the handoff, both noted in the README:
 * the "Played" stat tile became "Gold" (this engine tracks no play-time),
 * and the "NEW" just-created tag was dropped (Creation goes straight to
 * Home today, so a freshly made hero is never actually seen here fresh).
 */
export function CharacterSelectScreen({ onEnterWorld, onCreateNew, onBack }: CharacterSelectScreenProps) {
  const [slots, setSlots] = useState<(RosterEntry | null)[]>(Array(SLOT_COUNT).fill(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRoster()
      .then((entries) => {
        if (cancelled) return;
        const padded: (RosterEntry | null)[] = Array(SLOT_COUNT).fill(null);
        entries.forEach((entry, i) => {
          padded[i] = entry;
        });
        setSlots(padded);
        const firstFilled = padded.findIndex(Boolean);
        setSelected(firstFilled >= 0 ? firstFilled : 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load your characters.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function playSlot(i: number) {
    const entry = slots[i];
    if (entry) onEnterWorld(entry.character);
    else onCreateNew();
  }

  function askDelete() {
    if (slots[selected]) setConfirming(true);
  }

  async function doDelete() {
    const entry = slots[selected];
    if (!entry || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCharacterFromRoster(entry.character.id);
      const next = slots.slice();
      next[selected] = null;
      setSlots(next);
      const firstFilled = next.findIndex(Boolean);
      setSelected(firstFilled >= 0 ? firstFilled : selected);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete this character.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (confirming) {
        if (e.key === "Escape") setConfirming(false);
        if (e.key === "Enter") {
          e.preventDefault();
          void doDelete();
        }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= SLOT_COUNT) {
        setSelected(n - 1);
        return;
      }
      if (e.key === "ArrowLeft") setSelected((s) => (s + SLOT_COUNT - 1) % SLOT_COUNT);
      if (e.key === "ArrowRight") setSelected((s) => (s + 1) % SLOT_COUNT);
      if (e.key === "Enter") {
        e.preventDefault();
        playSlot(selected);
      }
      if (e.key === "Delete" || e.key === "Backspace") askDelete();
      if (e.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming, slots, selected]);

  const usedCount = slots.filter(Boolean).length;
  const currentEntry = slots[selected];

  return (
    <div className="aow aow-select">
      <header className="aow-select-header">
        <button type="button" className="aow-select-nav-link" onClick={onBack}>
          ‹ TITLE
        </button>
        <div className="aow-select-header-divider" />
        <span className="aow-diamond aow-logo-diamond" />
        <span className="aow-wordmark">{GAME_NAME.toUpperCase()}</span>
        <div className="aow-select-header-spacer" />
        <span className="aow-select-header-count">
          SELECT CHARACTER · {usedCount} / {SLOT_COUNT} SLOTS
        </span>
      </header>

      <main className="aow-select-main">
        <div className="aow-select-heading">
          <h1 className="aow-h1">Choose your character</h1>
          <p className="aow-select-subtitle">
            Select a hero to continue their journey, or begin a new one in an empty slot.
          </p>
        </div>

        {error && <p className="aow-warning">{error}</p>}

        <div className="aow-select-grid">
          {loading
            ? Array.from({ length: SLOT_COUNT }, (_, i) => <div key={i} className="aow-select-card aow-select-card-loading" />)
            : slots.map((entry, i) => (
                <SlotCard
                  key={entry?.character.id ?? `empty-${i}`}
                  n={i + 1}
                  entry={entry}
                  isSelected={i === selected}
                  onSelect={() => setSelected(i)}
                  onPlay={() => playSlot(i)}
                />
              ))}
        </div>
      </main>

      <footer className="aow-select-footer">
        <button type="button" className="aow-button-ghost" onClick={onBack}>
          ‹ TITLE
        </button>
        <button type="button" className="aow-select-delete-button" disabled={!currentEntry} onClick={askDelete}>
          <span>DELETE</span>
          <span className="aow-keycap">DEL</span>
        </button>
        <div className="aow-select-pips">
          {slots.map((entry, i) => (
            <span
              key={i}
              className={`aow-select-pip${i === selected ? " selected" : entry ? " filled" : ""}`}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>
        <span className="aow-select-hint">1–3 SELECT</span>
        <button type="button" className="aow-select-play-button" onClick={() => playSlot(selected)}>
          <span>{currentEntry ? "ENTER WORLD" : "CREATE CHARACTER"}</span>
          <span className="aow-select-play-keycap">ENTER</span>
        </button>
      </footer>

      {confirming && currentEntry && (
        <div className="aow-select-overlay" onClick={() => setConfirming(false)}>
          <div className="aow-select-confirm" onClick={(e) => e.stopPropagation()}>
            <span className="aow-select-confirm-diamond" />
            <div className="aow-select-confirm-title">Delete {currentEntry.character.name}?</div>
            <p className="aow-select-confirm-desc">
              Level {currentEntry.character.level} {RACES[currentEntry.character.raceId]?.name ?? ""}{" "}
              {CLASSES[currentEntry.character.classId]?.name ?? ""}. All progress in this slot will be lost. This
              cannot be undone.
            </p>
            <div className="aow-select-confirm-actions">
              <button type="button" className="aow-button-ghost" onClick={() => setConfirming(false)}>
                CANCEL
              </button>
              <button type="button" className="aow-select-confirm-delete" disabled={deleting} onClick={() => void doDelete()}>
                {deleting ? "DELETING…" : "DELETE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

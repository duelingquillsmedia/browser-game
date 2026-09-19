export interface Tab {
  id: string;
  label: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, activeId, onChange }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeId}
          className={tab.id === activeId ? "tab-button selected" : "tab-button"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label = "Back" }: BackButtonProps) {
  return (
    <button type="button" className="ghost back-button" onClick={onClick}>
      ← {label}
    </button>
  );
}

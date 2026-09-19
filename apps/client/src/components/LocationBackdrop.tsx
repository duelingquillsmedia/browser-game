export interface LocationBackdropProps {
  image: string;
}

/** A fixed, full-viewport background behind a screen's content, unconstrained by its `.screen` max-width. */
export function LocationBackdrop({ image }: LocationBackdropProps) {
  return (
    <div
      className="location-backdrop"
      style={{
        backgroundImage: `linear-gradient(rgba(18, 13, 24, 0.55), rgba(18, 13, 24, 0.82)), url(${image})`,
      }}
    />
  );
}

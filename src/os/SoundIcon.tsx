/** Speaker icon — sound waves when on, a mute slash when off. */
export default function SoundIcon({
  on,
  className = "h-3.5 w-3.5",
}: {
  on: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={className}
    >
      {/* speaker body */}
      <path d="M3 6h2.4L8.5 3v10L5.4 10H3z" fill="currentColor" />
      {on ? (
        <>
          <path
            d="M10.6 6.2a2.8 2.8 0 010 3.6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M12.4 4.6a5 5 0 010 6.8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M11 6l3 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M14 6l-3 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

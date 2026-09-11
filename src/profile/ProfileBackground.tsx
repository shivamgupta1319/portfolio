import StarField from "./StarField";

/** Fixed, non-interactive backdrop: soft orbs + scanlines + drifting stars. */
export default function ProfileBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-accent/15 blur-[120px]" />
      <div className="absolute -bottom-52 -right-40 h-[40rem] w-[40rem] rounded-full bg-cyan/10 blur-[140px]" />
      <StarField />
      <div className="scanlines absolute inset-0" />
    </div>
  );
}

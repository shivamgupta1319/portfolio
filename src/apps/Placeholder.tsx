import type { AppId } from "@/os/types";
import { APP_META } from "@/os/apps.meta";

/** Temporary content for apps not yet implemented. Real apps land in later phases. */
export default function Placeholder({ appId }: { appId: AppId }) {
  const meta = APP_META[appId];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center font-mono">
      <div className="text-2xl text-accent-2">[ {meta.short} ]</div>
      <p className="text-sm text-fg-dim">
        module <span className="text-cyan">{meta.title}</span> is initializing…
      </p>
      <p className="text-xs text-fg-mute">ships in a later build phase</p>
    </div>
  );
}

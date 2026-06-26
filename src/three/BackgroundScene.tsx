"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Particles from "./Particles";
import { useQuality } from "./useQuality";

export default function BackgroundScene() {
  const q = useQuality();
  const [visible, setVisible] = useState(true);

  // Pause rendering when the tab is hidden.
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!q.enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={q.dpr}
        camera={{ position: [0, 0, 9], fov: 60 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible ? "always" : "never"}
      >
        <Particles count={q.count} />
      </Canvas>
    </div>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PALETTE = [
  new THREE.Color("#6366f1"),
  new THREE.Color("#818cf8"),
  new THREE.Color("#22d3ee"),
  new THREE.Color("#fb7185"),
];

export default function Particles({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);

  // soft round sprite so particles glow instead of rendering as GL squares
  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  const { positions, colors } = useMemo(() => {
    // deterministic PRNG (pure) so render stays idempotent
    const rand = (n: number) => {
      const x = Math.sin(n * 12.9898 + 7.13) * 43758.5453;
      return x - Math.floor(x);
    };
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // distribute in a flattened spherical shell for depth
      const r = 4 + Math.sqrt(rand(i * 4)) * 9;
      const theta = rand(i * 4 + 1) * Math.PI * 2;
      const phi = Math.acos(2 * rand(i * 4 + 2) - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = PALETTE[(rand(i * 4 + 3) * PALETTE.length) | 0];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  // slow drift + gentle parallax toward the pointer
  useFrame((state, delta) => {
    const p = points.current;
    if (!p) return;
    p.rotation.y += delta * 0.02;
    p.rotation.x += delta * 0.006;
    const { x, y } = state.pointer;
    p.position.x += (x * 0.6 - p.position.x) * 0.03;
    p.position.y += (y * 0.4 - p.position.y) * 0.03;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        map={sprite}
        alphaMap={sprite}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

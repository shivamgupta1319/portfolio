"use client";

import type { ResizeEdge } from "./useWindowResize";

const EDGES: { edge: ResizeEdge; className: string }[] = [
  { edge: "n", className: "left-2 right-2 top-0 h-1.5 cursor-ns-resize" },
  { edge: "s", className: "left-2 right-2 bottom-0 h-1.5 cursor-ns-resize" },
  { edge: "w", className: "top-2 bottom-2 left-0 w-1.5 cursor-ew-resize" },
  { edge: "e", className: "top-2 bottom-2 right-0 w-1.5 cursor-ew-resize" },
  { edge: "nw", className: "top-0 left-0 h-2.5 w-2.5 cursor-nwse-resize" },
  { edge: "ne", className: "top-0 right-0 h-2.5 w-2.5 cursor-nesw-resize" },
  { edge: "sw", className: "bottom-0 left-0 h-2.5 w-2.5 cursor-nesw-resize" },
  { edge: "se", className: "bottom-0 right-0 h-2.5 w-2.5 cursor-nwse-resize" },
];

export default function ResizeHandles({
  onResize,
}: {
  onResize: (e: React.PointerEvent, edge: ResizeEdge) => void;
}) {
  return (
    <>
      {EDGES.map(({ edge, className }) => (
        <div
          key={edge}
          onPointerDown={(e) => onResize(e, edge)}
          className={`absolute z-10 touch-none ${className}`}
        />
      ))}
    </>
  );
}

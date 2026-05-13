// Deterministic colour palette for departments
// Uses hex colours via inline style to avoid Tailwind JIT purging dynamic classes

export interface DeptColor {
  hex: string;       // department header bg
  hexLight: string;  // approved cell bg
  hexDot: string;    // name dot
  name: string;      // human label
}

const PALETTE: DeptColor[] = [
  { hex: "#1d4ed8", hexLight: "#bfdbfe", hexDot: "#3b82f6", name: "Blå"    },
  { hex: "#7e22ce", hexLight: "#e9d5ff", hexDot: "#a855f7", name: "Lilla"  },
  { hex: "#c2410c", hexLight: "#fed7aa", hexDot: "#f97316", name: "Orange" },
  { hex: "#0f766e", hexLight: "#99f6e4", hexDot: "#14b8a6", name: "Teal"   },
  { hex: "#be185d", hexLight: "#fbcfe8", hexDot: "#ec4899", name: "Pink"   },
  { hex: "#4338ca", hexLight: "#c7d2fe", hexDot: "#6366f1", name: "Indigo" },
  { hex: "#92400e", hexLight: "#fde68a", hexDot: "#f59e0b", name: "Amber"  },
  { hex: "#0e7490", hexLight: "#a5f3fc", hexDot: "#06b6d4", name: "Cyan"   },
];

export function buildDeptColorMap(deptIds: string[]): Map<string, DeptColor> {
  const map = new Map<string, DeptColor>();
  deptIds.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]));
  return map;
}

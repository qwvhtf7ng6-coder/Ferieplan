export interface DeptColor {
  hex: string;
  hexLight: string;
  hexDot: string;
}

const PALETTE: DeptColor[] = [
  { hex: "#1d4ed8", hexLight: "#bfdbfe", hexDot: "#3b82f6" }, // blå
  { hex: "#7e22ce", hexLight: "#e9d5ff", hexDot: "#a855f7" }, // lilla
  { hex: "#c2410c", hexLight: "#fed7aa", hexDot: "#f97316" }, // orange
  { hex: "#0f766e", hexLight: "#99f6e4", hexDot: "#14b8a6" }, // teal
  { hex: "#be185d", hexLight: "#fbcfe8", hexDot: "#ec4899" }, // pink
  { hex: "#4338ca", hexLight: "#c7d2fe", hexDot: "#6366f1" }, // indigo
  { hex: "#92400e", hexLight: "#fde68a", hexDot: "#f59e0b" }, // amber
  { hex: "#0e7490", hexLight: "#a5f3fc", hexDot: "#06b6d4" }, // cyan
];

/** Stable numeric hash of a string */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Assigns colours to departments so that:
 * - Each department always gets the same colour based on its id (stable hash)
 * - No two departments share a colour when possible
 * - When a department is deleted its colour becomes available again automatically
 */
export function buildDeptColorMap(deptIds: string[]): Map<string, DeptColor> {
  const map = new Map<string, DeptColor>();
  const usedIndices = new Set<number>();

  // Sort by id so assignment order is deterministic regardless of DB order
  const sorted = [...deptIds].sort();

  for (const id of sorted) {
    const preferred = hashId(id) % PALETTE.length;

    // Try preferred slot first, then walk forward to find a free slot
    let chosen = preferred;
    for (let offset = 0; offset < PALETTE.length; offset++) {
      const candidate = (preferred + offset) % PALETTE.length;
      if (!usedIndices.has(candidate)) {
        chosen = candidate;
        break;
      }
    }

    usedIndices.add(chosen);
    map.set(id, PALETTE[chosen]);
  }

  return map;
}

// Deterministic colour palette for departments
// Each dept gets a consistent colour based on its id

const PALETTE = [
  { bg: "bg-blue-200",   hover: "hover:bg-blue-300",   header: "bg-blue-700",   dot: "bg-blue-500",   hex: "#3b82f6" },
  { bg: "bg-purple-200", hover: "hover:bg-purple-300", header: "bg-purple-700", dot: "bg-purple-500", hex: "#8b5cf6" },
  { bg: "bg-orange-200", hover: "hover:bg-orange-300", header: "bg-orange-700", dot: "bg-orange-500", hex: "#f97316" },
  { bg: "bg-teal-200",   hover: "hover:bg-teal-300",   header: "bg-teal-700",   dot: "bg-teal-500",   hex: "#14b8a6" },
  { bg: "bg-pink-200",   hover: "hover:bg-pink-300",   header: "bg-pink-700",   dot: "bg-pink-500",   hex: "#ec4899" },
  { bg: "bg-indigo-200", hover: "hover:bg-indigo-300", header: "bg-indigo-700", dot: "bg-indigo-500", hex: "#6366f1" },
  { bg: "bg-amber-200",  hover: "hover:bg-amber-300",  header: "bg-amber-700",  dot: "bg-amber-500",  hex: "#f59e0b" },
  { bg: "bg-cyan-200",   hover: "hover:bg-cyan-300",   header: "bg-cyan-700",   dot: "bg-cyan-500",   hex: "#06b6d4" },
];

export type DeptColor = typeof PALETTE[0];

/** Returns a stable colour for a department based on a sorted index */
export function getDeptColor(index: number): DeptColor {
  return PALETTE[index % PALETTE.length];
}

/** Build a map from deptId -> colour */
export function buildDeptColorMap(deptIds: string[]): Map<string, DeptColor> {
  const map = new Map<string, DeptColor>();
  deptIds.forEach((id, i) => map.set(id, getDeptColor(i)));
  return map;
}

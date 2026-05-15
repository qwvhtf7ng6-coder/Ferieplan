import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 38, className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.38);
  return (
    <div
      className={cn("rounded-full flex items-center justify-center shrink-0 font-bold text-white select-none", className)}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
        fontSize,
      }}
    >
      {initial}
    </div>
  );
}

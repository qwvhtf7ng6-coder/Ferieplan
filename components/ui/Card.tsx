import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, style, interactive, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "bg-surface border border-border rounded-lg shadow-xs",
        interactive && "hover:border-border-hover hover:shadow-md transition-[box-shadow,border-color] duration-150 cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

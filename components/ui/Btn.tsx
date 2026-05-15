import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  full?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-primary text-white shadow-[0_1px_4px_rgba(79,70,229,.35)] hover:bg-primary-hover",
  secondary: "bg-surface text-text border border-border hover:border-border-hover hover:bg-bg shadow-xs",
  success:   "bg-success text-white hover:opacity-90",
  danger:    "bg-danger text-white hover:opacity-90",
  ghost:     "text-text-muted hover:text-text hover:bg-primary-muted",
  outline:   "border border-border text-text hover:border-primary hover:text-primary bg-transparent",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-[30px] px-3 text-[12px] gap-1",
  md: "h-[38px] px-4 text-[13px] gap-1.5",
  lg: "h-[46px] px-5 text-[14px] gap-2",
};

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  full,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        full && "w-full",
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});
Btn.displayName = "Btn";

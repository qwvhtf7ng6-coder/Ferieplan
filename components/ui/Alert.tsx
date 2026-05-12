import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "error" | "warning" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}

const variants = {
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-orange-50 border-orange-200 text-orange-800",
  success: "bg-green-50 border-green-200 text-green-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const icons = {
  error: "✕",
  warning: "⚠",
  success: "✓",
  info: "ℹ",
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 border rounded-lg px-3 py-2.5 text-sm",
        variants[variant],
        className
      )}
    >
      <span className="mt-0.5 font-bold shrink-0">{icons[variant]}</span>
      <div>{children}</div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FieldInput = forwardRef<HTMLInputElement, FieldInputProps>(({
  label, error, hint, className, id, ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-text">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-surface text-sm text-text",
          "placeholder:text-text-subtle",
          "focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,0.12)]",
          "transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-danger focus:border-danger focus:ring-[rgba(220,38,38,0.12)]",
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-[12px] text-text-subtle">{hint}</p>}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
});
FieldInput.displayName = "FieldInput";

interface FieldTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FieldTextarea = forwardRef<HTMLTextAreaElement, FieldTextareaProps>(({
  label, error, hint, className, id, ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-text">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-surface text-sm text-text",
          "placeholder:text-text-subtle resize-none",
          "focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-[rgba(79,70,229,0.12)]",
          "transition-colors duration-150",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-[12px] text-text-subtle">{hint}</p>}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
});
FieldTextarea.displayName = "FieldTextarea";

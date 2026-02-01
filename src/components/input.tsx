import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2 bg-card border border-border rounded-lg",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-error focus:ring-error/20 focus:border-error",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-3 py-2 bg-card border border-border rounded-lg min-h-[100px] resize-y",
            "placeholder:text-muted-foreground font-mono text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-error focus:ring-error/20 focus:border-error",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full px-3 py-2 bg-card border border-border rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-error focus:ring-error/20 focus:border-error",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

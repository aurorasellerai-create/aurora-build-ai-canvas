import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Extra classes for the wrapper div (positioning, etc). */
  wrapperClassName?: string;
  /** Optional element rendered absolutely on the left (e.g. an icon). */
  leftAdornment?: React.ReactNode;
  /** Toggle button className override. */
  toggleClassName?: string;
}

/**
 * Accessible password input with show/hide toggle.
 * - Defaults to type="password"
 * - Toggles to type="text" on click
 * - Keyboard accessible, aria-labels in PT-BR
 * - Preserves autocomplete & password-manager behavior
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, wrapperClassName, leftAdornment, toggleClassName, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    const toggle = React.useCallback(() => {
      setVisible((v) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug("[AUTH_UI] Password visibility toggled");
        }
        return !v;
      });
    }, []);

    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {leftAdornment}
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete={props.autoComplete ?? "current-password"}
          className={cn("pr-10", className)}
        />
        <button
          type="button"
          onClick={toggle}
          tabIndex={0}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition",
            toggleClassName,
          )}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;

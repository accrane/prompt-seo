"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/** Submit button that disables itself and shows pending text while the action runs. */
export function SubmitButton({
  children,
  pendingText = "Working…",
  variant = "primary",
  size = "md",
  formAction,
  className,
  disabled = false,
  noValidate = false,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  formAction?: (formData: FormData) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  /**
   * Skip the browser's constraint validation for this button. Needed when the
   * form also holds a `required` control (e.g. a delete ConfirmCheckbox) that
   * only gates a different submit button.
   */
  noValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      className={className}
      disabled={pending || disabled}
      formAction={formAction}
      formNoValidate={noValidate}
      size={size}
      type="submit"
      variant={variant}
    >
      {pending ? pendingText : children}
    </Button>
  );
}

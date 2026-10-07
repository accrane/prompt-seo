import { Field, inputClasses, textareaClasses } from "@/components/ui/form";
import { PROMPT_IDS, PROMPTS, promptVariables, type VariableDef } from "@/lib/prompts/registry";

/** "Prompts 1, 2, 5" for a variable. */
export function usedBy(key: string): string {
  const numbers = PROMPT_IDS.filter((p) => promptVariables(p).some((v) => v.key === key)).map(
    (p) => PROMPTS[p].number,
  );
  return numbers.length ? `Prompt${numbers.length > 1 ? "s" : ""} ${numbers.join(", ")}` : "";
}

/**
 * One intake field. Required fields that are still empty are outlined and
 * labelled, so the next prompt's blockers are easy to spot.
 */
export function ProfileField({
  def,
  value,
  wide = false,
}: {
  def: VariableDef;
  value: string;
  /** Force full width (used in the compact "fill in what's missing" form). */
  wide?: boolean;
}) {
  const optional = def.fallback !== undefined;
  const needed = !optional && !value.trim();
  const label = `${def.label}${optional ? " (optional)" : ""}`;
  const hint = `${def.hint} · ${usedBy(def.key)}${needed ? " · Still empty" : ""}`;
  const highlight = needed ? " border-amber-400 bg-amber-50/40" : "";
  const multiline = def.input === "textarea" || def.input === "list";

  return (
    <div
      className={`scroll-mt-20 ${multiline || wide ? "sm:col-span-2" : ""}`}
      id={`field-${def.key}`}
    >
      <Field hint={hint} htmlFor={def.key} label={label}>
        {multiline ? (
          <textarea
            className={`${textareaClasses}${highlight}`}
            defaultValue={value}
            id={def.key}
            name={def.key}
            rows={def.input === "list" ? 3 : 4}
          />
        ) : (
          <input
            className={`${inputClasses}${highlight}`}
            defaultValue={value}
            id={def.key}
            min={def.input === "number" ? 0 : undefined}
            name={def.key}
            type={def.input === "number" ? "number" : "text"}
          />
        )}
      </Field>
    </div>
  );
}

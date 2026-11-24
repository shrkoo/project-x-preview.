import type { ReactNode } from "react";

type InputProps = {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Accessible field wrapper shared by text, select, and compound inputs. */
export function Input({ label, error, hint, children }: InputProps) {
  return (
    <label className={"nv-field" + (error ? " has-error" : "")}>
      <span>{label}</span>
      {children}
      {error ? <small role="alert">{error}</small> : hint ? <small className="nv-field-hint">{hint}</small> : null}
    </label>
  );
}

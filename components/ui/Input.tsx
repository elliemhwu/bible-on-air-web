import { forwardRef } from "react";

/** Reader-side text input (login, password pages). Studio forms use `stInput`. */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 font-sans text-sm text-pebble-900 placeholder:text-pebble-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      />
    );
  },
);

/** A label above its input */
export function Field({ label, htmlFor, children }: { label: React.ReactNode; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-sans text-sm text-pebble-600">
        {label}
      </label>
      {children}
    </div>
  );
}

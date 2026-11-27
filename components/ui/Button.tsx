/** Reader-side primary button (login, password pages). Studio uses `stBtnPrimary`. */
export function Button({ className = "", type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${className}`}
    />
  );
}

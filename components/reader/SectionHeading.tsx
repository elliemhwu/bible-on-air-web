/** A block's subheading (經文、觀察與思想…), marked by an ink blot behind its first character */
export function SectionHeading({ children, className = "mb-5" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`section-heading font-sans text-base font-semibold text-primary ${className}`}>{children}</h2>;
}

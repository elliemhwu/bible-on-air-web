import Link from "next/link";

const TONE = {
  /** Reader pages: the reader's ink on its pale violet-grey */
  reader: "text-pebble-800 hover:text-primary",
  /** Studio pages: Studio ink, following the day / night theme */
  studio: "text-st-ink hover:text-st-accent",
} as const;

/**
 * The Bible On Air text logo. One typeface, weight and size everywhere;
 * only the colour follows the surface it sits on. Always links to the reader home.
 */
export function Logo({ tone = "reader" }: { tone?: keyof typeof TONE }) {
  return (
    <Link
      href="/"
      className={`whitespace-nowrap font-serif text-lg font-semibold leading-none tracking-wide no-underline transition-colors ${TONE[tone]}`}
    >
      Bible On Air
    </Link>
  );
}

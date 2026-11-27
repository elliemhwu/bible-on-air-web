import Link from "next/link";

const TONES = {
  /** An action the reader is invited to take */
  primary: "text-primary hover:underline underline-offset-2",
  /** A quiet way back or aside */
  muted: "text-pebble-500 hover:text-pebble-800",
};

/** Reader-side inline link; every reader link uses one of these two tones */
export function TextLink({
  tone = "primary",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { tone?: keyof typeof TONES }) {
  return <Link {...props} className={`${TONES[tone]} ${className}`} />;
}

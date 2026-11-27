import type { AuthUser } from "@/lib/types";

const SIZES = {
  sm: "h-8 w-8 text-[13px]",
  lg: "h-20 w-20 text-3xl",
};

/** The person's picture, or the first character of their name on the studio blue */
export default function Avatar({ user, size = "sm" }: { user: Pick<AuthUser, "name" | "avatarUrl"> | null; size?: keyof typeof SIZES }) {
  if (user?.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- uploads are served as-is
    return <img src={user.avatarUrl} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-st-primary text-st-on-primary`}>
      {user?.name.slice(0, 1)}
    </span>
  );
}

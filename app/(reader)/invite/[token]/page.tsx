import SetPasswordForm from "@/components/studio/SetPasswordForm";

export const metadata = { title: "加入 Bible On Air" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm kind="invite" token={token} />;
}

import AcceptInvite from "@/components/studio/AcceptInvite";

export const metadata = { title: "加入 Bible On Air" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInvite inviteToken={token} />;
}

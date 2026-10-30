import SetPasswordForm from "@/components/studio/SetPasswordForm";

export const metadata = { title: "重設密碼｜Bible On Air" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm kind="reset" token={token} />;
}

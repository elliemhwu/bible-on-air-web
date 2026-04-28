import { Header } from "@/components/layout/Header";

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

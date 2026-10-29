import { Header } from "@/components/layout/Header";

// The header lists published dates; refresh it along with the pages
export const revalidate = 300;

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

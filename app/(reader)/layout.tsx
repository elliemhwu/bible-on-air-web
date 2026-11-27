import { Header } from "@/components/layout/Header";
import { StaffFabProvider } from "@/components/reader/StaffFab";

// The header lists published dates; refresh it along with the pages
export const revalidate = 300;

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffFabProvider>
      <Header />
      {children}
    </StaffFabProvider>
  );
}

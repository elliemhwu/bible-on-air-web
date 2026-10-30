import { StaffEditLink } from "@/components/reader/StaffEditLink";
import { getPublication } from "@/lib/api";

// Always fresh, so edits from the studio show up immediately
export const dynamic = "force-dynamic";

export const metadata = { title: "關於｜Bible On Air" };

export default async function AboutPage() {
  const publication = await getPublication().catch(() => null);
  const about = publication?.about?.replace(/<[^>]*>/g, "").trim()
    ? publication.about
    : null;

  return (
    <main>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-4 flex justify-end empty:hidden">
          <StaffEditLink href="/studio/about" label="編輯關於頁" />
        </div>
        <h1 className="text-2xl font-bold text-pebble-800 mb-2">
          關於 {publication?.name ?? "Bible On Air"}
        </h1>
        {publication?.summary && (
          <p className="text-primary font-sans mb-8">{publication.summary}</p>
        )}
        {about ? (
          <div
            className="prose-tc [&>p]:indent-8"
            dangerouslySetInnerHTML={{ __html: about }}
          />
        ) : (
          <p className="text-pebble-600">更多內容即將推出。</p>
        )}
      </div>
    </main>
  );
}

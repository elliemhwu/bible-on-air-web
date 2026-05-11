import Link from "next/link";

export default function StudioPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-pebble-800 font-sans mb-8">
        後台
      </h1>
      <div className="flex flex-col gap-3">
        <Link
          href="/studio/articles/new"
          className="rounded-lg border border-pebble-200 bg-white px-4 py-3 text-sm text-pebble-700 font-sans hover:border-iris-300 hover:text-iris-600 transition"
        >
          新增文章
        </Link>
      </div>
    </main>
  );
}

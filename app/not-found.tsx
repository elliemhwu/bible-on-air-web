import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center font-sans">
      <h1 className="text-xl font-semibold text-pebble-800 mb-3">找不到這一頁</h1>
      <p className="text-sm text-pebble-500 mb-8">這一天可能還沒有發布靈修內容。</p>
      <div className="flex justify-center gap-4 text-sm">
        <Link href="/" className="text-iris-600 hover:text-iris-700">
          今日靈修
        </Link>
        <Link href="/history" className="text-iris-600 hover:text-iris-700">
          歷史靈修
        </Link>
      </div>
    </main>
  );
}

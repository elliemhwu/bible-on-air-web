import type { RichtextBlock as RichtextBlockType } from "@/lib/types";

export function RichtextBlock({ block }: { block: RichtextBlockType }) {
  return (
    <div className="my-8">
      {block.subheading && (
        <p className="font-sans text-sm font-semibold text-primary mb-3">
          {block.subheading}
        </p>
      )}
      <div className="[&_p]:indent-8">
        <div
          className="prose-tc"
          dangerouslySetInnerHTML={{ __html: block.content.html }}
        />
      </div>
    </div>
  );
}

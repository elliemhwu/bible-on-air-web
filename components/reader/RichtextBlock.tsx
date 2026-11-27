import { SectionHeading } from "@/components/reader/SectionHeading";
import type { RichtextBlock as RichtextBlockType } from "@/lib/types";

export function RichtextBlock({ block }: { block: RichtextBlockType }) {
  return (
    <div>
      {block.subheading && (
        <SectionHeading>{block.subheading}</SectionHeading>
      )}
      <div className="font-sans [&_.prose-tc>p]:indent-8">
        <div
          className="prose-tc"
          dangerouslySetInnerHTML={{ __html: block.content.html }}
        />
      </div>
    </div>
  );
}

import { formatOutlineRange, sectionNumber } from "@/lib/outline";
import type { OutlineBlock as OutlineBlockType } from "@/lib/types";

/** 本書大綱: numbered sections, each with its passages */
export function OutlineBlock({ block }: { block: OutlineBlockType }) {
  return (
    <div className="my-8">
      {block.subheading && (
        <p className="font-sans text-sm font-semibold text-primary mb-3">{block.subheading}</p>
      )}
      <ol className="space-y-5">
        {block.content.sections.map((section, i) => (
          <li key={i}>
            <p className="font-semibold leading-[1.9] text-pebble-800">
              {sectionNumber(i)}、{section.title}
              {section.range && (
                <span className="ml-2 font-sans text-sm font-normal tabular-nums text-pebble-500">
                  {formatOutlineRange(section.range)}
                </span>
              )}
            </p>
            {section.items.length > 0 && (
              <ul className="mt-1.5 space-y-1.5 border-l-2 border-pebble-200 pl-4">
                {section.items.map((item, j) => (
                  <li key={j} className="flex flex-col leading-[1.8] sm:flex-row sm:gap-3">
                    {item.range && (
                      <span className="shrink-0 font-sans text-sm tabular-nums text-primary sm:w-28 sm:pt-0.5">
                        {formatOutlineRange(item.range)}
                      </span>
                    )}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

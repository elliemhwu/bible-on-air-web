#!/usr/bin/env node
// Style guard (docs/style-guide.md): colour values live only in
// app/styles/colors.css, and components use the project's palettes and
// tokens rather than Tailwind's built-in colour scales.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "components", "lib"];
const EXTS = [".ts", ".tsx", ".css"];
const PALETTE_FILE = join("app", "styles", "colors.css");

const TAILWIND_SCALES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const RULES = [
  {
    name: "raw colour value (move it to app/styles/colors.css)",
    re: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/g,
    skip: (file, line) =>
      // Hex-looking anchors and HTML entities are not colours
      /href=|&#/.test(line),
  },
  {
    name: "Tailwind built-in colour (use a palette from colors.css or a semantic token)",
    re: new RegExp(`\\b[a-z-]*-(?:${TAILWIND_SCALES})-\\d{2,3}\\b`, "g"),
  },
  {
    name: "arbitrary colour value in a class (add a token instead)",
    re: /-\[(?:#|rgb|hsl|oklch)[^\]]*\]/g,
  },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTS.some((e) => name.endsWith(e))) out.push(path);
  }
  return out;
}

const problems = [];
for (const dir of DIRS) {
  for (const path of walk(join(ROOT, dir))) {
    const file = relative(ROOT, path);
    if (file === PALETTE_FILE) continue;
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.skip?.(file, line)) continue;
        for (const m of line.matchAll(rule.re)) {
          problems.push(`${file.split(sep).join("/")}:${i + 1}  ${m[0]}  — ${rule.name}`);
        }
      }
    });
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} style problem(s). See docs/style-guide.md.`);
  process.exit(1);
}
console.log("Styles OK: every colour comes from app/styles/colors.css.");

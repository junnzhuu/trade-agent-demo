import { cp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const targetDirectory = process.argv[2];
const scriptSource = process.argv[3];

if (!targetDirectory || !scriptSource) {
  throw new Error(
    "Usage: node scripts/inject-version-switcher.mjs <target-directory> <script-src>",
  );
}

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectHtmlFiles(path);
      return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
    }),
  );
  return nested.flat();
}

await cp("public/version-switcher.js", join(targetDirectory, "version-switcher.js"));

for (const htmlFile of await collectHtmlFiles(targetDirectory)) {
  const html = await readFile(htmlFile, "utf8");
  if (html.includes("version-switcher.js")) continue;
  await writeFile(
    htmlFile,
    html.replace(
      "</body>",
      `<script src="${scriptSource}" defer></script></body>`,
    ),
  );
}

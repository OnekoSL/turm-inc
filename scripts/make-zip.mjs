// Forge packages the application. A streaming ZIP avoids the legacy Windows
// fs.rmdir call in cross-zip, which is incompatible with Node 25 and later.
import { ZipFile } from "yazl";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rename, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const source = resolve("out/Turm INC-win32-x64");
const directory = resolve("out/make/zip/win32/x64");
await stat(join(source, "Turm INC.exe"));
await mkdir(directory, { recursive: true });
const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const destination = join(directory, `Turm-INC-${version}-win32-x64.zip`);
const zip = new ZipFile();
async function append(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await append(absolute);
    else if (entry.isFile())
      zip.addFile(
        absolute,
        `Turm INC/${relative(source, absolute).replaceAll("\\", "/")}`,
      );
  }
}
const result = pipeline(
  zip.outputStream,
  createWriteStream(destination + ".tmp"),
);
await append(source);
zip.end();
await result;
await rename(destination + ".tmp", destination);
console.log(`Windows-Paket erstellt: ${destination}`);

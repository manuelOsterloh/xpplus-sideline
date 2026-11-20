import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** @param {string} publicDir */
export async function buildOfflineBundle(publicDir) {
  const root = pathToFileURL(resolve(publicDir) + sep);
  async function walk(path = "") {
    const out = [];
    for (const entry of await readdir(new URL(path, root), {
      withFileTypes: true,
    })) {
      const name = path + entry.name;
      if (entry.isDirectory()) out.push(...(await walk(name + "/")));
      else if (
        !["sw.js", "sw-meta.json"].includes(name) &&
        !name.endsWith(".map")
      )
        out.push(name);
    }
    return out.sort();
  }
  const files = await walk();
  const hash = createHash("sha256");
  const template = await readFile(
    new URL("./sw-template.js", import.meta.url),
    "utf8",
  );
  hash.update(template);
  for (const file of files)
    hash.update(file).update(await readFile(new URL(file, root)));
  const version = hash.digest("hex").slice(0, 16);
  await writeFile(
    new URL("sw.js", root),
    template
      .replace("__VERSION__", version)
      .replace("__ASSETS__", JSON.stringify(files.map((f) => "/" + f))),
  );
  await writeFile(
    new URL("sw-meta.json", root),
    JSON.stringify({ version, assets: files.length }),
  );
  console.log(`Offline bundle ${version}: ${files.length} files`);
}

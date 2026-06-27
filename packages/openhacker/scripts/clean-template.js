import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(here, "../templates");

await rm(templateDir, { recursive: true, force: true });

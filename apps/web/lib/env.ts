import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function parseEnvValue(line: string) {
  const separator = line.indexOf("=");

  if (separator === -1) {
    return null;
  }

  const key = line.slice(0, separator).trim().replace(/^export\s+/, "");
  let value = line.slice(separator + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function readLocalEnv(name: string) {
  let directory = process.cwd();

  while (true) {
    const envPath = join(directory, ".env.local");

    if (existsSync(envPath)) {
      const contents = readFileSync(envPath, "utf8");

      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
          continue;
        }

        const parsed = parseEnvValue(line);

        if (parsed?.key === name) {
          return parsed.value;
        }
      }
    }

    const parent = dirname(directory);

    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }
}

export function getEnv(name: string) {
  const value = process.env[name] ?? readLocalEnv(name);

  if (value) {
    process.env[name] = value;
  }

  return value;
}

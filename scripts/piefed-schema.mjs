import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_PATH = resolve(ROOT, "package.json");
const SNAPSHOT_PATH = resolve(
  ROOT,
  "src/providers/piefed/openapi.snapshot.json",
);
const SOURCE_METADATA_PATH = resolve(
  ROOT,
  "src/providers/piefed/schema-source.json",
);
const SCHEMA_PATH = resolve(ROOT, "src/providers/piefed/schema.ts");
const DRIFT_ATTEMPTS = 3;

async function check() {
  const [checkedIn, rendered] = await Promise.all([
    readFile(SCHEMA_PATH, "utf8"),
    renderReviewedSchema(),
  ]);

  if (checkedIn !== rendered) {
    throw new Error(
      `${SCHEMA_PATH} is stale. Run pnpm schema:piefed:generate and review the generated diff.`,
    );
  }

  console.log(
    "PieFed schema matches the reviewed OpenAPI snapshot byte-for-byte.",
  );
}

async function checkDrift() {
  const metadata = await readMetadata();
  await verifyReviewedSnapshot(metadata);
  const bytes = await fetchAuthoritativeDocument(metadata.sourceUrl);
  const snapshot = parseJson(bytes, metadata.sourceUrl);
  if (typeof snapshot.openapi !== "string" || snapshot.paths === undefined) {
    throw new Error(`${metadata.sourceUrl} did not return an OpenAPI document`);
  }

  const outputPath = process.env.PIEFED_SCHEMA_DRIFT_OUTPUT;
  if (outputPath) {
    await mkdir(dirname(resolve(outputPath)), { recursive: true });
    await writeFile(resolve(outputPath), bytes);
  }

  const actualHash = hash(bytes);
  if (actualHash !== metadata.sha256) {
    throw new Error(
      [
        "PieFed's authoritative OpenAPI document has changed.",
        `Reviewed on ${metadata.captureDate}: ${metadata.sha256}`,
        `Current upstream SHA-256: ${actualHash}`,
        outputPath
          ? `The fetched document was saved to ${resolve(outputPath)}.`
          : "Set PIEFED_SCHEMA_DRIFT_OUTPUT to retain the fetched document.",
        "Review and adopt the snapshot explicitly; this command never changes tracked files.",
      ].join("\n"),
    );
  }

  console.log(
    `PieFed OpenAPI is unchanged from the ${metadata.captureDate} review (${actualHash}).`,
  );
}

async function fetchAuthoritativeDocument(sourceUrl) {
  let lastError;

  for (let attempt = 1; attempt <= DRIFT_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await globalThis.fetch(sourceUrl, {
        headers: {
          accept: "application/json",
          "user-agent": "threadiverse-piefed-schema-drift-check",
        },
        signal: globalThis.AbortSignal.timeout(30_000),
      });
    } catch (error) {
      lastError = error;
    }

    if (response?.ok) {
      try {
        return Buffer.from(await response.arrayBuffer());
      } catch (error) {
        lastError = error;
      }
    }

    if (response && !response.ok) {
      const error = new Error(
        `Unable to fetch ${sourceUrl}: ${response.status} ${response.statusText}`,
      );
      if (response.status < 500 && response.status !== 429) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < DRIFT_ATTEMPTS) {
      await setTimeout(250 * 2 ** (attempt - 1));
    }
  }

  const detail = lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(
    `Unable to fetch ${sourceUrl} after ${DRIFT_ATTEMPTS} attempts${detail}`,
    { cause: lastError },
  );
}

async function generate() {
  const rendered = await renderReviewedSchema();
  await writeFile(SCHEMA_PATH, rendered);
  console.log(`Generated ${SCHEMA_PATH}`);
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON`, { cause: error });
  }
}

async function readMetadata() {
  const metadata = parseJson(
    await readFile(SOURCE_METADATA_PATH),
    SOURCE_METADATA_PATH,
  );

  for (const key of ["captureDate", "sha256", "sourceUrl"]) {
    if (typeof metadata[key] !== "string" || metadata[key].length === 0) {
      throw new Error(`${SOURCE_METADATA_PATH} must contain ${key}`);
    }
  }

  if (
    metadata.generator?.package !== "openapi-typescript" ||
    typeof metadata.generator.version !== "string" ||
    typeof metadata.generator.typescriptVersion !== "string"
  ) {
    throw new Error(
      `${SOURCE_METADATA_PATH} must identify the generator and TypeScript printer versions`,
    );
  }

  return metadata;
}

async function renderReviewedSchema() {
  const metadata = await readMetadata();
  await verifyGenerator(metadata);
  await verifyReviewedSnapshot(metadata);

  const ast = await openapiTS(pathToFileURL(SNAPSHOT_PATH));
  return `${COMMENT_HEADER}${astToString(ast)}`;
}

async function verifyGenerator(metadata) {
  const packageJson = parseJson(await readFile(PACKAGE_PATH), PACKAGE_PATH);
  const declaredGenerator =
    packageJson.devDependencies?.[metadata.generator.package];
  const declaredTypeScript = packageJson.devDependencies?.typescript;

  if (declaredGenerator !== metadata.generator.version) {
    throw new Error(
      `Expected ${metadata.generator.package} to be pinned exactly at ${metadata.generator.version}; found ${declaredGenerator ?? "no dependency"}`,
    );
  }

  if (declaredTypeScript !== metadata.generator.typescriptVersion) {
    throw new Error(
      `Expected the TypeScript printer to be pinned exactly at ${metadata.generator.typescriptVersion}; found ${declaredTypeScript ?? "no dependency"}`,
    );
  }

  const installedGeneratorPath = resolve(
    ROOT,
    "node_modules/openapi-typescript/package.json",
  );
  const installedGenerator = parseJson(
    await readFile(installedGeneratorPath),
    installedGeneratorPath,
  );

  if (installedGenerator.version !== metadata.generator.version) {
    throw new Error(
      `Installed ${metadata.generator.package} is ${installedGenerator.version}; run pnpm install to restore ${metadata.generator.version}`,
    );
  }
}

async function verifyReviewedSnapshot(metadata) {
  const bytes = await readFile(SNAPSHOT_PATH);
  const actualHash = hash(bytes);

  if (actualHash !== metadata.sha256) {
    throw new Error(
      [
        "The PieFed OpenAPI snapshot has unreviewed drift.",
        `Expected SHA-256: ${metadata.sha256}`,
        `Actual SHA-256:   ${actualHash}`,
        "Review the upstream change, then update schema-source.json before regenerating.",
      ].join("\n"),
    );
  }

  const snapshot = parseJson(bytes, SNAPSHOT_PATH);
  if (typeof snapshot.openapi !== "string" || snapshot.paths === undefined) {
    throw new Error(`${SNAPSHOT_PATH} is not an OpenAPI document`);
  }
}

const commands = {
  check,
  drift: checkDrift,
  generate,
};
const command = process.argv[2];

if (!(command in commands)) {
  console.error("Usage: node scripts/piefed-schema.mjs <check|drift|generate>");
  process.exitCode = 2;
} else {
  commands[command]().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

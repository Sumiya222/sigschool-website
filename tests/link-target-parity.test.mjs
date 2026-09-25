/**
 * Parity check between the two implementations of the link-target scheme
 * allowlist:
 *   - public.is_safe_link_target (Postgres) — the actual security boundary,
 *     enforced by CHECK constraints on page_sections, camp_window and
 *     job_applications. A direct API call cannot bypass this one.
 *   - isSafeLinkTarget (src/lib/link-target.ts) — a display-side guard used
 *     by the admin dashboard when deciding whether to render a stored value
 *     as a clickable link.
 *
 * These are two independent implementations of the same rule. This test
 * runs both against one shared case list (tests/link-target-cases.ts) and
 * fails if either diverges from `expected`, or if the two implementations
 * disagree with each other.
 *
 * The SQL side needs a real Postgres engine — a JS reimplementation of the
 * regex logic would not catch a real SQL bug (wrong regex dialect, operator
 * precedence, NULL-handling quirks, etc.). Rather than requiring Docker or a
 * live Supabase connection (both awkward in CI — Docker needs a service
 * container and port-wait logic; a live project needs a secret and a
 * network dependency on every run), this uses @electric-sql/pglite: a real
 * Postgres engine compiled to WASM that runs in-process. It is exactly as
 * "real" a database call as a network Postgres for the purposes of this
 * function (no Supabase-specific extensions or schemas are involved), but
 * needs no server, no Docker, and no secrets — in CI or locally.
 *
 * The SQL function body is not duplicated here: it's extracted verbatim
 * from the migration file(s) that define it, so this test always exercises
 * the exact SQL that ships to the real database, not a copy that could
 * drift out of sync.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { isSafeLinkTarget } from "../src/lib/link-target.ts";
import { LINK_TARGET_CASES } from "./link-target-cases.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");
const MARKER = "CREATE OR REPLACE FUNCTION public.is_safe_link_target";

/** Extracts every `CREATE OR REPLACE FUNCTION public.is_safe_link_target(...) ... $$;`
 * statement from the migrations directory, in filename (chronological) order,
 * so replaying them reproduces the function's current live definition. */
function extractSqlFunctionDefinitions() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const statements = [];
  for (const file of files) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    let searchFrom = 0;
    while (true) {
      const start = content.indexOf(MARKER, searchFrom);
      if (start === -1) break;
      const end = content.indexOf("$$;", start);
      if (end === -1) {
        throw new Error(
          `${file}: found CREATE OR REPLACE FUNCTION for is_safe_link_target with no closing $$; `,
        );
      }
      statements.push({ file, sql: content.slice(start, end + "$$;".length) });
      searchFrom = end + "$$;".length;
    }
  }
  if (statements.length === 0) {
    throw new Error(
      `No "${MARKER}" definition found anywhere under ${MIGRATIONS_DIR} — the SQL side of this test has nothing to run against.`,
    );
  }
  return statements;
}

async function main() {
  const definitions = extractSqlFunctionDefinitions();
  console.log(
    `Found ${definitions.length} definition(s) of is_safe_link_target across migrations:\n` +
      definitions.map((d) => `  - ${d.file}`).join("\n"),
  );

  const db = new PGlite();
  for (const { file, sql } of definitions) {
    try {
      await db.query(sql);
    } catch (err) {
      console.error(`Failed to apply is_safe_link_target definition from ${file}:`);
      throw err;
    }
  }

  const rows = [];
  let failed = false;

  for (const testCase of LINK_TARGET_CASES) {
    const tsResult = isSafeLinkTarget(testCase.input);
    const sqlRes = await db.query("SELECT is_safe_link_target($1::text) AS result", [
      testCase.input,
    ]);
    const sqlResult = sqlRes.rows[0].result;

    const tsOk = tsResult === testCase.expected;
    const sqlOk = sqlResult === testCase.expected;
    const agree = tsResult === sqlResult;
    const ok = tsOk && sqlOk && agree;
    if (!ok) failed = true;

    rows.push({
      case: testCase.label,
      input: JSON.stringify(testCase.input),
      expected: testCase.expected,
      ts: tsResult,
      sql: sqlResult,
      status: ok ? "OK" : "FAIL",
    });
  }

  console.table(rows);
  await db.close();

  if (failed) {
    console.error(
      "\nlink-target-parity FAILED — isSafeLinkTarget() (TS) and is_safe_link_target() (SQL) disagree, " +
        "or one of them disagrees with the expected value. See the FAIL rows above.",
    );
    process.exit(1);
  }

  console.log(
    `\nlink-target-parity OK — ${LINK_TARGET_CASES.length} cases agree across both implementations.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

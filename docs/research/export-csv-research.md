# Research: Easy PostgreSQL CSV Export

**Author:** @dwu0501  
**Sprint:** 4

---

## Summary

| Option | Recommendation | Reason |
|---|---|---|
| Reuse existing `pg` client/pool + small CSV helper | Recommended | Easiest path because the project already uses `pg` and only needs a lightweight utility to turn query rows into CSV |
| PostgreSQL `COPY ... TO STDOUT` | Future upgrade | Better for very large exports, but adds streaming complexity |
| Add `csv-writer` / `fast-csv` | Not needed for now | Helpful for advanced CSV behavior, but unnecessary for a simple export |
| Add ORM/export package | Not recommended | Adds unnecessary abstraction for a small utility |

---

## Decision

Use the existing **`pg`** setup and add a small local CSV export helper.

The project already has PostgreSQL access through `pg`, so we do not need another database package. `pg` query results already include a `rows` array, where each row is a JavaScript object keyed by column name.

The export flow should be:

```txt
Existing pg client or pool runs a SELECT query
pg returns result.rows
CSV helper converts rows into CSV text
App writes or returns the CSV
```

This keeps the implementation small and avoids adding unnecessary dependencies.

---

## Goal

The project needs an easy way to export PostgreSQL query results where:

- The app already uses `pg`
- The export logic is easy to reuse
- The implementation avoids extra dependencies
- The CSV includes column headers
- The export can be written to a file or returned from an API route
- The first version stays simple

This is not a full data pipeline. It is just a small utility for exporting `pg` query results.

---

## Recommended Approach

Add one helper that accepts rows from `pg` and converts them to CSV.

This keeps the helper independent from how the project connects to PostgreSQL.

The existing code can continue using:

- `pg.Client`
- `pg.Pool`
- Existing database wrapper
- Existing query utilities

---

## Code Implementation

Create:

```txt
src/utils/csv-export.js
```

```js
function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function rowsToCsv(rows, columns) {
  if (!Array.isArray(rows)) {
    throw new TypeError("rowsToCsv expected rows to be an array");
  }

  if (rows.length === 0) {
    return "";
  }

  const headers = columns || Object.keys(rows[0]);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ];

  return csvRows.join("\n");
}

module.exports = {
  rowsToCsv,
};
```

---

## Example Usage with Existing `pg` Pool

If the project already has a shared pool, use it directly.

Example:

```js
const { rowsToCsv } = require("./src/utils/csv-export");
const { pool } = require("./src/db");

async function exportUsers() {
  const result = await pool.query(`
    SELECT id, name, email, created_at
    FROM users
    ORDER BY id
  `);

  const csv = rowsToCsv(result.rows);

  return csv;
}
```

---

## Example: Write CSV to a File

```js
const fs = require("node:fs/promises");
const { rowsToCsv } = require("./src/utils/csv-export");
const { pool } = require("./src/db");

async function exportUsersToFile() {
  const result = await pool.query(`
    SELECT id, name, email, created_at
    FROM users
    ORDER BY id
  `);

  const csv = rowsToCsv(result.rows);

  await fs.writeFile("users.csv", csv);

  return {
    filePath: "users.csv",
    rowCount: result.rows.length,
  };
}

exportUsersToFile()
  .then((result) => {
    console.log(`Exported ${result.rowCount} rows to ${result.filePath}`);
  })
  .catch((error) => {
    console.error("Export failed:", error);
    process.exit(1);
  });
```

---

## Example: Return CSV from an Express Route

```js
const express = require("express");
const { rowsToCsv } = require("./src/utils/csv-export");
const { pool } = require("./src/db");

const router = express.Router();

router.get("/exports/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, created_at
      FROM users
      ORDER BY id
    `);

    const csv = rowsToCsv(result.rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");

    res.status(200).send(csv);
  } catch (error) {
    console.error("User export failed:", error);
    res.status(500).json({ error: "Failed to export users" });
  }
});

module.exports = router;
```

---

## Example: Control Column Order

By default, the helper uses the keys from the first row.

For more stable exports, pass the columns explicitly:

```js
const csv = rowsToCsv(result.rows, [
  "id",
  "name",
  "email",
  "created_at",
]);
```

This makes sure the CSV columns always appear in the same order.

---

## Example: Parameterized Export Query

Use normal `pg` parameters for filters.

```js
const result = await pool.query(
  `
    SELECT id, name, email, created_at
    FROM users
    WHERE created_at >= $1
    ORDER BY id
  `,
  ["2026-01-01"]
);

const csv = rowsToCsv(result.rows, [
  "id",
  "name",
  "email",
  "created_at",
]);
```

This avoids directly inserting user input into SQL.

---

## How CSV Escaping Works

CSV values need quotes when they contain:

- Commas
- Double quotes
- Newlines

Example value:

```txt
Wu, Daniel
```

Becomes:

```txt
"Wu, Daniel"
```

Example value:

```txt
Daniel "DW" Wu
```

Becomes:

```txt
"Daniel ""DW"" Wu"
```

The helper handles this automatically.

---

## Empty Results

If the query returns no rows, the helper returns an empty string.

```js
const csv = rowsToCsv([]);
```

Result:

```txt

```

If headers are required even when there are no rows, use this slightly modified version:

```js
function rowsToCsv(rows, columns) {
  if (!Array.isArray(rows)) {
    throw new TypeError("rowsToCsv expected rows to be an array");
  }

  const headers = columns || (rows[0] ? Object.keys(rows[0]) : []);

  if (headers.length === 0) {
    return "";
  }

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ];

  return csvRows.join("\n");
}
```

Then call it with explicit columns:

```js
const csv = rowsToCsv(result.rows, [
  "id",
  "name",
  "email",
  "created_at",
]);
```

---

## Recommended Final Helper

Use this version if the project wants headers even when there are zero rows:

```js
function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function rowsToCsv(rows, columns = []) {
  if (!Array.isArray(rows)) {
    throw new TypeError("rowsToCsv expected rows to be an array");
  }

  const headers = columns.length > 0 ? columns : rows[0] ? Object.keys(rows[0]) : [];

  if (headers.length === 0) {
    return "";
  }

  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ].join("\n");
}

module.exports = {
  rowsToCsv,
};
```

---

## Final Recommendation

Because the project already uses `pg`, the best implementation is:

```txt
Keep pg as-is
Add rowsToCsv helper
Use existing pool.query(...)
Return or write the CSV
```

No new package is needed.

For small and medium exports, this is enough.

For very large exports, consider PostgreSQL `COPY ... TO STDOUT` later. PostgreSQL documents that `COPY ... TO STDOUT` sends data through the client/server connection, which makes it better for streaming exports than loading all rows into memory. :contentReference[oaicite:1]{index=1}
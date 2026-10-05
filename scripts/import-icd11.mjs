import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!filePath) {
  throw new Error("Usage: npm run import:icd11 -- <path-to-csv>");
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");
}

function parseCsv(text) {
  const delimiter = (text.split(/\r?\n/, 1)[0].match(/;/g) || []).length >
    (text.split(/\r?\n/, 1)[0].match(/,/g) || []).length
    ? ";"
    : ",";
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      row.push(value);
      value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

const text = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
const [headerRow, ...dataRows] = parseCsv(text);
if (!headerRow) throw new Error("The CSV file is empty.");

const headers = headerRow.map((header) => header.trim().toLowerCase());
const column = (name) => headers.indexOf(name);
const codeIndex = column("code");
const labelIndex = column("label");
const categoryIndex = column("category_id");
const synonymsIndex = column("synonyms");
const releaseIndex = column("source_release");

if (codeIndex < 0 || labelIndex < 0) {
  throw new Error("CSV headers must include code and label. Optional headers: category_id, synonyms, source_release.");
}

const recordsByCode = new Map();
for (const [index, cells] of dataRows.entries()) {
  const lineNumber = index + 2;
  const code = (cells[codeIndex] || "").trim();
  const label = (cells[labelIndex] || "").trim();
  if (!code || !label) {
    throw new Error(`CSV line ${lineNumber} must contain both code and label.`);
  }
  if (recordsByCode.has(code)) {
    throw new Error(`Duplicate code "${code}" on CSV line ${lineNumber}.`);
  }

  recordsByCode.set(code, {
    code,
    label,
    category_id: categoryIndex < 0 ? null : (cells[categoryIndex] || "").trim() || null,
    synonyms: synonymsIndex < 0
      ? []
      : [...new Set((cells[synonymsIndex] || "").split("|").map((item) => item.trim()).filter(Boolean))],
    source: "ICD-11",
    source_release: releaseIndex < 0 ? null : (cells[releaseIndex] || "").trim() || null,
    updated_at: new Date().toISOString(),
  });
}

if (recordsByCode.size === 0) throw new Error("The CSV contains no clinical term rows.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const records = [...recordsByCode.values()];
for (let offset = 0; offset < records.length; offset += 500) {
  const { error } = await supabase
    .from("clinical_terms")
    .upsert(records.slice(offset, offset + 500), { onConflict: "code" });
  if (error) throw new Error(`Import failed at row ${offset + 1}: ${error.message}`);
}

console.log(`Imported ${records.length} ICD-11 clinical terms in batches of 500.`);

import { readFile } from "node:fs/promises";

const DICTIONARY_PATH = "data/israelite_dictionary.json";

function fail(message){
  console.error(`[validate:dict] ${message}`);
  process.exit(1);
}

let parsed;

try{
  const raw = await readFile(DICTIONARY_PATH, "utf8");
  parsed = JSON.parse(raw);
}catch(error){
  if (error.code === "ENOENT"){
    fail(`Missing ${DICTIONARY_PATH}`);
  }
  if (error instanceof SyntaxError){
    fail(`Invalid JSON in ${DICTIONARY_PATH}: ${error.message}`);
  }
  fail(`Unable to read ${DICTIONARY_PATH}: ${error.message}`);
}

if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)){
  fail(`${DICTIONARY_PATH} must be a JSON object.`);
}

if (!Array.isArray(parsed.entries)){
  fail(`${DICTIONARY_PATH} must contain an entries array.`);
}

const invalidIndex = parsed.entries.findIndex(entry =>
  !entry ||
  typeof entry !== "object" ||
  Array.isArray(entry) ||
  typeof entry.headword !== "string" ||
  entry.headword.trim().length === 0
);

if (invalidIndex !== -1){
  fail(`Entry ${invalidIndex + 1} must be an object with a non-empty headword string.`);
}

console.log(`[validate:dict] ${DICTIONARY_PATH} OK (${parsed.entries.length} entries)`);

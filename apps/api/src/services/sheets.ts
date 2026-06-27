import dotenv from "dotenv";
import path from "path";
import { google } from "googleapis";

dotenv.config();

console.log("Loaded env GOOGLE_SHEET_ID?", Boolean(process.env.GOOGLE_SHEET_ID));

const sheetId = process.env.GOOGLE_SHEET_ID;
const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

if (!sheetId) {
  throw new Error("Missing GOOGLE_SHEET_ID in .env");
}

if (!keyFile) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY_FILE in .env");
}

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), keyFile),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({
  version: "v4",
  auth
});

export async function readSheetValues(range: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });

  return response.data.values ?? [];
}

export async function readSheetObjects(range: string) {
  const rows = await readSheetValues(range);

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => String(header));

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = row[index] ? String(row[index]) : "";
    });

    return record;
  });
}

export async function appendSheetRow(range: string, row: unknown[]) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row]
    }
  });

  return response.data;
}

export async function updateSheetCell(sheetName: string, row: number, column: number, value: unknown) {
  const col = columnToLetters(column);
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!${col}${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] }
  });

  return response.data;
}

function columnToLetters(column: number) {
  let temp = column;
  let letters = "";
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    temp = Math.floor((temp - rem) / 26);
  }
  return letters;
}

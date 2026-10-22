import type { Player } from "./schema";

export type RosterResult = { players: Player[]; error?: string };

// Splits one CSV line, understanding "quoted, values".
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseRoster(fileName: string, text: string): RosterResult {
  if (!fileName.toLowerCase().endsWith(".csv")) {
    return { players: [], error: "That isn't a .csv file. Export your roster as CSV and try again." };
  }
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    return { players: [], error: "The roster is empty. It needs a header row plus at least one player." };
  }
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const nameCol = header.indexOf("name");
  const numCol = header.indexOf("number");
  if (nameCol === -1 || numCol === -1) {
    return {
      players: [],
      error: 'The first row must have the columns "name" and "number". Found: ' + (header.join(", ") || "nothing"),
    };
  }

  const players: Player[] = [];
  const names = new Set<string>();
  const numbers = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const name = (cells[nameCol] ?? "").trim();
    const number = (cells[numCol] ?? "").trim();
    const row = i + 1;
    if (!name || !number) return { players: [], error: `Row ${row} is missing a name or a number.` };
    if (names.has(name.toLowerCase())) return { players: [], error: `Row ${row}: "${name}" appears twice.` };
    if (numbers.has(number)) return { players: [], error: `Row ${row}: number ${number} is used by two players.` };
    names.add(name.toLowerCase());
    numbers.add(number);
    players.push({ name, number });
  }
  return { players };
}

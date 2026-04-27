/**
 * Script to convert HCM Keywords List CSV to TypeScript seed file.
 * Run: npx tsx lib/seo/seeds/scripts/genHomcKeywords.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const CSV_PATH = path.resolve(__dirname, '../../../../HCM Keywords List - Sheet1.csv');
const OUT_PATH = path.resolve(__dirname, '../homcKeywords.gen.ts');

const raw = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const header = lines[0].split(',').map((h) => h.trim());

// Expect: Keyword,Tag,Volume,KD,CPC
const kwIdx = header.indexOf('Keyword');
const tagIdx = header.indexOf('Tag');
const volIdx = header.indexOf('Volume');
const kdIdx = header.indexOf('KD');
const cpcIdx = header.indexOf('CPC');

if (kwIdx < 0 || tagIdx < 0) {
  console.error('CSV header mismatch:', header);
  process.exit(1);
}

const entries: string[] = [];

for (let i = 1; i < lines.length; i++) {
  // Handle commas inside quoted fields
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of lines[i]) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  parts.push(current.trim());

  const keyword = parts[kwIdx]?.replace(/"/g, '');
  const tag = parts[tagIdx]?.replace(/"/g, '') || 'generic';
  const volume = parseInt(parts[volIdx]) || null;
  const kd = parseInt(parts[kdIdx]) || null;
  const cpcRaw = parts[cpcIdx]?.trim();
  const cpc = cpcRaw ? parseFloat(cpcRaw) || null : null;

  if (!keyword) continue;

  const escaped = keyword.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const norm = keyword.toLowerCase().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const tagEsc = tag.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const completeness = [volume, kd, cpc].filter((v) => v !== null).length / 3;

  entries.push(
    `  { keywordId: '', workspaceId: 'homc-workspace', keyword: "${escaped}", normalizedKeyword: "${norm}", tag: "${tagEsc}", volume: ${volume}, kd: ${kd}, cpc: ${cpc}, sourceFile: 'HCM Keywords List.csv', uploadedAt: '2026-04-26T00:00:00Z', keywordListVersion: 1, status: 'active', dataCompleteness: ${completeness.toFixed(2)}, usage: { usedAsPrimaryCount: 0, usedAsSecondaryCount: 0, lastUsedAsPrimaryAt: null, lastUsedAsSecondaryAt: null, usedInContentIds: [] } }`
  );
}

const output = `// Auto-generated from HCM Keywords List CSV — DO NOT EDIT MANUALLY
// ${entries.length} keywords with tags, volume, KD, CPC

import type { WorkspaceKeyword } from '@/lib/seo/workspaceTypes';

export const HOMC_SEED_KEYWORDS: WorkspaceKeyword[] = [
${entries.join(',\n')},
];
`;

fs.writeFileSync(OUT_PATH, output, 'utf-8');
console.log(`✅ Generated ${entries.length} keywords → ${OUT_PATH}`);

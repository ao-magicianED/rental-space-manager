import type { CsvParser } from "./base-parser";
import { genericParser } from "./generic-parser";
import { instabaseParser } from "./instabase-parser";
import { spacemarketParser } from "./spacemarket-parser";
import { spaceeParser } from "./spacee-parser";

// 各プラットフォームのパーサー
export const parsers: Record<string, CsvParser> = {
  generic: genericParser,
  instabase: instabaseParser,
  spacemarket: spacemarketParser,
  spacee: spaceeParser,
  // upnow: upnowParser,              // 後で実装
  // yoyakuru: yoyakuruParser,        // 後で実装
  // direct: directParser,            // 後で実装
};

export function getParser(platformCode: string): CsvParser | undefined {
  return parsers[platformCode];
}

export function getAllParsers(): CsvParser[] {
  return Object.values(parsers);
}

export * from "./base-parser";
export { genericParser };
export { instabaseParser };
export { spacemarketParser };
export { spaceeParser };

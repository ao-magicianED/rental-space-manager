import { spacemarketParser } from "../parsers/spacemarket-parser";
import { db } from "../db";
import { platforms, platformMappings, rooms, bookings, importLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import crypto from "crypto";
import path from "path";

const csvPath = path.join(process.cwd(), "data/raw/spacemarket/貸会議室管理表 - スペースマーケット貼り付け.csv");
const csvContent = fs.readFileSync(csvPath, "utf-8");

async function importSpacemarket() {
  console.log("=== スペースマーケットCSVインポート ===");

  // パース
  const parseResult = spacemarketParser.parse(csvContent);
  console.log(`パース完了: ${parseResult.bookings.length}件`);
  console.log(`警告: ${parseResult.warnings.length}件`);
  console.log(`エラー: ${parseResult.errors.length}件`);

  // プラットフォームID取得
  const platform = await db
    .select()
    .from(platforms)
    .where(eq(platforms.code, "spacemarket"))
    .limit(1);

  if (platform.length === 0) {
    console.error("スペースマーケットのプラットフォームが見つかりません");
    return;
  }
  const platformId = platform[0].id;
  console.log(`Platform ID: ${platformId}`);

  // マッピング取得
  const mappings = await db
    .select()
    .from(platformMappings)
    .where(eq(platformMappings.platformId, platformId));

  console.log(`マッピング: ${mappings.length}件`);
  mappings.forEach((m) =>
    console.log(`  ${m.platformPropertyName} -> propertyId:${m.propertyId} roomId:${m.roomId}`)
  );

  // 部屋情報取得
  const allRooms = await db.select().from(rooms);

  // 既存の予約ID取得（重複チェック用）
  const existingBookingIds = new Set(
    (await db.select({ id: bookings.platformBookingId }).from(bookings))
      .map((b) => b.id)
      .filter((id): id is string => id !== null)
  );
  console.log(`既存予約: ${existingBookingIds.size}件`);

  // 変換
  const bookingsToInsert: Array<typeof bookings.$inferInsert> = [];
  const skipped: string[] = [];
  const unmapped: string[] = [];

  for (const parsed of parseResult.bookings as Array<
    (typeof parseResult.bookings)[0] & { spaceName?: string }
  >) {
    const { platformPropertyName, booking } = parsed;

    // 重複チェック
    if (booking.platformBookingId && existingBookingIds.has(booking.platformBookingId)) {
      skipped.push(booking.platformBookingId);
      continue;
    }

    let propertyId: number | null = null;
    let roomId: number | null = null;

    const mapping = mappings.find((m) => m.platformPropertyName === platformPropertyName);
    if (mapping) {
      propertyId = mapping.propertyId;
      roomId = mapping.roomId;
    }

    if (!propertyId) {
      if (!unmapped.includes(platformPropertyName)) {
        unmapped.push(platformPropertyName);
      }
      continue;
    }

    bookingsToInsert.push({
      propertyId,
      roomId,
      platformId,
      bookingDate: booking.bookingDate,
      usageDate: booking.usageDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationMinutes: booking.durationMinutes,
      grossAmount: booking.grossAmount,
      netAmount: booking.netAmount,
      commission: booking.commission,
      platformBookingId: booking.platformBookingId,
      guestName: booking.guestName,
      status: booking.status,
      usagePurpose: booking.usagePurpose,
      usageDetail: booking.usageDetail,
      guestCount: booking.guestCount,
    });
  }

  console.log(`\n--- 結果 ---`);
  console.log(`挿入対象: ${bookingsToInsert.length}件`);
  console.log(`重複スキップ: ${skipped.length}件`);
  console.log(`未マッピング: ${unmapped.length > 0 ? unmapped.join(", ") : "なし"}`);

  // 挿入
  let insertedCount = 0;
  const chunkSize = 100;
  for (let i = 0; i < bookingsToInsert.length; i += chunkSize) {
    const chunk = bookingsToInsert.slice(i, i + chunkSize);
    await db.insert(bookings).values(chunk);
    insertedCount += chunk.length;
    process.stdout.write(".");
  }
  console.log("");
  console.log(`挿入完了: ${insertedCount}件`);

  // インポートログ
  const fileHash = crypto.createHash("md5").update(csvContent).digest("hex");
  await db.insert(importLogs).values({
    platformId,
    fileName: "spacemarket-all.csv",
    fileHash,
    recordCount: insertedCount,
    status: "success",
  });

  console.log("\n=== インポート完了 ===");
}

importSpacemarket().catch(console.error);

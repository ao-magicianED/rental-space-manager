import express from "express";
import cors from "cors";
import crypto from "crypto";
import { db } from "./db";
import {
  platforms,
  properties,
  rooms,
  platformMappings,
  bookings,
  expenses,
  importLogs,
  propertyProspects,
} from "./db/schema";
import { extractMaisokuData, calculatePricePerUnit } from "./services/ocr-service";
import { runSimulation, getPerformanceSummary } from "./services/simulation-engine";
import {
  getStationInfo,
  getNearbyCompanies,
  calculateLocationScore,
  getLocationRank,
  getLocationMultiplier,
  generateLocationAnalysis,
} from "./services/location-service";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { getParser } from "./parsers";
import type { ParsedBooking } from "./parsers";

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// ========================================
// プラットフォームAPI
// ========================================
app.get("/api/platforms", async (_req, res) => {
  try {
    const result = await db.select().from(platforms);
    res.json(result);
  } catch (error) {
    console.error("Error fetching platforms:", error);
    res.status(500).json({ error: "Failed to fetch platforms" });
  }
});

// ========================================
// 施設API
// ========================================
app.get("/api/properties", async (_req, res) => {
  try {
    const result = await db.select().from(properties);
    res.json(result);
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

app.post("/api/properties", async (req, res) => {
  try {
    const result = await db.insert(properties).values(req.body).returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

app.put("/api/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .update(properties)
      .set({ ...req.body, updatedAt: new Date().toISOString() })
      .where(eq(properties.id, parseInt(id)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating property:", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

// ========================================
// 部屋API
// ========================================
app.get("/api/rooms", async (req, res) => {
  try {
    const { propertyId } = req.query;
    let query = db.select().from(rooms);
    if (propertyId) {
      query = query.where(eq(rooms.propertyId, parseInt(propertyId as string)));
    }
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// ========================================
// マッピングAPI
// ========================================
app.get("/api/mappings", async (_req, res) => {
  try {
    const result = await db.select().from(platformMappings);
    res.json(result);
  } catch (error) {
    console.error("Error fetching mappings:", error);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

app.post("/api/mappings", async (req, res) => {
  try {
    const result = await db.insert(platformMappings).values(req.body).returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error creating mapping:", error);
    res.status(500).json({ error: "Failed to create mapping" });
  }
});

// ========================================
// 予約（売上）API
// ========================================
app.get("/api/bookings", async (req, res) => {
  try {
    const { startDate, endDate, propertyId, platformId } = req.query;

    let conditions = [];

    if (startDate) {
      conditions.push(gte(bookings.usageDate, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(bookings.usageDate, endDate as string));
    }
    if (propertyId) {
      conditions.push(eq(bookings.propertyId, parseInt(propertyId as string)));
    }
    if (platformId) {
      conditions.push(eq(bookings.platformId, parseInt(platformId as string)));
    }

    let query = db.select().from(bookings).orderBy(desc(bookings.usageDate));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.post("/api/bookings/bulk", async (req, res) => {
  try {
    const { bookings: bookingData } = req.body;
    const result = await db.insert(bookings).values(bookingData).returning();
    res.json({ inserted: result.length });
  } catch (error) {
    console.error("Error inserting bookings:", error);
    res.status(500).json({ error: "Failed to insert bookings" });
  }
});

// ========================================
// 経費API
// ========================================
app.get("/api/expenses", async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    let conditions = [];

    if (startDate) {
      conditions.push(gte(expenses.expenseDate, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(expenses.expenseDate, endDate as string));
    }
    if (propertyId) {
      conditions.push(eq(expenses.propertyId, parseInt(propertyId as string)));
    }

    let query = db.select().from(expenses).orderBy(desc(expenses.expenseDate));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const result = await db.insert(expenses).values(req.body).returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// ========================================
// ダッシュボード集計API
// ========================================
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 売上合計
    const salesResult = await db
      .select({
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        totalNet: sql<number>`COALESCE(SUM(${bookings.netAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          startDate ? gte(bookings.usageDate, startDate as string) : undefined,
          endDate ? lte(bookings.usageDate, endDate as string) : undefined,
          eq(bookings.status, "confirmed")
        )
      );

    // 経費合計
    const expenseResult = await db
      .select({
        totalExpense: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          startDate ? gte(expenses.expenseDate, startDate as string) : undefined,
          endDate ? lte(expenses.expenseDate, endDate as string) : undefined
        )
      );

    // 施設別売上
    const salesByProperty = await db
      .select({
        propertyId: bookings.propertyId,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          startDate ? gte(bookings.usageDate, startDate as string) : undefined,
          endDate ? lte(bookings.usageDate, endDate as string) : undefined,
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(bookings.propertyId);

    // プラットフォーム別売上
    const salesByPlatform = await db
      .select({
        platformId: bookings.platformId,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          startDate ? gte(bookings.usageDate, startDate as string) : undefined,
          endDate ? lte(bookings.usageDate, endDate as string) : undefined,
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(bookings.platformId);

    const summary = {
      totalGross: salesResult[0]?.totalGross || 0,
      totalNet: salesResult[0]?.totalNet || 0,
      bookingCount: salesResult[0]?.bookingCount || 0,
      totalExpense: expenseResult[0]?.totalExpense || 0,
      grossProfit:
        (salesResult[0]?.totalNet || 0) - (expenseResult[0]?.totalExpense || 0),
      salesByProperty,
      salesByPlatform,
    };

    res.json(summary);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// 日別売上推移
app.get("/api/dashboard/daily-sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await db
      .select({
        date: bookings.usageDate,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          startDate ? gte(bookings.usageDate, startDate as string) : undefined,
          endDate ? lte(bookings.usageDate, endDate as string) : undefined,
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(bookings.usageDate)
      .orderBy(bookings.usageDate);

    res.json(result);
  } catch (error) {
    console.error("Error fetching daily sales:", error);
    res.status(500).json({ error: "Failed to fetch daily sales" });
  }
});

// 時間帯別ヒートマップ用データ
app.get("/api/dashboard/hourly-heatmap", async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];

    if (startDate) {
      conditions.push(gte(bookings.usageDate, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(bookings.usageDate, endDate as string));
    }
    if (propertyId) {
      conditions.push(eq(bookings.propertyId, parseInt(propertyId as string)));
    }

    const result = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${bookings.usageDate}) AS INTEGER)`,
        hour: sql<number>`CAST(substr(${bookings.startTime}, 1, 2) AS INTEGER)`,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(
        sql`strftime('%w', ${bookings.usageDate})`,
        sql`substr(${bookings.startTime}, 1, 2)`
      );

    res.json(result);
  } catch (error) {
    console.error("Error fetching hourly heatmap:", error);
    res.status(500).json({ error: "Failed to fetch hourly heatmap" });
  }
});

// インポート履歴API
app.get("/api/import-logs", async (_req, res) => {
  try {
    const result = await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.importedAt))
      .limit(50);
    res.json(result);
  } catch (error) {
    console.error("Error fetching import logs:", error);
    res.status(500).json({ error: "Failed to fetch import logs" });
  }
});

app.post("/api/import-logs", async (req, res) => {
  try {
    const result = await db.insert(importLogs).values(req.body).returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error creating import log:", error);
    res.status(500).json({ error: "Failed to create import log" });
  }
});

// ========================================
// CSVインポートAPI
// ========================================
app.post("/api/import/csv", express.text({ type: "*/*", limit: "50mb" }), async (req, res) => {
  try {
    const { platformCode, fileName } = req.query;
    const csvContent = req.body as string;

    if (!platformCode || typeof platformCode !== "string") {
      return res.status(400).json({ error: "platformCode is required" });
    }

    if (!csvContent) {
      return res.status(400).json({ error: "CSV content is required" });
    }

    // パーサー取得
    const parser = getParser(platformCode);
    if (!parser) {
      return res.status(400).json({ error: `Unknown platform: ${platformCode}` });
    }

    // プラットフォームID取得
    const platform = await db
      .select()
      .from(platforms)
      .where(eq(platforms.code, platformCode))
      .limit(1);

    if (platform.length === 0) {
      return res.status(400).json({ error: `Platform not found: ${platformCode}` });
    }
    const platformId = platform[0].id;

    // CSVパース
    const parseResult = parser.parse(csvContent);

    if (!parseResult.success && parseResult.errors.length > 0) {
      return res.status(400).json({
        error: "CSV parse failed",
        details: parseResult.errors,
      });
    }

    // マッピング情報を取得
    const mappings = await db
      .select()
      .from(platformMappings)
      .where(eq(platformMappings.platformId, platformId));

    // 部屋情報を取得（上野駅前用）
    const allRooms = await db.select().from(rooms);

    // 既存の予約ID取得（重複チェック用）
    const existingBookingIds = new Set(
      (await db.select({ id: bookings.platformBookingId }).from(bookings))
        .map((b) => b.id)
        .filter((id): id is string => id !== null)
    );

    // 予約データを変換
    const bookingsToInsert: Array<typeof bookings.$inferInsert> = [];
    const skipped: string[] = [];
    const unmapped: string[] = [];

    for (const parsed of parseResult.bookings as Array<ParsedBooking & { spaceName?: string }>) {
      const { platformPropertyName, booking, spaceName } = parsed;

      // 重複チェック
      if (booking.platformBookingId && existingBookingIds.has(booking.platformBookingId)) {
        skipped.push(booking.platformBookingId);
        continue;
      }

      // マッピングから施設IDと部屋IDを解決
      let propertyId: number | null = null;
      let roomId: number | null = null;

      // 上野駅前の場合、スペース名で部屋を判別
      if (platformPropertyName.includes("上野駅前4A&4B")) {
        const mapping4A = mappings.find(
          (m) => m.platformPropertyName === platformPropertyName && m.roomId !== null
        );
        if (mapping4A) {
          propertyId = mapping4A.propertyId;
          // スペース名で4A/4B判別
          if (spaceName && spaceName.startsWith("4A")) {
            const room4A = allRooms.find((r) => r.code === "P002-4A");
            roomId = room4A?.id || null;
          } else if (spaceName && spaceName.startsWith("4B")) {
            const room4B = allRooms.find((r) => r.code === "P002-4B");
            roomId = room4B?.id || null;
          }
        }
      } else {
        // 通常の施設マッピング
        const mapping = mappings.find((m) => m.platformPropertyName === platformPropertyName);
        if (mapping) {
          propertyId = mapping.propertyId;
          roomId = mapping.roomId;
        }
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
        // 分析用データ
        usagePurpose: booking.usagePurpose,
        usageDetail: booking.usageDetail,
        guestCount: booking.guestCount,
      });
    }

    // DBに一括挿入
    let insertedCount = 0;
    if (bookingsToInsert.length > 0) {
      // 100件ずつ分割して挿入
      const chunkSize = 100;
      for (let i = 0; i < bookingsToInsert.length; i += chunkSize) {
        const chunk = bookingsToInsert.slice(i, i + chunkSize);
        await db.insert(bookings).values(chunk);
        insertedCount += chunk.length;
      }
    }

    // インポートログを記録
    const fileHash = crypto.createHash("md5").update(csvContent).digest("hex");
    await db.insert(importLogs).values({
      platformId,
      fileName: (fileName as string) || "upload.csv",
      fileHash,
      recordCount: insertedCount,
      status: insertedCount > 0 ? "success" : "partial",
      errorMessage: unmapped.length > 0 ? `未マッピング施設: ${unmapped.join(", ")}` : null,
    });

    res.json({
      success: true,
      inserted: insertedCount,
      skipped: skipped.length,
      unmapped,
      warnings: parseResult.warnings,
      errors: parseResult.errors,
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    res.status(500).json({ error: "Failed to import CSV", details: String(error) });
  }
});

// ========================================
// 分析API
// ========================================

// 時間帯ヒートマップ（曜日 × 時間）
app.get("/api/analytics/heatmap/hourly", async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));
    if (propertyId) conditions.push(eq(bookings.propertyId, parseInt(propertyId as string)));

    const result = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${bookings.usageDate}) AS INTEGER)`,
        hour: sql<number>`CAST(substr(${bookings.startTime}, 1, 2) AS INTEGER)`,
        bookingCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${bookings.durationMinutes}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(
        sql`strftime('%w', ${bookings.usageDate})`,
        sql`substr(${bookings.startTime}, 1, 2)`
      );

    res.json({ data: result });
  } catch (error) {
    console.error("Error fetching hourly heatmap:", error);
    res.status(500).json({ error: "Failed to fetch hourly heatmap" });
  }
});

// 月次ヒートマップ（施設 × 月）
app.get("/api/analytics/heatmap/monthly", async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear().toString();

    const result = await db
      .select({
        propertyId: bookings.propertyId,
        month: sql<number>`CAST(strftime('%m', ${bookings.usageDate}) AS INTEGER)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          sql`strftime('%Y', ${bookings.usageDate}) = ${targetYear}`
        )
      )
      .groupBy(bookings.propertyId, sql`strftime('%m', ${bookings.usageDate})`);

    const propertiesList = await db.select().from(properties);

    res.json({ data: result, properties: propertiesList });
  } catch (error) {
    console.error("Error fetching monthly heatmap:", error);
    res.status(500).json({ error: "Failed to fetch monthly heatmap" });
  }
});

// 用途別分析
app.get("/api/analytics/usage", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));

    const result = await db
      .select({
        purpose: bookings.usagePurpose,
        bookingCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${bookings.durationMinutes}), 0)`,
        totalGuests: sql<number>`COALESCE(SUM(${bookings.guestCount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(bookings.usagePurpose)
      .orderBy(sql`SUM(${bookings.grossAmount}) DESC`);

    // 合計を計算
    const totals = await db
      .select({
        totalBookings: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions));

    res.json({
      data: result,
      totalBookings: totals[0]?.totalBookings || 0,
      totalAmount: totals[0]?.totalAmount || 0,
    });
  } catch (error) {
    console.error("Error fetching usage analytics:", error);
    res.status(500).json({ error: "Failed to fetch usage analytics" });
  }
});

// 用途×時間帯クロス分析
app.get("/api/analytics/usage-by-time", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));

    const result = await db
      .select({
        purpose: bookings.usagePurpose,
        hour: sql<number>`CAST(substr(${bookings.startTime}, 1, 2) AS INTEGER)`,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(bookings.usagePurpose, sql`substr(${bookings.startTime}, 1, 2)`)
      .orderBy(bookings.usagePurpose, sql`substr(${bookings.startTime}, 1, 2)`);

    res.json({ data: result });
  } catch (error) {
    console.error("Error fetching usage by time:", error);
    res.status(500).json({ error: "Failed to fetch usage by time" });
  }
});

// 人数帯別分析
app.get("/api/analytics/guest-count", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));

    // 人数帯別に集計
    const result = await db
      .select({
        guestRange: sql<string>`CASE
          WHEN ${bookings.guestCount} BETWEEN 1 AND 5 THEN '1-5人'
          WHEN ${bookings.guestCount} BETWEEN 6 AND 10 THEN '6-10人'
          WHEN ${bookings.guestCount} BETWEEN 11 AND 20 THEN '11-20人'
          WHEN ${bookings.guestCount} > 20 THEN '21人以上'
          ELSE '未設定'
        END`,
        bookingCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(sql`CASE
        WHEN ${bookings.guestCount} BETWEEN 1 AND 5 THEN '1-5人'
        WHEN ${bookings.guestCount} BETWEEN 6 AND 10 THEN '6-10人'
        WHEN ${bookings.guestCount} BETWEEN 11 AND 20 THEN '11-20人'
        WHEN ${bookings.guestCount} > 20 THEN '21人以上'
        ELSE '未設定'
      END`)
      .orderBy(sql`MIN(${bookings.guestCount})`);

    // 平均人数
    const avgGuests = await db
      .select({
        avgGuestCount: sql<number>`COALESCE(AVG(${bookings.guestCount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions, sql`${bookings.guestCount} IS NOT NULL`));

    res.json({
      data: result,
      avgGuestCount: avgGuests[0]?.avgGuestCount || 0,
    });
  } catch (error) {
    console.error("Error fetching guest count analytics:", error);
    res.status(500).json({ error: "Failed to fetch guest count analytics" });
  }
});

// KPI一括取得
app.get("/api/analytics/kpi", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));

    // 基本売上指標
    const revenue = await db
      .select({
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        totalNet: sql<number>`COALESCE(SUM(${bookings.netAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
        totalDuration: sql<number>`COALESCE(SUM(${bookings.durationMinutes}), 0)`,
        totalGuests: sql<number>`COALESCE(SUM(${bookings.guestCount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions));

    // ユニーク顧客数とリピート率
    const customerStats = await db
      .select({
        uniqueGuests: sql<number>`COUNT(DISTINCT ${bookings.guestName})`,
        repeatGuests: sql<number>`COUNT(DISTINCT CASE WHEN guest_count > 1 THEN ${bookings.guestName} END)`,
      })
      .from(
        db
          .select({
            guestName: bookings.guestName,
            guest_count: sql<number>`COUNT(*)`.as("guest_count"),
          })
          .from(bookings)
          .where(and(...conditions, sql`${bookings.guestName} IS NOT NULL`))
          .groupBy(bookings.guestName)
          .as("guest_counts")
      );

    // リピーター数（2回以上予約した顧客）
    const repeatersResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(
        db
          .select({
            guestName: bookings.guestName,
            bookingCount: sql<number>`COUNT(*)`,
          })
          .from(bookings)
          .where(and(...conditions, sql`${bookings.guestName} IS NOT NULL`))
          .groupBy(bookings.guestName)
          .having(sql`COUNT(*) >= 2`)
          .as("repeaters")
      );

    // 曜日別集計
    const dayOfWeekStats = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${bookings.usageDate}) AS INTEGER)`,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(sql`strftime('%w', ${bookings.usageDate})`)
      .orderBy(sql`COUNT(*) DESC`);

    // 時間帯別集計
    const hourStats = await db
      .select({
        hour: sql<number>`CAST(substr(${bookings.startTime}, 1, 2) AS INTEGER)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(sql`substr(${bookings.startTime}, 1, 2)`)
      .orderBy(sql`COUNT(*) DESC`);

    // 月別売上（季節性）
    const monthlyStats = await db
      .select({
        month: sql<number>`CAST(strftime('%m', ${bookings.usageDate}) AS INTEGER)`,
        total: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(sql`strftime('%m', ${bookings.usageDate})`)
      .orderBy(sql`strftime('%m', ${bookings.usageDate})`);

    // 施設数と部屋数を取得
    const propertyCount = await db.select({ count: sql<number>`COUNT(*)` }).from(properties);
    const roomCount = await db.select({ count: sql<number>`COUNT(*)` }).from(rooms);

    // 稼働可能時間の計算（営業時間12時間/日と仮定）
    const totalRooms = (propertyCount[0]?.count || 0) + (roomCount[0]?.count || 0);
    const daysInPeriod = startDate && endDate
      ? Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 30;
    const availableMinutes = totalRooms * daysInPeriod * 12 * 60; // 12時間/日

    const totalRevenue = revenue[0]?.totalGross || 0;
    const totalBookings = revenue[0]?.bookingCount || 0;
    const totalDuration = revenue[0]?.totalDuration || 0;
    const totalGuests = revenue[0]?.totalGuests || 0;
    const uniqueGuests = customerStats[0]?.uniqueGuests || 0;
    const repeatGuests = repeatersResult[0]?.count || 0;

    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const peakDays = dayOfWeekStats.slice(0, 2).map(d => dayNames[d.dayOfWeek]);
    const offPeakDays = dayOfWeekStats.slice(-2).map(d => dayNames[d.dayOfWeek]);
    const peakHours = hourStats.slice(0, 3).map(h => h.hour);
    const offPeakHours = hourStats.slice(-3).map(h => h.hour);

    // 平日/休日比率
    const weekdayTotal = dayOfWeekStats
      .filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5)
      .reduce((sum, d) => sum + d.total, 0);
    const weekendTotal = dayOfWeekStats
      .filter(d => d.dayOfWeek === 0 || d.dayOfWeek === 6)
      .reduce((sum, d) => sum + d.total, 0);

    res.json({
      revenue: {
        total: totalRevenue,
        net: revenue[0]?.totalNet || 0,
      },
      customer: {
        uniqueGuests,
        repeatGuests,
        repeatRate: uniqueGuests > 0 ? (repeatGuests / uniqueGuests) * 100 : 0,
        avgBookingsPerGuest: uniqueGuests > 0 ? totalBookings / uniqueGuests : 0,
        estimatedLtv: uniqueGuests > 0
          ? (totalRevenue / uniqueGuests) * (1 + repeatGuests / Math.max(uniqueGuests, 1))
          : 0,
      },
      occupancy: {
        availableMinutes,
        usedMinutes: totalDuration,
        occupancyRate: availableMinutes > 0 ? (totalDuration / availableMinutes) * 100 : 0,
        avgDailyBookings: daysInPeriod > 0 ? totalBookings / daysInPeriod : 0,
      },
      pricing: {
        avgPerBooking: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        avgPerHour: totalDuration > 0 ? (totalRevenue / totalDuration) * 60 : 0,
        avgPerGuest: totalGuests > 0 ? totalRevenue / totalGuests : 0,
        revPAR: availableMinutes > 0 ? (totalRevenue / availableMinutes) * 60 : 0,
      },
      demand: {
        peakDays,
        offPeakDays,
        peakHours,
        offPeakHours,
        weekdayWeekendRatio: weekendTotal > 0 ? weekdayTotal / weekendTotal : 0,
      },
      seasonality: {
        monthly: monthlyStats,
      },
    });
  } catch (error) {
    console.error("Error fetching KPI:", error);
    res.status(500).json({ error: "Failed to fetch KPI" });
  }
});

// ========================================
// リードタイム分析API
// ========================================

// リードタイム分析（予約日から利用日までの日数）
app.get("/api/analytics/lead-time", async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    let conditions = [
      eq(bookings.status, "confirmed"),
      sql`${bookings.bookingDate} IS NOT NULL`,
    ];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));
    if (propertyId) conditions.push(eq(bookings.propertyId, parseInt(propertyId as string)));

    // リードタイム分布（0-30日）
    const distribution = await db
      .select({
        leadTimeDays: sql<number>`CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(sql`CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER)`)
      .orderBy(sql`CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER)`);

    // 用途別平均リードタイム
    const byPurpose = await db
      .select({
        purpose: bookings.usagePurpose,
        avgLeadTime: sql<number>`AVG(CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS REAL))`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions, sql`${bookings.usagePurpose} IS NOT NULL`))
      .groupBy(bookings.usagePurpose)
      .orderBy(sql`AVG(CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS REAL))`);

    // 曜日別平均リードタイム
    const byDayOfWeek = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${bookings.usageDate}) AS INTEGER)`,
        avgLeadTime: sql<number>`AVG(CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS REAL))`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(sql`strftime('%w', ${bookings.usageDate})`)
      .orderBy(sql`strftime('%w', ${bookings.usageDate})`);

    // 全体統計
    const overallStats = await db
      .select({
        avgLeadTime: sql<number>`AVG(CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS REAL))`,
        totalBookings: sql<number>`COUNT(*)`,
        lastMinuteCount: sql<number>`SUM(CASE WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 3 THEN 1 ELSE 0 END)`,
        earlyBirdCount: sql<number>`SUM(CASE WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) >= 14 THEN 1 ELSE 0 END)`,
      })
      .from(bookings)
      .where(and(...conditions));

    const totalBookings = overallStats[0]?.totalBookings || 0;

    res.json({
      distribution,
      byPurpose,
      byDayOfWeek,
      insights: {
        avgLeadTime: overallStats[0]?.avgLeadTime || 0,
        lastMinuteRate: totalBookings > 0 ? (overallStats[0]?.lastMinuteCount || 0) / totalBookings : 0,
        earlyBirdRate: totalBookings > 0 ? (overallStats[0]?.earlyBirdCount || 0) / totalBookings : 0,
        lastMinuteCount: overallStats[0]?.lastMinuteCount || 0,
        earlyBirdCount: overallStats[0]?.earlyBirdCount || 0,
        totalBookings,
      },
    });
  } catch (error) {
    console.error("Error fetching lead time analytics:", error);
    res.status(500).json({ error: "Failed to fetch lead time analytics" });
  }
});

// 価格最適化レコメンドAPI
app.get("/api/analytics/price-recommendations", async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    let conditions = [eq(bookings.status, "confirmed")];
    if (startDate) conditions.push(gte(bookings.usageDate, startDate as string));
    if (endDate) conditions.push(lte(bookings.usageDate, endDate as string));
    if (propertyId) conditions.push(eq(bookings.propertyId, parseInt(propertyId as string)));

    // 曜日×時間帯別の稼働率と単価を計算
    const slotStats = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${bookings.usageDate}) AS INTEGER)`,
        hour: sql<number>`CAST(substr(${bookings.startTime}, 1, 2) AS INTEGER)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
        totalAmount: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${bookings.durationMinutes}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions))
      .groupBy(
        sql`strftime('%w', ${bookings.usageDate})`,
        sql`substr(${bookings.startTime}, 1, 2)`
      )
      .orderBy(sql`COUNT(*) DESC`);

    // リードタイム別単価
    const leadTimeStats = await db
      .select({
        leadTimeRange: sql<string>`CASE
          WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 1 THEN '当日-翌日'
          WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 3 THEN '2-3日前'
          WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 7 THEN '4-7日前'
          WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 14 THEN '1-2週間前'
          ELSE '2週間以上前'
        END`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(and(...conditions, sql`${bookings.bookingDate} IS NOT NULL`))
      .groupBy(sql`CASE
        WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 1 THEN '当日-翌日'
        WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 3 THEN '2-3日前'
        WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 7 THEN '4-7日前'
        WHEN CAST(julianday(${bookings.usageDate}) - julianday(${bookings.bookingDate}) AS INTEGER) <= 14 THEN '1-2週間前'
        ELSE '2週間以上前'
      END`);

    // 全体平均
    const overallAvg = await db
      .select({
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
        totalBookings: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(and(...conditions));

    const avgAmount = overallAvg[0]?.avgAmount || 0;
    const totalBookings = overallAvg[0]?.totalBookings || 0;

    // 日付範囲から期間を計算
    const daysInPeriod = startDate && endDate
      ? Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 365;

    // 週数を計算
    const weeksInPeriod = Math.ceil(daysInPeriod / 7);

    // 期待される予約数（各スロットに対して週数分）
    const expectedBookingsPerSlot = weeksInPeriod;

    // レコメンド生成
    const recommendations: Array<{
      type: "INCREASE" | "DECREASE" | "MAINTAIN";
      target: string;
      dayOfWeek: number;
      hour: number;
      currentBookings: number;
      avgAmount: number;
      occupancyRate: number;
      reason: string;
      suggestedAction: string;
      confidence: number;
    }> = [];

    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

    for (const slot of slotStats) {
      const occupancyRate = expectedBookingsPerSlot > 0
        ? (slot.bookingCount / expectedBookingsPerSlot) * 100
        : 0;

      const target = `${dayNames[slot.dayOfWeek]}曜${slot.hour}時`;

      if (occupancyRate >= 80 && slot.avgAmount <= avgAmount * 1.1) {
        // 高稼働 & 平均以下の単価 → 値上げ推奨
        recommendations.push({
          type: "INCREASE",
          target,
          dayOfWeek: slot.dayOfWeek,
          hour: slot.hour,
          currentBookings: slot.bookingCount,
          avgAmount: slot.avgAmount,
          occupancyRate,
          reason: `稼働率${occupancyRate.toFixed(0)}%と高稼働だが、単価が平均程度`,
          suggestedAction: `10-20%の値上げを検討（${Math.round(slot.avgAmount * 1.15)}円程度）`,
          confidence: Math.min(0.9, occupancyRate / 100),
        });
      } else if (occupancyRate <= 30 && slot.bookingCount >= 2) {
        // 低稼働 → 値下げ推奨
        recommendations.push({
          type: "DECREASE",
          target,
          dayOfWeek: slot.dayOfWeek,
          hour: slot.hour,
          currentBookings: slot.bookingCount,
          avgAmount: slot.avgAmount,
          occupancyRate,
          reason: `稼働率${occupancyRate.toFixed(0)}%と低稼働、需要喚起が必要`,
          suggestedAction: `10-15%の値下げを検討（${Math.round(slot.avgAmount * 0.9)}円程度）`,
          confidence: 0.7,
        });
      }
    }

    // ダイナミックプライシングルールの提案
    const dynamicPricingRules = [
      {
        condition: "リードタイム1日以内 & 土日祝",
        multiplier: 1.2,
        reason: "直前予約は需要が高い傾向",
      },
      {
        condition: "リードタイム14日以上 & 平日",
        multiplier: 0.9,
        reason: "早期予約割引で平日稼働率向上",
      },
      {
        condition: "土曜13-18時",
        multiplier: 1.15,
        reason: "週末午後はピーク時間帯",
      },
      {
        condition: "火・水曜9-12時",
        multiplier: 0.85,
        reason: "平日午前は稼働率が低い傾向",
      },
    ];

    res.json({
      recommendations: recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 10),
      slotStats: slotStats.slice(0, 20),
      leadTimeStats,
      dynamicPricingRules,
      summary: {
        avgAmount,
        totalBookings,
        highOccupancySlots: slotStats.filter(s => (s.bookingCount / expectedBookingsPerSlot) * 100 >= 70).length,
        lowOccupancySlots: slotStats.filter(s => (s.bookingCount / expectedBookingsPerSlot) * 100 <= 30).length,
      },
    });
  } catch (error) {
    console.error("Error fetching price recommendations:", error);
    res.status(500).json({ error: "Failed to fetch price recommendations" });
  }
});

// ========================================
// 物件候補API
// ========================================

// 物件候補一覧取得
app.get("/api/property-prospects", async (req, res) => {
  try {
    const { status } = req.query;

    let query = db.select().from(propertyProspects).orderBy(desc(propertyProspects.createdAt));

    if (status) {
      query = query.where(eq(propertyProspects.status, status as string));
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Error fetching property prospects:", error);
    res.status(500).json({ error: "Failed to fetch property prospects" });
  }
});

// 物件候補詳細取得
app.get("/api/property-prospects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .select()
      .from(propertyProspects)
      .where(eq(propertyProspects.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Property prospect not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching property prospect:", error);
    res.status(500).json({ error: "Failed to fetch property prospect" });
  }
});

// 物件候補作成
app.post("/api/property-prospects", async (req, res) => {
  try {
    const data = req.body;

    // 坪単価・平米単価を計算
    const { pricePerTsubo, pricePerSqm } = calculatePricePerUnit(
      data.rent,
      data.areaTsubo,
      data.areaSqm
    );

    const result = await db
      .insert(propertyProspects)
      .values({
        ...data,
        pricePerTsubo,
        pricePerSqm,
      })
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error("Error creating property prospect:", error);
    res.status(500).json({ error: "Failed to create property prospect" });
  }
});

// 物件候補更新
app.put("/api/property-prospects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // 坪単価・平米単価を再計算
    const { pricePerTsubo, pricePerSqm } = calculatePricePerUnit(
      data.rent,
      data.areaTsubo,
      data.areaSqm
    );

    const result = await db
      .update(propertyProspects)
      .set({
        ...data,
        pricePerTsubo,
        pricePerSqm,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(propertyProspects.id, parseInt(id)))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating property prospect:", error);
    res.status(500).json({ error: "Failed to update property prospect" });
  }
});

// 物件候補削除
app.delete("/api/property-prospects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .delete(propertyProspects)
      .where(eq(propertyProspects.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting property prospect:", error);
    res.status(500).json({ error: "Failed to delete property prospect" });
  }
});

// マイソクOCR解析
app.post("/api/property-prospects/ocr", async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const ocrResult = await extractMaisokuData(
      imageBase64,
      mediaType || "image/jpeg"
    );

    if (!ocrResult.success) {
      return res.status(400).json({
        error: "OCR extraction failed",
        details: ocrResult.error,
      });
    }

    // 坪単価・平米単価を計算
    const { pricePerTsubo, pricePerSqm } = calculatePricePerUnit(
      ocrResult.data?.rent || null,
      ocrResult.data?.areaTsubo || null,
      ocrResult.data?.areaSqm || null
    );

    res.json({
      success: true,
      extracted: {
        ...ocrResult.data,
        pricePerTsubo,
        pricePerSqm,
      },
      confidence: ocrResult.confidence,
      rawText: ocrResult.rawText,
    });
  } catch (error) {
    console.error("Error in OCR:", error);
    res.status(500).json({ error: "OCR processing failed", details: String(error) });
  }
});

// ========================================
// シミュレーションAPI
// ========================================

// 売上シミュレーション実行
app.post("/api/simulation/run", async (req, res) => {
  try {
    const { areaTsubo, areaSqm, rent, nearestStation, walkMinutes, capacity } = req.body;

    if (!rent || rent <= 0) {
      return res.status(400).json({ error: "rent is required and must be positive" });
    }

    const result = await runSimulation({
      areaTsubo,
      areaSqm,
      rent,
      nearestStation,
      walkMinutes,
      capacity,
    });

    res.json(result);
  } catch (error) {
    console.error("Error running simulation:", error);
    res.status(500).json({ error: "Simulation failed", details: String(error) });
  }
});

// 既存施設の実績サマリー
app.get("/api/simulation/performance", async (_req, res) => {
  try {
    const summary = await getPerformanceSummary();
    res.json(summary);
  } catch (error) {
    console.error("Error fetching performance summary:", error);
    res.status(500).json({ error: "Failed to fetch performance summary" });
  }
});

// 物件候補にシミュレーション結果を適用
app.post("/api/property-prospects/:id/simulate", async (req, res) => {
  try {
    const { id } = req.params;

    // 物件候補を取得
    const prospects = await db
      .select()
      .from(propertyProspects)
      .where(eq(propertyProspects.id, parseInt(id)))
      .limit(1);

    if (prospects.length === 0) {
      return res.status(404).json({ error: "Property prospect not found" });
    }

    const prospect = prospects[0];

    if (!prospect.rent || prospect.rent <= 0) {
      return res.status(400).json({ error: "Property must have a valid rent" });
    }

    // シミュレーション実行
    const result = await runSimulation({
      areaTsubo: prospect.areaTsubo,
      areaSqm: prospect.areaSqm,
      rent: prospect.rent,
      nearestStation: prospect.nearestStation,
      walkMinutes: prospect.walkMinutes,
      capacity: null,
    });

    // 結果を物件候補に保存
    const updated = await db
      .update(propertyProspects)
      .set({
        estimatedRevenue: result.scenarios.realistic.monthlyRevenue,
        estimatedOccupancy: result.scenarios.realistic.occupancyRate,
        estimatedROI: result.scenarios.realistic.roi,
        breakEvenMonths: result.breakEvenMonths,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(propertyProspects.id, parseInt(id)))
      .returning();

    res.json({
      prospect: updated[0],
      simulation: result,
    });
  } catch (error) {
    console.error("Error simulating property prospect:", error);
    res.status(500).json({ error: "Simulation failed", details: String(error) });
  }
});

// ========================================
// 比較分析API（前年同月比など）
// ========================================

// 前年同月比較データ
app.get("/api/analytics/comparison/year-over-year", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    // 現在期間の売上データ
    const currentPeriod = await db
      .select({
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        totalNet: sql<number>`COALESCE(SUM(${bookings.netAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
        totalDuration: sql<number>`COALESCE(SUM(${bookings.durationMinutes}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, startDate as string),
          lte(bookings.usageDate, endDate as string),
          eq(bookings.status, "confirmed")
        )
      );

    // 前年同期間を計算
    const currentStart = new Date(startDate as string);
    const currentEnd = new Date(endDate as string);
    const previousStart = new Date(currentStart);
    const previousEnd = new Date(currentEnd);
    previousStart.setFullYear(previousStart.getFullYear() - 1);
    previousEnd.setFullYear(previousEnd.getFullYear() - 1);

    const previousStartStr = previousStart.toISOString().split("T")[0];
    const previousEndStr = previousEnd.toISOString().split("T")[0];

    // 前年同期間の売上データ
    const previousPeriod = await db
      .select({
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        totalNet: sql<number>`COALESCE(SUM(${bookings.netAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
        totalDuration: sql<number>`COALESCE(SUM(${bookings.durationMinutes}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, previousStartStr),
          lte(bookings.usageDate, previousEndStr),
          eq(bookings.status, "confirmed")
        )
      );

    // 月別推移データ（現在年と前年）
    const currentYear = currentStart.getFullYear();
    const previousYear = currentYear - 1;

    const monthlyTrends = await db
      .select({
        year: sql<number>`CAST(strftime('%Y', ${bookings.usageDate}) AS INTEGER)`,
        month: sql<number>`CAST(strftime('%m', ${bookings.usageDate}) AS INTEGER)`,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          sql`CAST(strftime('%Y', ${bookings.usageDate}) AS INTEGER) IN (${currentYear}, ${previousYear})`
        )
      )
      .groupBy(
        sql`strftime('%Y', ${bookings.usageDate})`,
        sql`strftime('%m', ${bookings.usageDate})`
      )
      .orderBy(
        sql`strftime('%Y', ${bookings.usageDate})`,
        sql`strftime('%m', ${bookings.usageDate})`
      );

    // 物件別比較
    const propertyComparison = await db
      .select({
        propertyId: bookings.propertyId,
        year: sql<number>`CAST(strftime('%Y', ${bookings.usageDate}) AS INTEGER)`,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          sql`CAST(strftime('%Y', ${bookings.usageDate}) AS INTEGER) IN (${currentYear}, ${previousYear})`
        )
      )
      .groupBy(
        bookings.propertyId,
        sql`strftime('%Y', ${bookings.usageDate})`
      );

    // 計算
    const currentData = currentPeriod[0] || { totalGross: 0, totalNet: 0, bookingCount: 0, avgAmount: 0, totalDuration: 0 };
    const previousData = previousPeriod[0] || { totalGross: 0, totalNet: 0, bookingCount: 0, avgAmount: 0, totalDuration: 0 };

    const revenueChange = previousData.totalGross > 0
      ? ((currentData.totalGross - previousData.totalGross) / previousData.totalGross) * 100
      : currentData.totalGross > 0 ? 100 : 0;

    const bookingChange = previousData.bookingCount > 0
      ? ((currentData.bookingCount - previousData.bookingCount) / previousData.bookingCount) * 100
      : currentData.bookingCount > 0 ? 100 : 0;

    const avgAmountChange = previousData.avgAmount > 0
      ? ((currentData.avgAmount - previousData.avgAmount) / previousData.avgAmount) * 100
      : currentData.avgAmount > 0 ? 100 : 0;

    res.json({
      current: {
        period: { start: startDate, end: endDate },
        ...currentData,
      },
      previous: {
        period: { start: previousStartStr, end: previousEndStr },
        ...previousData,
      },
      changes: {
        revenue: revenueChange,
        bookings: bookingChange,
        avgAmount: avgAmountChange,
        revenueAbsolute: currentData.totalGross - previousData.totalGross,
        bookingsAbsolute: currentData.bookingCount - previousData.bookingCount,
      },
      monthlyTrends,
      propertyComparison,
    });
  } catch (error) {
    console.error("Error fetching year-over-year comparison:", error);
    res.status(500).json({ error: "Failed to fetch comparison data" });
  }
});

// 前月比較データ
app.get("/api/analytics/comparison/month-over-month", async (req, res) => {
  try {
    const { year, month } = req.query;

    const targetYear = parseInt(year as string) || new Date().getFullYear();
    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;

    // 当月の期間
    const currentStart = new Date(targetYear, targetMonth - 1, 1);
    const currentEnd = new Date(targetYear, targetMonth, 0);

    // 前月の期間
    const previousStart = new Date(targetYear, targetMonth - 2, 1);
    const previousEnd = new Date(targetYear, targetMonth - 1, 0);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // 当月データ
    const currentPeriod = await db
      .select({
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, formatDate(currentStart)),
          lte(bookings.usageDate, formatDate(currentEnd)),
          eq(bookings.status, "confirmed")
        )
      );

    // 前月データ
    const previousPeriod = await db
      .select({
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, formatDate(previousStart)),
          lte(bookings.usageDate, formatDate(previousEnd)),
          eq(bookings.status, "confirmed")
        )
      );

    // 日別データ（当月）
    const dailyData = await db
      .select({
        date: bookings.usageDate,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, formatDate(currentStart)),
          lte(bookings.usageDate, formatDate(currentEnd)),
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(bookings.usageDate)
      .orderBy(bookings.usageDate);

    const currentData = currentPeriod[0] || { totalGross: 0, bookingCount: 0, avgAmount: 0 };
    const previousData = previousPeriod[0] || { totalGross: 0, bookingCount: 0, avgAmount: 0 };

    const revenueChange = previousData.totalGross > 0
      ? ((currentData.totalGross - previousData.totalGross) / previousData.totalGross) * 100
      : currentData.totalGross > 0 ? 100 : 0;

    const bookingChange = previousData.bookingCount > 0
      ? ((currentData.bookingCount - previousData.bookingCount) / previousData.bookingCount) * 100
      : currentData.bookingCount > 0 ? 100 : 0;

    res.json({
      current: {
        year: targetYear,
        month: targetMonth,
        period: { start: formatDate(currentStart), end: formatDate(currentEnd) },
        ...currentData,
      },
      previous: {
        year: previousStart.getFullYear(),
        month: previousStart.getMonth() + 1,
        period: { start: formatDate(previousStart), end: formatDate(previousEnd) },
        ...previousData,
      },
      changes: {
        revenue: revenueChange,
        bookings: bookingChange,
        revenueAbsolute: currentData.totalGross - previousData.totalGross,
        bookingsAbsolute: currentData.bookingCount - previousData.bookingCount,
      },
      dailyData,
    });
  } catch (error) {
    console.error("Error fetching month-over-month comparison:", error);
    res.status(500).json({ error: "Failed to fetch comparison data" });
  }
});

// 月次推移データ（過去12ヶ月）
app.get("/api/analytics/monthly-trends", async (req, res) => {
  try {
    const { months } = req.query;
    const monthCount = parseInt(months as string) || 12;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthCount + 1);
    startDate.setDate(1);

    const result = await db
      .select({
        yearMonth: sql<string>`strftime('%Y-%m', ${bookings.usageDate})`,
        year: sql<number>`CAST(strftime('%Y', ${bookings.usageDate}) AS INTEGER)`,
        month: sql<number>`CAST(strftime('%m', ${bookings.usageDate}) AS INTEGER)`,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        totalNet: sql<number>`COALESCE(SUM(${bookings.netAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
        avgAmount: sql<number>`COALESCE(AVG(${bookings.grossAmount}), 0)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, startDate.toISOString().split("T")[0]),
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${bookings.usageDate})`)
      .orderBy(sql`strftime('%Y-%m', ${bookings.usageDate})`);

    // 前年同月のデータも取得
    const previousYearStart = new Date(startDate);
    previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);

    const previousYearData = await db
      .select({
        yearMonth: sql<string>`strftime('%Y-%m', ${bookings.usageDate})`,
        year: sql<number>`CAST(strftime('%Y', ${bookings.usageDate}) AS INTEGER)`,
        month: sql<number>`CAST(strftime('%m', ${bookings.usageDate}) AS INTEGER)`,
        totalGross: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
        bookingCount: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.usageDate, previousYearStart.toISOString().split("T")[0]),
          lte(bookings.usageDate, new Date(startDate.getTime() - 1).toISOString().split("T")[0]),
          eq(bookings.status, "confirmed")
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${bookings.usageDate})`)
      .orderBy(sql`strftime('%Y-%m', ${bookings.usageDate})`);

    // 前年同月のマップを作成
    const previousYearMap = new Map(
      previousYearData.map(d => [d.month, d])
    );

    // 前年比を計算して追加
    const trendsWithComparison = result.map(current => {
      const previousYear = previousYearMap.get(current.month);
      const yoyChange = previousYear && previousYear.totalGross > 0
        ? ((current.totalGross - previousYear.totalGross) / previousYear.totalGross) * 100
        : null;

      return {
        ...current,
        previousYearGross: previousYear?.totalGross || null,
        previousYearBookings: previousYear?.bookingCount || null,
        yoyChange,
      };
    });

    res.json({
      data: trendsWithComparison,
      summary: {
        totalMonths: result.length,
        avgMonthlyRevenue: result.length > 0
          ? result.reduce((sum, r) => sum + r.totalGross, 0) / result.length
          : 0,
        avgMonthlyBookings: result.length > 0
          ? result.reduce((sum, r) => sum + r.bookingCount, 0) / result.length
          : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
});

// ========================================
// 位置情報インテリジェンスAPI（Phase 4）
// ========================================

// 駅乗降客数情報を取得
app.get("/api/location/station-info", async (req, res) => {
  try {
    const { stationName } = req.query;

    if (!stationName || typeof stationName !== "string") {
      return res.status(400).json({ error: "stationName is required" });
    }

    const result = await getStationInfo(stationName);
    res.json(result);
  } catch (error) {
    console.error("Error fetching station info:", error);
    res.status(500).json({ error: "Failed to fetch station info" });
  }
});

// 周辺法人数を取得
app.get("/api/location/nearby-companies", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address || typeof address !== "string") {
      return res.status(400).json({ error: "address is required" });
    }

    const count = await getNearbyCompanies(address);
    res.json({ address, nearbyCompanies: count });
  } catch (error) {
    console.error("Error fetching nearby companies:", error);
    res.status(500).json({ error: "Failed to fetch nearby companies" });
  }
});

// 立地分析を実行
app.post("/api/location/analyze", async (req, res) => {
  try {
    const { stationName, walkMinutes, address } = req.body;

    if (!stationName) {
      return res.status(400).json({ error: "stationName is required" });
    }

    const analysis = await generateLocationAnalysis(
      stationName,
      walkMinutes || null,
      address || null
    );

    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing location:", error);
    res.status(500).json({ error: "Location analysis failed" });
  }
});

// 物件候補の立地スコアを計算・保存
app.post("/api/property-prospects/:id/location-score", async (req, res) => {
  try {
    const { id } = req.params;
    const prospectId = parseInt(id);

    // 既存の物件候補を取得
    const [prospect] = await db
      .select()
      .from(propertyProspects)
      .where(eq(propertyProspects.id, prospectId));

    if (!prospect) {
      return res.status(404).json({ error: "Property prospect not found" });
    }

    // 駅情報を取得
    let stationPassengers: number | null = null;
    if (prospect.nearestStation) {
      const stationInfo = await getStationInfo(prospect.nearestStation);
      stationPassengers = stationInfo.passengers;
    }

    // 周辺法人数を取得
    let nearbyCompanies: number | null = null;
    if (prospect.address) {
      nearbyCompanies = await getNearbyCompanies(prospect.address);
    }

    // 立地スコアを計算
    const locationScore = calculateLocationScore({
      stationPassengers,
      walkMinutes: prospect.walkMinutes,
      nearbyCompanies,
    });

    // DB更新
    const [updated] = await db
      .update(propertyProspects)
      .set({
        stationPassengers,
        nearbyCompanies,
        locationScore,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(propertyProspects.id, prospectId))
      .returning();

    res.json({
      prospect: updated,
      analysis: {
        stationPassengers,
        nearbyCompanies,
        locationScore,
        locationRank: getLocationRank(locationScore),
        locationMultiplier: getLocationMultiplier(locationScore),
      },
    });
  } catch (error) {
    console.error("Error calculating location score:", error);
    res.status(500).json({ error: "Failed to calculate location score" });
  }
});

// 全物件候補の立地スコアを一括計算
app.post("/api/property-prospects/calculate-all-location-scores", async (_req, res) => {
  try {
    const allProspects = await db.select().from(propertyProspects);
    const results = [];

    for (const prospect of allProspects) {
      // 駅情報を取得
      let stationPassengers: number | null = null;
      if (prospect.nearestStation) {
        const stationInfo = await getStationInfo(prospect.nearestStation);
        stationPassengers = stationInfo.passengers;
      }

      // 周辺法人数を取得
      let nearbyCompanies: number | null = null;
      if (prospect.address) {
        nearbyCompanies = await getNearbyCompanies(prospect.address);
      }

      // 立地スコアを計算
      const locationScore = calculateLocationScore({
        stationPassengers,
        walkMinutes: prospect.walkMinutes,
        nearbyCompanies,
      });

      // DB更新
      const [updated] = await db
        .update(propertyProspects)
        .set({
          stationPassengers,
          nearbyCompanies,
          locationScore,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(propertyProspects.id, prospect.id))
        .returning();

      results.push(updated);
    }

    res.json({
      updated: results.length,
      prospects: results,
    });
  } catch (error) {
    console.error("Error calculating all location scores:", error);
    res.status(500).json({ error: "Failed to calculate location scores" });
  }
});

// ========================================
// サーバー起動
// ========================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

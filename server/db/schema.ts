import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * プラットフォームマスタ
 * インスタベース、スペースマーケット、スペイシー、アップナウ、予約クル、自社集客
 */
export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // 'instabase', 'spacemarket', 'spacee', 'upnow', 'yoyakuru', 'direct'
  name: text("name").notNull(), // 表示名
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  commissionRate: real("commission_rate").default(0), // 手数料率（例: 0.15 = 15%）
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

/**
 * 施設マスタ
 */
export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // 内部管理コード 'P001'
  name: text("name").notNull(), // 施設名（マスタ名称）
  address: text("address"),
  monthlyRent: integer("monthly_rent").default(0), // 月額家賃
  monthlyFixedCost: integer("monthly_fixed_cost").default(0), // 月額固定費（光熱費等）
  roomCount: integer("room_count").default(1), // 部屋数
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

/**
 * 部屋マスタ（施設に複数部屋がある場合）
 */
export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id),
  code: text("code").notNull(), // 'P001-A', 'P001-B'
  name: text("name").notNull(), // '部屋A', '部屋B'
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

/**
 * プラットフォーム別施設名マッピング
 * 各プラットフォームで異なる名前で登録されている施設を紐付け
 */
export const platformMappings = sqliteTable("platform_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id),
  roomId: integer("room_id").references(() => rooms.id), // 部屋単位の場合
  platformId: integer("platform_id")
    .notNull()
    .references(() => platforms.id),
  platformPropertyName: text("platform_property_name").notNull(), // PF上の表示名
  platformPropertyId: text("platform_property_id"), // PF上のID（あれば）
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

/**
 * 予約（売上）データ
 */
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id")
    .notNull()
    .references(() => properties.id),
  roomId: integer("room_id").references(() => rooms.id),
  platformId: integer("platform_id")
    .notNull()
    .references(() => platforms.id),

  // 予約情報
  bookingDate: text("booking_date").notNull(), // 予約日（YYYY-MM-DD）
  usageDate: text("usage_date").notNull(), // 利用日（YYYY-MM-DD）
  startTime: text("start_time"), // 開始時刻（HH:MM）
  endTime: text("end_time"), // 終了時刻（HH:MM）
  durationMinutes: integer("duration_minutes"), // 利用時間（分）

  // 金額情報
  grossAmount: integer("gross_amount").notNull(), // 総額（税込）
  netAmount: integer("net_amount"), // 入金額（手数料控除後）
  commission: integer("commission"), // 手数料

  // メタデータ
  platformBookingId: text("platform_booking_id"), // PF上の予約ID
  guestName: text("guest_name"),
  status: text("status").default("confirmed"), // confirmed, cancelled, completed

  // 利用情報（分析用）
  usagePurpose: text("usage_purpose"), // 利用用途（会議、パーティー、撮影など）
  usageDetail: text("usage_detail"), // 用途詳細
  guestCount: integer("guest_count"), // 利用人数

  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

/**
 * 経費データ
 */
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id").references(() => properties.id), // nullで全体経費

  expenseDate: text("expense_date").notNull(), // 発生日（YYYY-MM-DD）
  category: text("category").notNull(), // 'rent', 'utility', 'cleaning', 'supply', 'other'
  description: text("description"),
  amount: integer("amount").notNull(),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),

  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

/**
 * CSVインポート履歴（重複防止）
 */
export const importLogs = sqliteTable("import_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platformId: integer("platform_id")
    .notNull()
    .references(() => platforms.id),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull(), // 重複検知用
  importedAt: text("imported_at").default("CURRENT_TIMESTAMP"),
  recordCount: integer("record_count"),
  status: text("status").default("success"), // success, error, partial
  errorMessage: text("error_message"),
});

/**
 * 物件候補データ（マイソクOCR解析結果）
 */
export const propertyProspects = sqliteTable("property_prospects", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // 基本情報
  name: text("name").notNull(), // 物件名
  address: text("address"), // 住所

  // 面積
  areaTsubo: real("area_tsubo"), // 坪数
  areaSqm: real("area_sqm"), // 平米数

  // 賃料・初期費用
  rent: integer("rent"), // 月額賃料
  managementFee: integer("management_fee"), // 共益費・管理費
  deposit: real("deposit"), // 敷金（ヶ月）
  keyMoney: real("key_money"), // 礼金（ヶ月）

  // 物件情報
  layout: text("layout"), // 間取り（1LDK、ワンルーム等）
  floor: text("floor"), // 階数
  buildingAge: integer("building_age"), // 築年数
  structure: text("structure"), // 構造（RC造、SRC造、木造等）

  // アクセス
  nearestStation: text("nearest_station"), // 最寄駅
  railwayLine: text("railway_line"), // 路線名
  walkMinutes: integer("walk_minutes"), // 徒歩分数

  // 計算フィールド（坪単価・平米単価）
  pricePerTsubo: real("price_per_tsubo"), // 賃料÷坪数
  pricePerSqm: real("price_per_sqm"), // 賃料÷平米数

  // シミュレーション結果
  estimatedRevenue: integer("estimated_revenue"), // 予測月間売上
  estimatedOccupancy: real("estimated_occupancy"), // 予測稼働率
  estimatedROI: real("estimated_roi"), // 予測ROI
  breakEvenMonths: integer("break_even_months"), // 損益分岐月数

  // 位置情報スコア
  stationPassengers: integer("station_passengers"), // 駅乗降客数
  nearbyCompanies: integer("nearby_companies"), // 周辺法人数
  locationScore: integer("location_score"), // 立地スコア（0-100）

  // メタデータ
  sourceImage: text("source_image"), // 元画像パス
  ocrConfidence: real("ocr_confidence"), // OCR信頼度
  notes: text("notes"), // メモ
  status: text("status").default("draft"), // draft, evaluating, rejected, approved

  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// 型エクスポート
export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type PlatformMapping = typeof platformMappings.$inferSelect;
export type NewPlatformMapping = typeof platformMappings.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ImportLog = typeof importLogs.$inferSelect;
export type NewImportLog = typeof importLogs.$inferInsert;
export type PropertyProspect = typeof propertyProspects.$inferSelect;
export type NewPropertyProspect = typeof propertyProspects.$inferInsert;

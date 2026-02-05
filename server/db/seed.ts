import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "rental-space.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

/**
 * 初期データ投入
 * プラットフォーム、施設、部屋、マッピングを登録
 */
async function seed() {
  console.log("Seeding database...");

  // ========================================
  // 1. プラットフォームマスタ
  // ========================================
  const platformData: schema.NewPlatform[] = [
    {
      code: "instabase",
      name: "インスタベース",
      commissionRate: 0.35, // 35%
      isActive: true,
    },
    {
      code: "spacemarket",
      name: "スペースマーケット",
      commissionRate: 0.3, // 30%
      isActive: true,
    },
    {
      code: "spacee",
      name: "スペイシー",
      commissionRate: 0.3, // 30%
      isActive: true,
    },
    {
      code: "upnow",
      name: "アップナウ",
      commissionRate: 0.2, // 20%
      isActive: true,
    },
    {
      code: "yoyakuru",
      name: "予約クル",
      commissionRate: 0.15, // 15%
      isActive: true,
    },
    {
      code: "direct",
      name: "自社集客",
      commissionRate: 0, // 0%
      isActive: true,
    },
  ];

  // ========================================
  // 2. 施設マスタ（5施設）
  // ========================================
  const propertyData: schema.NewProperty[] = [
    {
      code: "P001",
      name: "ブルースペース上野御徒町",
      address: "東京都台東区上野",
      monthlyRent: 0, // 後で設定
      monthlyFixedCost: 0,
      roomCount: 1,
      isActive: true,
    },
    {
      code: "P002",
      name: "ブルースペース上野駅前",
      address: "東京都台東区上野",
      monthlyRent: 0,
      monthlyFixedCost: 0,
      roomCount: 2, // 4A, 4B の2部屋
      isActive: true,
    },
    {
      code: "P003",
      name: "ブルースペース神田",
      address: "東京都千代田区神田",
      monthlyRent: 0,
      monthlyFixedCost: 0,
      roomCount: 1,
      isActive: true,
    },
    {
      code: "P004",
      name: "ブルースペース白金高輪",
      address: "東京都港区白金",
      monthlyRent: 0,
      monthlyFixedCost: 0,
      roomCount: 1,
      isActive: true,
    },
    {
      code: "P005",
      name: "ブルースペース西新宿403",
      address: "東京都新宿区西新宿",
      monthlyRent: 0,
      monthlyFixedCost: 0,
      roomCount: 1,
      isActive: true,
    },
  ];

  // 外部キー制約に注意して、依存テーブルから順に削除
  await db.delete(schema.importLogs);
  await db.delete(schema.expenses);
  await db.delete(schema.bookings);
  await db.delete(schema.platformMappings);
  await db.delete(schema.rooms);
  await db.delete(schema.properties);
  await db.delete(schema.platforms);

  // プラットフォーム投入
  await db.insert(schema.platforms).values(platformData);
  console.log("Platforms seeded:", platformData.length);

  // プラットフォームIDを取得
  const platforms = await db.select().from(schema.platforms);
  const instabaseId = platforms.find((p) => p.code === "instabase")!.id;
  const spacemarketId = platforms.find((p) => p.code === "spacemarket")!.id;

  // 施設投入
  await db.insert(schema.properties).values(propertyData);
  console.log("Properties seeded:", propertyData.length);

  // 施設IDを取得
  const properties = await db.select().from(schema.properties);
  const uenoEkimaeId = properties.find((p) => p.code === "P002")!.id;

  // ========================================
  // 3. 部屋マスタ（上野駅前のみ2部屋）
  // ========================================
  const roomData: schema.NewRoom[] = [
    {
      propertyId: uenoEkimaeId,
      code: "P002-4A",
      name: "4A (401号室)",
      isActive: true,
    },
    {
      propertyId: uenoEkimaeId,
      code: "P002-4B",
      name: "4B (402号室)",
      isActive: true,
    },
  ];

  await db.insert(schema.rooms).values(roomData);
  console.log("Rooms seeded:", roomData.length);

  // 部屋IDを取得
  const rooms = await db.select().from(schema.rooms);
  const room4AId = rooms.find((r) => r.code === "P002-4A")!.id;
  const room4BId = rooms.find((r) => r.code === "P002-4B")!.id;

  // ========================================
  // 4. インスタベースのマッピング
  // ========================================
  const mappingData: schema.NewPlatformMapping[] = [
    // 上野御徒町（部屋なし）
    {
      propertyId: properties.find((p) => p.code === "P001")!.id,
      roomId: null,
      platformId: instabaseId,
      platformPropertyName: "ブルースペース上野御徒町",
      isActive: true,
    },
    // 上野駅前 4A
    {
      propertyId: uenoEkimaeId,
      roomId: room4AId,
      platformId: instabaseId,
      platformPropertyName: "ブルースペース上野駅前4A&4B(2部屋あり）",
      isActive: true,
    },
    // 上野駅前 4B（同じ掲載名だがスペース名で判別）
    {
      propertyId: uenoEkimaeId,
      roomId: room4BId,
      platformId: instabaseId,
      platformPropertyName: "ブルースペース上野駅前4A&4B(2部屋あり）",
      isActive: true,
    },
    // 神田
    {
      propertyId: properties.find((p) => p.code === "P003")!.id,
      roomId: null,
      platformId: instabaseId,
      platformPropertyName: "ブルースペース神田（貸スペース）",
      isActive: true,
    },
    // 白金高輪
    {
      propertyId: properties.find((p) => p.code === "P004")!.id,
      roomId: null,
      platformId: instabaseId,
      platformPropertyName: "ブルースペース白金高輪",
      isActive: true,
    },
    // 西新宿403
    {
      propertyId: properties.find((p) => p.code === "P005")!.id,
      roomId: null,
      platformId: instabaseId,
      platformPropertyName: "ブルースペース西新宿403",
      isActive: true,
    },
  ];

  await db.insert(schema.platformMappings).values(mappingData);
  console.log("Platform mappings (instabase) seeded:", mappingData.length);

  // ========================================
  // 5. スペースマーケットのマッピング
  // ========================================
  const spacemarketMappingData: schema.NewPlatformMapping[] = [
    // 上野御徒町
    {
      propertyId: properties.find((p) => p.code === "P001")!.id,
      roomId: null,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース上野御徒町",
      isActive: true,
    },
    // 上野駅前 4A
    {
      propertyId: uenoEkimaeId,
      roomId: room4AId,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース上野駅前4A",
      isActive: true,
    },
    // 上野駅前 4B
    {
      propertyId: uenoEkimaeId,
      roomId: room4BId,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース上野駅前4B",
      isActive: true,
    },
    // 上野駅前 4A＆4B（フルワイド文字の場合もマッピング）
    {
      propertyId: uenoEkimaeId,
      roomId: null,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース上野駅前4A＆4B",
      isActive: true,
    },
    // 神田
    {
      propertyId: properties.find((p) => p.code === "P003")!.id,
      roomId: null,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース神田",
      isActive: true,
    },
    // 白金高輪
    {
      propertyId: properties.find((p) => p.code === "P004")!.id,
      roomId: null,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース白金高輪",
      isActive: true,
    },
    // 西新宿403
    {
      propertyId: properties.find((p) => p.code === "P005")!.id,
      roomId: null,
      platformId: spacemarketId,
      platformPropertyName: "ブルースペース西新宿403",
      isActive: true,
    },
  ];

  await db.insert(schema.platformMappings).values(spacemarketMappingData);
  console.log("Platform mappings (spacemarket) seeded:", spacemarketMappingData.length);

  console.log("\n=== Seed completed! ===");
  console.log("Platforms:", platformData.length);
  console.log("Properties:", propertyData.length);
  console.log("Rooms:", roomData.length);
  console.log("Mappings:", mappingData.length);

  sqlite.close();
}

seed().catch(console.error);

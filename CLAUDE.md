# CLAUDE.md — rental-space-manager（レンタルスペース売上管理）

## 概要

レンタルスペース（7〜10店舗）の売上・予約・稼働率を一元管理するWebダッシュボード。

## 技術スタック

- **フロント**: React 19 + TypeScript + Vite + Tailwind CSS
- **グラフ**: Recharts
- **バック**: Express（ポート3001）
- **DB**: SQLite + Drizzle ORM（`rental-space.db`）
- **CSV解析**: PapaParse

## よく使うコマンド

```bash
npm run dev          # フロント+バック同時起動
npm run db:push      # DBスキーマ反映
npm run db:seed      # 初期データ投入
npm run db:studio    # Drizzle Studio（DB確認GUI）
```

## ディレクトリ構成

```
src/                 # フロントエンド（React）
  pages/             # ページコンポーネント
  components/        # UIコンポーネント
server/              # バックエンド（Express）
  db/                # Drizzle スキーマ
  routers/           # APIルーター
  parsers/           # CSVパーサー（各PF対応）
data/                # CSVファイル保存先
  raw/               # 生データ
  processed/         # 処理済み
```

## 対応プラットフォーム

インスタベース / スペースマーケット / スペイシー / アップナウ / 予約クル / 自社集客

## 実装フェーズ

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | MVP（手動CSV取込 + 基本ダッシュボード） | **完了** |
| 2 | Playwright自動収集 + スケジューラー | 未着手 |
| 3 | 時間帯ヒートマップ + 経費管理 | 未着手 |

## 注意事項

- DESIGN.mdが未作成 → UI大幅変更時は作成を提案すること
- CSVは各プラットフォームでフォーマットが異なる（`server/parsers/`参照）

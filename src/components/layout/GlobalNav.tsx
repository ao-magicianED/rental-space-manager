import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Upload,
  Settings,
  Building2,
  CalendarCheck,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  hash: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "ダッシュボード",
    icon: <LayoutDashboard className="h-5 w-5" />,
    hash: "",
    description: "売上・予約の概要",
  },
  {
    id: "bookings",
    label: "予約管理",
    icon: <CalendarCheck className="h-5 w-5" />,
    hash: "bookings",
    description: "予約の追加・編集・削除",
  },
  {
    id: "analytics",
    label: "分析",
    icon: <BarChart3 className="h-5 w-5" />,
    hash: "analytics",
    description: "詳細分析・ヒートマップ",
  },
  {
    id: "properties",
    label: "物件投資",
    icon: <Building2 className="h-5 w-5" />,
    hash: "properties",
    description: "物件候補・シミュレーション",
  },
  {
    id: "import",
    label: "インポート",
    icon: <Upload className="h-5 w-5" />,
    hash: "import",
    description: "CSVデータ取込",
  },
  {
    id: "settings",
    label: "設定",
    icon: <Settings className="h-5 w-5" />,
    hash: "settings",
    description: "施設・プラットフォーム管理",
  },
];

export function GlobalNav() {
  const [currentPage, setCurrentPage] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updatePage = () => {
      const hash = window.location.hash.slice(1);
      setCurrentPage(hash || "");
    };

    updatePage();
    window.addEventListener("hashchange", updatePage);
    return () => window.removeEventListener("hashchange", updatePage);
  }, []);

  const isActive = (hash: string) => currentPage === hash;

  return (
    <>
      {/* デスクトップナビゲーション */}
      <nav className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:overflow-y-auto lg:bg-gradient-to-b lg:from-slate-900 lg:to-slate-800 lg:pb-4">
        {/* ロゴエリア */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-slate-700/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">スペース管理</h1>
            <p className="text-xs text-slate-400">Blue Space Dashboard</p>
          </div>
        </div>

        {/* ナビゲーションリンク */}
        <ul className="mt-6 space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.hash}`}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive(item.hash)
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    isActive(item.hash)
                      ? "bg-white/20"
                      : "bg-slate-700/50 group-hover:bg-slate-600/50"
                  }`}
                >
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {isActive(item.hash) && (
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      isActive(item.hash) ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>

        {/* フッター */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-4">
            <p className="text-xs font-medium text-blue-300">Blue Space</p>
            <p className="mt-1 text-xs text-slate-400">
              5施設 · 6部屋を管理中
            </p>
          </div>
        </div>
      </nav>

      {/* モバイルヘッダー */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-4 shadow-lg sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-slate-300"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span className="sr-only">メニューを開く</span>
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">スペース管理</span>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* サイドバー */}
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-gradient-to-b from-slate-900 to-slate-800">
            <div className="flex h-16 items-center justify-between px-6 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">スペース管理</span>
              </div>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-slate-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="mt-6 px-3">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.hash}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive(item.hash)
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                          : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isActive(item.hash) ? "bg-white/20" : "bg-slate-700/50"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalNav;

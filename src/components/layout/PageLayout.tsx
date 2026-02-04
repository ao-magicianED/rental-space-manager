import type { ReactNode } from "react";
import { GlobalNav } from "./GlobalNav";
import { BottomNav } from "./BottomNav";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageLayout({
  children,
  title,
  description,
  actions,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <GlobalNav />

      {/* メインコンテンツエリア */}
      <div className="lg:pl-72">
        {/* ページヘッダー（タイトルがある場合のみ） */}
        {(title || actions) && (
          <header className="sticky top-[56px] lg:top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
            <div className="px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
              {/* モバイル: タイトルとアクションを縦並び */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {title && (
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{title}</h1>
                  )}
                  {description && (
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">{description}</p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 overflow-x-auto scrollbar-hide">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* ページコンテンツ */}
        <main className="px-4 py-4 sm:py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* モバイル用ボトムナビゲーション */}
      <BottomNav />
    </div>
  );
}

export default PageLayout;

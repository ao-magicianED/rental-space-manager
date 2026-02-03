import type { ReactNode } from "react";
import { GlobalNav } from "./GlobalNav";

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
    <div className="min-h-screen bg-slate-50">
      <GlobalNav />

      {/* メインコンテンツエリア */}
      <div className="lg:pl-72">
        {/* ページヘッダー（タイトルがある場合のみ） */}
        {(title || actions) && (
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div>
                  {title && (
                    <h1 className="text-xl font-bold text-slate-900">{title}</h1>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            </div>
          </header>
        )}

        {/* ページコンテンツ */}
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default PageLayout;

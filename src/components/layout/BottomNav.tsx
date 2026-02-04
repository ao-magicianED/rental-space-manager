import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Building2,
  CalendarCheck,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  hash: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "ホーム",
    icon: <LayoutDashboard className="h-5 w-5" />,
    hash: "",
  },
  {
    id: "bookings",
    label: "予約",
    icon: <CalendarCheck className="h-5 w-5" />,
    hash: "bookings",
  },
  {
    id: "analytics",
    label: "分析",
    icon: <BarChart3 className="h-5 w-5" />,
    hash: "analytics",
  },
  {
    id: "properties",
    label: "物件",
    icon: <Building2 className="h-5 w-5" />,
    hash: "properties",
  },
  {
    id: "settings",
    label: "設定",
    icon: <Settings className="h-5 w-5" />,
    hash: "settings",
  },
];

export function BottomNav() {
  const [currentPage, setCurrentPage] = useState("");

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.hash}`}
            className={`flex flex-col items-center justify-center min-w-[56px] py-2 px-1 rounded-lg transition-colors ${
              isActive(item.hash)
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-700 active:bg-slate-100"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                isActive(item.hash)
                  ? "bg-blue-100"
                  : ""
              }`}
            >
              {item.icon}
            </span>
            <span className={`mt-0.5 text-[10px] font-medium ${
              isActive(item.hash) ? "text-blue-600" : "text-slate-500"
            }`}>
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;

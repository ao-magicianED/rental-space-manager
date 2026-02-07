import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  CalendarCheck,
  Upload,
  Building2,
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
    label: "投資",
    icon: <Building2 className="h-5 w-5" />,
    hash: "properties",
  },
  {
    id: "import",
    label: "取込",
    icon: <Upload className="h-5 w-5" />,
    hash: "import",
  },
  {
    id: "settings",
    label: "他",
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
      <div className="flex items-center justify-around px-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.hash}`}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[54px] py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
              isActive(item.hash)
                ? "text-blue-600"
                : "text-slate-400 hover:text-slate-600 active:bg-slate-100"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                isActive(item.hash)
                  ? "bg-blue-100 scale-110"
                  : ""
              }`}
            >
              {item.icon}
            </span>
            <span className={`mt-1 text-[10px] font-medium transition-colors ${
              isActive(item.hash) ? "text-blue-600" : "text-slate-400"
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

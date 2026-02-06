import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

type PresetKey = "thisMonth" | "lastMonth" | "thisWeek" | "custom";

const presets: { key: PresetKey; label: string }[] = [
  { key: "thisMonth", label: "今月" },
  { key: "lastMonth", label: "先月" },
  { key: "thisWeek", label: "今週" },
  { key: "custom", label: "カスタム" },
];

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>("thisMonth");

  const handlePresetClick = (preset: PresetKey) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "thisWeek":
        start = startOfWeek(today, { locale: ja });
        end = endOfWeek(today, { locale: ja });
        break;
      default:
        return;
    }

    setActivePreset(preset);
    onChange(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${format(start, "M/d", { locale: ja })} - ${format(end, "M/d", { locale: ja })}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Calendar className="h-4 w-4" />
        <span>{formatDisplayDate()}</span>
        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-56 sm:w-64 rounded-lg border border-slate-200 bg-white p-3 sm:p-4 shadow-lg">
            <div className="space-y-2">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset.key)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    activePreset === preset.key
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {activePreset === "custom" && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div>
                  <label className="block text-xs text-slate-500">開始日</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onChange(e.target.value, endDate)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">終了日</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onChange(startDate, e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  適用
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangePicker;

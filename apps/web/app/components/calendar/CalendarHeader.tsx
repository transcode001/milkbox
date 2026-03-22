"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ViewMode } from "./types";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (mode: ViewMode) => void;
  onAddEvent: () => void;
}

const VIEW_OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: "day", label: "Day" },
  { mode: "week", label: "Week" },
  { mode: "month", label: "Month" },
  { mode: "year", label: "Year" },
];

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onAddEvent,
}: CalendarHeaderProps) {
  const getTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "yyyy年M月d日 (E)", { locale: ja });
      case "week":
        return format(currentDate, "yyyy年M月", { locale: ja });
      case "month":
        return format(currentDate, "yyyy年M月", { locale: ja });
      case "year":
        return format(currentDate, "yyyy年", { locale: ja });
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">
            Scheduler
          </h1>
          <span className="hidden text-sm text-[var(--muted-foreground)] md:block">
            {getTitle()}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-[var(--muted)] transition-colors"
          >
            今日
          </button>
          <div className="flex items-center">
            <button
              onClick={onPrevious}
              className="p-2 rounded-md hover:bg-[var(--muted)] transition-colors"
              aria-label="前へ"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              className="p-2 rounded-md hover:bg-[var(--muted)] transition-colors"
              aria-label="次へ"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-[var(--muted)] rounded-lg p-1">
          {VIEW_OPTIONS.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onViewChange(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Add Event */}
        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:opacity-90 transition-opacity"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden md:inline">予定を追加</span>
        </button>
      </div>

      {/* Mobile Title */}
      <div className="flex items-center justify-between px-4 pb-3 md:hidden">
        <span className="text-2xl font-bold">{getTitle()}</span>
        <div className="flex items-center gap-1 bg-[var(--muted)] rounded-lg p-1">
          {VIEW_OPTIONS.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onViewChange(mode)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === mode
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

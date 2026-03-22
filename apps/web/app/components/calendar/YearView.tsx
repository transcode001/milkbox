"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  setMonth,
} from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEvent } from "./types";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS_SHORT = ["月", "火", "水", "木", "金", "土", "日"];

export function YearView({ currentDate, events, onDateSelect }: YearViewProps) {
  const year = currentDate.getFullYear();

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  const getEventsForMonth = (date: Date) => {
    return events.filter((event) => isSameMonth(event.startTime, date));
  };

  const hasEventsOnDay = (date: Date) => {
    return events.some((event) => isSameDay(event.startTime, date));
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {months.map((monthDate) => {
          const monthEvents = getEventsForMonth(monthDate);

          return (
            <MiniMonth
              key={monthDate.toISOString()}
              date={monthDate}
              events={monthEvents}
              hasEventsOnDay={hasEventsOnDay}
              onDateSelect={onDateSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

interface MiniMonthProps {
  date: Date;
  events: CalendarEvent[];
  hasEventsOnDay: (date: Date) => boolean;
  onDateSelect: (date: Date) => void;
}

function MiniMonth({ date, events, hasEventsOnDay, onDateSelect }: MiniMonthProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [date]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result.slice(0, 6); // Maximum 6 weeks
  }, [calendarDays]);

  return (
    <div className="bg-[var(--card)] rounded-xl p-4 shadow-sm border border-[var(--border)]">
      {/* Month Header */}
      <button
        onClick={() => onDateSelect(date)}
        className="w-full text-left mb-3 hover:opacity-70 transition-opacity"
      >
        <h3 className="text-base font-semibold">
          {format(date, "M月", { locale: ja })}
        </h3>
        {events.length > 0 && (
          <p className="text-xs text-[var(--muted-foreground)]">
            {events.length}件の予定
          </p>
        )}
      </button>

      {/* Mini Calendar */}
      <div>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {WEEKDAYS_SHORT.map((day, index) => (
            <div
              key={day}
              className={`text-center text-[10px] font-medium ${
                index >= 5 ? "text-[var(--muted-foreground)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="space-y-px">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-px">
              {week.map((day) => {
                const isCurrentMonth = isSameMonth(day, date);
                const hasEvents = hasEventsOnDay(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onDateSelect(day)}
                    disabled={!isCurrentMonth}
                    className={`aspect-square flex items-center justify-center text-xs rounded-full transition-colors ${
                      isToday(day)
                        ? "bg-[var(--calendar-today)] text-[var(--accent-foreground)] font-semibold"
                        : isCurrentMonth
                        ? "hover:bg-[var(--muted)]"
                        : "opacity-0 cursor-default"
                    }`}
                  >
                    <span className="relative">
                      {format(day, "d")}
                      {hasEvents && isCurrentMonth && !isToday(day) && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--calendar-event-work)]" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

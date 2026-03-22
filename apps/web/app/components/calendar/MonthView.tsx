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
  isWeekend,
} from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEvent } from "./types";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export function MonthView({
  currentDate,
  events,
  onEventClick,
  onDateSelect,
}: MonthViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(event.startTime, date));
  };

  const getEventColor = (color: string) => {
    switch (color) {
      case "work":
        return "bg-[var(--calendar-event-work)]";
      case "personal":
        return "bg-[var(--calendar-event-personal)]";
      case "meeting":
        return "bg-[var(--calendar-event-meeting)]";
      default:
        return "bg-[var(--calendar-event-work)]";
    }
  };

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="flex flex-col h-full p-4">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index >= 5 ? "text-[var(--muted-foreground)]" : ""
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(0,1fr))] gap-px bg-[var(--border)] rounded-lg overflow-hidden">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDateSelect(day)}
                  className={`min-h-[80px] md:min-h-[100px] p-2 bg-[var(--background)] cursor-pointer transition-colors hover:bg-[var(--muted)] ${
                    isWeekend(day) ? "bg-[var(--calendar-weekend)]" : ""
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  {/* Date Number */}
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`inline-flex items-center justify-center text-sm ${
                        isToday(day)
                          ? "w-7 h-7 rounded-full bg-[var(--calendar-today)] text-[var(--accent-foreground)] font-semibold"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-xs text-white truncate transition-opacity hover:opacity-80 ${getEventColor(
                          event.color
                        )}`}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-[var(--muted-foreground)] pl-1.5">
                        +{dayEvents.length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

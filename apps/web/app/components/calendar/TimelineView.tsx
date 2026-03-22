"use client";

import { useMemo, useRef, useEffect } from "react";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isToday,
  isWeekend,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEvent, ViewMode } from "./types";

interface TimelineViewProps {
  currentDate: Date;
  viewMode: ViewMode;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateSelect: (date: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

export function TimelineView({
  currentDate,
  viewMode,
  events,
  onEventClick,
  onDateSelect,
}: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    if (viewMode === "day") {
      return [currentDate];
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate, viewMode]);

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(event.startTime, date));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = getHours(event.startTime);
    const startMinute = getMinutes(event.startTime);
    const duration = differenceInMinutes(event.endTime, event.startTime);

    const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 24) };
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

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 2) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Day Headers */}
      <div className="flex border-b border-[var(--border)] bg-[var(--background)]">
        {/* Time column spacer */}
        <div className="w-16 shrink-0 md:w-20" />

        {/* Day columns */}
        <div className="flex flex-1">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`flex-1 py-3 text-center border-l border-[var(--border)] first:border-l-0 cursor-pointer transition-colors hover:bg-[var(--muted)] ${
                isWeekend(day) ? "bg-[var(--calendar-weekend)]" : ""
              }`}
              onClick={() => onDateSelect(day)}
            >
              <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                {format(day, "E", { locale: ja })}
              </div>
              <div
                className={`mt-1 text-xl font-semibold ${
                  isToday(day)
                    ? "w-8 h-8 mx-auto flex items-center justify-center rounded-full bg-[var(--calendar-today)] text-[var(--accent-foreground)]"
                    : ""
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative">
          {/* Time Labels */}
          <div className="w-16 shrink-0 md:w-20">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] flex items-start justify-end pr-2 md:pr-3"
              >
                <span className="text-xs text-[var(--muted-foreground)] -translate-y-2">
                  {hour === 0 ? "" : `${hour}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns with Events */}
          <div className="flex flex-1">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 relative border-l border-[var(--border)] first:border-l-0 ${
                    isWeekend(day) ? "bg-[var(--calendar-weekend)]" : ""
                  }`}
                >
                  {/* Hour Lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-[60px] border-b border-[var(--border)] border-dashed"
                    />
                  ))}

                  {/* Current Time Indicator */}
                  {isToday(day) && <CurrentTimeIndicator />}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const { top, height } = getEventPosition(event);
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`absolute left-1 right-1 px-2 py-1 rounded-md text-white text-xs font-medium overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-md ${getEventColor(
                          event.color
                        )}`}
                        style={{ top, height }}
                      >
                        <div className="truncate">{event.title}</div>
                        {height > 40 && (
                          <div className="text-[10px] opacity-80 truncate">
                            {format(event.startTime, "H:mm")} - {format(event.endTime, "H:mm")}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const hour = getHours(now);
  const minutes = getMinutes(now);
  const top = (hour + minutes / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="flex-1 h-[2px] bg-red-500" />
      </div>
    </div>
  );
}

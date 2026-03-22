"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  format,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  addMonths,
  subMonths,
  getYear,
  setMonth,
} from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEvent, ViewMode } from "./types";
import { TimelineView } from "./TimelineView";
import { MonthView } from "./MonthView";
import { YearView } from "./YearView";
import { CalendarHeader } from "./CalendarHeader";
import { EventModal } from "./EventModal";

const SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "チームミーティング",
    startTime: new Date(2026, 2, 22, 10, 0),
    endTime: new Date(2026, 2, 22, 11, 0),
    color: "work",
  },
  {
    id: "2",
    title: "ランチ",
    startTime: new Date(2026, 2, 22, 12, 0),
    endTime: new Date(2026, 2, 22, 13, 0),
    color: "personal",
  },
  {
    id: "3",
    title: "プロジェクトレビュー",
    startTime: new Date(2026, 2, 23, 14, 0),
    endTime: new Date(2026, 2, 23, 15, 30),
    color: "meeting",
  },
  {
    id: "4",
    title: "企画会議",
    startTime: new Date(2026, 2, 24, 9, 0),
    endTime: new Date(2026, 2, 24, 10, 0),
    color: "work",
  },
  {
    id: "5",
    title: "ジム",
    startTime: new Date(2026, 2, 25, 18, 0),
    endTime: new Date(2026, 2, 25, 19, 30),
    color: "personal",
  },
  {
    id: "6",
    title: "クライアント打ち合わせ",
    startTime: new Date(2026, 2, 26, 15, 0),
    endTime: new Date(2026, 2, 26, 16, 0),
    color: "meeting",
  },
  {
    id: "7",
    title: "週次報告",
    startTime: new Date(2026, 2, 27, 11, 0),
    endTime: new Date(2026, 2, 27, 12, 0),
    color: "work",
  },
];

export function BalumudaCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [events, setEvents] = useState<CalendarEvent[]>(SAMPLE_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrevious = useCallback(() => {
    switch (viewMode) {
      case "day":
        setCurrentDate((prev) => addDays(prev, -1));
        break;
      case "week":
        setCurrentDate((prev) => addDays(prev, -7));
        break;
      case "month":
        setCurrentDate((prev) => subMonths(prev, 1));
        break;
      case "year":
        setCurrentDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
        break;
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    switch (viewMode) {
      case "day":
        setCurrentDate((prev) => addDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => addDays(prev, 7));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, 1));
        break;
      case "year":
        setCurrentDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
        break;
    }
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setCurrentDate(date);
    if (viewMode === "year") {
      setViewMode("month");
    } else if (viewMode === "month") {
      setViewMode("week");
    }
  }, [viewMode]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleAddEvent = useCallback(() => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback((eventData: Omit<CalendarEvent, "id">) => {
    if (selectedEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? { ...eventData, id: selectedEvent.id } : e))
      );
    } else {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: Date.now().toString(),
      };
      setEvents((prev) => [...prev, newEvent]);
    }
    handleCloseModal();
  }, [selectedEvent, handleCloseModal]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    handleCloseModal();
  }, [handleCloseModal]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={handleViewChange}
        onAddEvent={handleAddEvent}
      />

      <div className="flex-1 overflow-hidden">
        {(viewMode === "day" || viewMode === "week") && (
          <TimelineView
            currentDate={currentDate}
            viewMode={viewMode}
            events={events}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
          />
        )}

        {viewMode === "month" && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
          />
        )}

        {viewMode === "year" && (
          <YearView
            currentDate={currentDate}
            events={events}
            onDateSelect={handleDateSelect}
          />
        )}
      </div>

      <EventModal
        isOpen={isModalOpen}
        event={selectedEvent}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

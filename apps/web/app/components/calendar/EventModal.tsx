"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarEvent, EventColor } from "./types";

interface EventModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (eventData: Omit<CalendarEvent, "id">) => void;
  onDelete: (id: string) => void;
}

const COLOR_OPTIONS: { value: EventColor; label: string; className: string }[] = [
  { value: "work", label: "仕事", className: "bg-[var(--calendar-event-work)]" },
  { value: "personal", label: "プライベート", className: "bg-[var(--calendar-event-personal)]" },
  { value: "meeting", label: "ミーティング", className: "bg-[var(--calendar-event-meeting)]" },
];

export function EventModal({ isOpen, event, onClose, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState<EventColor>("work");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(format(event.startTime, "yyyy-MM-dd"));
      setStartTime(format(event.startTime, "HH:mm"));
      setEndTime(format(event.endTime, "HH:mm"));
      setColor(event.color);
      setDescription(event.description || "");
    } else {
      const now = new Date();
      setTitle("");
      setDate(format(now, "yyyy-MM-dd"));
      setStartTime(format(now, "HH:00"));
      setEndTime(format(new Date(now.getTime() + 60 * 60 * 1000), "HH:00"));
      setColor("work");
      setDescription("");
    }
  }, [event, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const [year, month, day] = date.split("-").map(Number);
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
    const endDateTime = new Date(year, month - 1, day, endHour, endMinute);

    onSave({
      title,
      startTime: startDateTime,
      endTime: endDateTime,
      color,
      description: description || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--card)] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {event ? "予定を編集" : "新しい予定"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
            aria-label="閉じる"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="予定のタイトル"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-shadow"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-shadow"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">開始時刻</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">終了時刻</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-shadow"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-1.5">カテゴリ</label>
            <div className="flex gap-3">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
                    color === option.value
                      ? "border-[var(--ring)]"
                      : "border-transparent bg-[var(--muted)]"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${option.className}`} />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">メモ</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="メモを追加"
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-shadow resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {event ? (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                削除
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

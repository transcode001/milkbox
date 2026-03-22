export type ViewMode = "day" | "week" | "month" | "year";

export type EventColor = "work" | "personal" | "meeting";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: EventColor;
  description?: string;
  location?: string;
}

export interface WeatherData {
  date: Date;
  temp: number;
  condition: "sunny" | "cloudy" | "rainy" | "snowy";
}

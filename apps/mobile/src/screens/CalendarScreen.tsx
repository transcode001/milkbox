import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { SavedItem } from "@milkbox/shared/repositories/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Zoom levels: 0 = Day, 1 = Week, 2 = Month, 3 = Year
type ZoomLevel = 0 | 1 | 2 | 3;
const ZOOM_LABELS = ["Day", "Week", "Month", "Year"] as const;

// Hours to display
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Row height per zoom level (in pixels)
const ROW_HEIGHTS: Record<ZoomLevel, number> = {
  0: 80, // Day: 1 row = 1 day, tall
  1: 60, // Week: 7 rows
  2: 40, // Month: ~30 rows
  3: 20, // Year: ~365 rows
};

// Time column width per zoom level
const TIME_COL_WIDTHS: Record<ZoomLevel, number> = {
  0: (SCREEN_WIDTH - 60) / 24, // Day: show all 24 hours
  1: (SCREEN_WIDTH - 60) / 24, // Week: show all 24 hours
  2: (SCREEN_WIDTH - 60) / 6, // Month: show 6 time blocks (4h each)
  3: (SCREEN_WIDTH - 60) / 4, // Year: show 4 time blocks (6h each)
};

const DATE_COL_WIDTH = 60;

function toDateKey(value: string): string {
  return value.includes("T") ? value.split("T")[0] : value;
}

function parseHour(dateStr: string): number {
  if (dateStr.includes("T")) {
    const timePart = dateStr.split("T")[1];
    if (timePart) {
      const hour = parseInt(timePart.split(":")[0], 10);
      return isNaN(hour) ? 0 : hour;
    }
  }
  return 0;
}

function getDatesForZoom(baseDate: Date, zoom: ZoomLevel): Date[] {
  const dates: Date[] = [];
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  switch (zoom) {
    case 0: // Day: just 1 day
      dates.push(new Date(year, month, day));
      break;
    case 1: // Week: 7 days
      const weekStart = new Date(year, month, day - baseDate.getDay());
      for (let i = 0; i < 7; i++) {
        dates.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
      }
      break;
    case 2: // Month: all days in month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, month, i));
      }
      break;
    case 3: // Year: all days in year
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      for (let i = 0; i < totalDays; i++) {
        dates.push(new Date(year, 0, 1 + i));
      }
      break;
  }
  return dates;
}

function formatDateLabel(date: Date, zoom: ZoomLevel): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  switch (zoom) {
    case 0: // Day
      return `${month}/${day} (${weekdays[date.getDay()]})`;
    case 1: // Week
      return `${month}/${day}`;
    case 2: // Month
      return `${day}`;
    case 3: // Year
      if (day === 1) {
        return `${month}/${day}`;
      }
      return day % 7 === 1 ? `${day}` : "";
  }
}

function getTimeLabels(zoom: ZoomLevel): string[] {
  switch (zoom) {
    case 0:
    case 1:
      return HOURS.map((h) => `${h}:00`);
    case 2:
      return ["0-4", "4-8", "8-12", "12-16", "16-20", "20-24"];
    case 3:
      return ["Morning", "Noon", "Evening", "Night"];
  }
}

function getTimeBlockIndex(hour: number, zoom: ZoomLevel): number {
  switch (zoom) {
    case 0:
    case 1:
      return hour;
    case 2:
      return Math.floor(hour / 4);
    case 3:
      return Math.floor(hour / 6);
  }
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CalendarScreen = () => {
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1); // Start at Week view
  const [items, setItems] = useState<SavedItem[]>([]);
  const [dbManager] = useState(() => new DatabaseManager());

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  useEffect(() => {
    const initialize = async () => {
      await dbManager.initialize();
      const result = await dbManager.itemRepository.findAllWithCategory();
      setItems(result);
    };
    initialize();
  }, [dbManager]);

  const handleZoomChange = useCallback((newZoom: ZoomLevel) => {
    setZoomLevel(newZoom);
  }, []);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      const currentScale = scale.value;
      let newZoom = zoomLevel;

      // Zoom out (pinch in) - go to higher zoom level (more days)
      if (currentScale < 0.7 && zoomLevel < 3) {
        newZoom = (zoomLevel + 1) as ZoomLevel;
      }
      // Zoom in (pinch out) - go to lower zoom level (fewer days)
      else if (currentScale > 1.5 && zoomLevel > 0) {
        newZoom = (zoomLevel - 1) as ZoomLevel;
      }

      if (newZoom !== zoomLevel) {
        runOnJS(handleZoomChange)(newZoom);
      }

      scale.value = withSpring(1);
      savedScale.value = 1;
    });

  const dates = useMemo(() => getDatesForZoom(baseDate, zoomLevel), [baseDate, zoomLevel]);
  const timeLabels = useMemo(() => getTimeLabels(zoomLevel), [zoomLevel]);
  const rowHeight = ROW_HEIGHTS[zoomLevel];
  const colWidth = TIME_COL_WIDTHS[zoomLevel];

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, SavedItem[]>();
    for (const item of items) {
      const key = toDateKey(item.startDate ?? item.date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const headerLabel = useMemo(() => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + 1;

    switch (zoomLevel) {
      case 0:
        return `${year}/${month}/${baseDate.getDate()}`;
      case 1:
        return `${year}/${month} Week`;
      case 2:
        return `${year}/${month}`;
      case 3:
        return `${year}`;
    }
  }, [baseDate, zoomLevel]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{headerLabel}</Text>
          <View style={styles.zoomIndicator}>
            <Text style={styles.zoomText}>{ZOOM_LABELS[zoomLevel]}</Text>
          </View>
        </View>

        <Text style={styles.hint}>Pinch to zoom: Day - Week - Month - Year</Text>

        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={[styles.flex, animatedContainerStyle]}>
            <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View>
                  {/* Time header row */}
                  <View style={styles.timeHeaderRow}>
                    <View style={[styles.cornerCell, { width: DATE_COL_WIDTH }]}>
                      <Text style={styles.cornerText}>Date</Text>
                    </View>
                    {timeLabels.map((label, idx) => (
                      <View
                        key={`time-${idx}`}
                        style={[styles.timeHeaderCell, { width: colWidth }]}
                      >
                        <Text style={styles.timeHeaderText}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Date rows */}
                  {dates.map((date) => {
                    const dateKey = dateToKey(date);
                    const dayItems = itemsByDate.get(dateKey) ?? [];
                    const label = formatDateLabel(date, zoomLevel);
                    const isToday = dateKey === dateToKey(new Date());
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <View
                        key={dateKey}
                        style={[
                          styles.dateRow,
                          { height: rowHeight },
                          isWeekend && styles.weekendRow,
                        ]}
                      >
                        {/* Date label */}
                        <View
                          style={[
                            styles.dateLabelCell,
                            { width: DATE_COL_WIDTH },
                            isToday && styles.todayLabel,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateLabelText,
                              isToday && styles.todayLabelText,
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>

                        {/* Time slots */}
                        {timeLabels.map((_, idx) => {
                          // Find items in this time block
                          const blockItems = dayItems.filter((item) => {
                            const hour = parseHour(item.startDate ?? item.date);
                            return getTimeBlockIndex(hour, zoomLevel) === idx;
                          });

                          return (
                            <View
                              key={`${dateKey}-${idx}`}
                              style={[
                                styles.timeSlot,
                                { width: colWidth, height: rowHeight },
                              ]}
                            >
                              {blockItems.slice(0, zoomLevel <= 1 ? 3 : 1).map((item, i) => (
                                <View
                                  key={item.id}
                                  style={[
                                    styles.itemBlock,
                                    {
                                      backgroundColor: getItemColor(item.categoryName),
                                      top: i * (zoomLevel <= 1 ? 18 : 10),
                                    },
                                  ]}
                                >
                                  <Text
                                    style={styles.itemText}
                                    numberOfLines={1}
                                  >
                                    {item.text}
                                  </Text>
                                </View>
                              ))}
                              {blockItems.length > (zoomLevel <= 1 ? 3 : 1) && (
                                <View style={styles.moreIndicator}>
                                  <Text style={styles.moreText}>
                                    +{blockItems.length - (zoomLevel <= 1 ? 3 : 1)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

function getItemColor(category: string | null | undefined): string {
  const colors: Record<string, string> = {
    Work: "#3b82f6",
    Personal: "#10b981",
    Shopping: "#f59e0b",
    Health: "#ef4444",
  };
  return colors[category ?? ""] ?? "#6b7280";
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  zoomIndicator: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  hint: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  timeHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cornerCell: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  cornerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  timeHeaderCell: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  timeHeaderText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },
  dateRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  weekendRow: {
    backgroundColor: "#fef3c7",
  },
  dateLabelCell: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 4,
  },
  dateLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  todayLabel: {
    backgroundColor: "#3b82f6",
  },
  todayLabelText: {
    color: "#ffffff",
  },
  timeSlot: {
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
    padding: 2,
    position: "relative",
  },
  itemBlock: {
    position: "absolute",
    left: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    minHeight: 16,
  },
  itemText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "500",
  },
  moreIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#94a3b8",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  moreText: {
    fontSize: 9,
    color: "#ffffff",
    fontWeight: "600",
  },
});

export default CalendarScreen;

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
  },
  monthButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  calendarBody: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  dayCell: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dayCellSelected: {},
  dayCellMuted: {
    opacity: 0.45,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
    width: 28,
    height: 28,
    textAlign: "center",
    lineHeight: 28,
    borderRadius: 14,
  },
  dayNumberMuted: {
    color: "#9ca3af",
  },
  dayNumberSelected: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
  },
  dayNumberToday: {
    backgroundColor: "#dbeafe",
    color: "#2563eb",
  },
  dayMeta: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#9ca3af",
    marginHorizontal: 1,
  },
  eventDotRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  eventDotSelected: {
    backgroundColor: "#ffffff",
  },
  eventCount: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "600",
  },
  eventCountSelected: {
    color: "#ffffff",
  },
  scheduleHeader: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#e5edff",
  },
  todayButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  scheduleList: {
    paddingBottom: 8,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  scheduleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 20,
    paddingRight: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  scheduleCardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#4338ca",
    fontWeight: "600",
  },
  scheduleText: {
    fontSize: 15,
    color: "#111827",
    lineHeight: 22,
  },
});

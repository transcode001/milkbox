import { StyleSheet } from "react-native";
import { colors, radii, spacing } from "../tokens";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  weekNavButton: {
    padding: 8,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  periodGroup: {
    flexDirection: "row",
    width: "100%",
    marginTop: 12,
  },
  periodButton: {
    flex: 1,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  periodButtonJoined: {
    marginLeft: -1,
  },
  periodButtonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  periodButtonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  periodButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    zIndex: 1,
  },
  periodButtonPressedIOS: {
    opacity: 0.75,
  },
  periodButtonText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  periodButtonTextSelected: {
    color: colors.onPrimary,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.groupedBackground,
    padding: spacing.lg,
    borderRadius: radii.modal,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  heroNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  heroUnit: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  heroDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

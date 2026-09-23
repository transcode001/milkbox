import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import CalendarScreen from "../../src/screens/CalendarScreen";
import type { SavedItem } from "@milkbox/shared";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const ReactActual = jest.requireActual("react");
    ReactActual.useEffect(callback, [callback]);
  },
}));

const baseItem: SavedItem = {
  id: 1,
  text: "牛乳を買う",
  date: "2026-09-05",
  color: "#7986CB",
  notificationEnabled: false,
  notificationMinutesBefore: 30,
  priority: "medium",
};

const mockItemRepository = {
  findAllWithCategory: jest.fn().mockResolvedValue([]),
  findCompletionsForDate: jest.fn().mockResolvedValue(new Set()),
  setCompletion: jest.fn().mockResolvedValue(undefined),
};
const mockDbManager = {
  itemRepository: mockItemRepository,
  categoryRepository: { findAll: jest.fn().mockResolvedValue([]) },
};
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockDbManager, notificationsEnabled: true }),
}));

describe("CalendarScreen month view marks for non-weekday recurrence", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 10)); // 2026-09-10, so the visible month is September
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, startDate: "2026-09-05T09:00:00", recurrence: { type: "monthly" } },
    ]);
  });
  afterEach(() => jest.useRealTimers());

  it("counts a monthly-recurring item's occurrence day in the month grid's event marks", async () => {
    const { getByLabelText } = render(<CalendarScreen />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    expect(await waitFor(() => getByLabelText("2026-09-05 予定1件"))).toBeTruthy();
    expect(getByLabelText("2026-09-06 予定0件")).toBeTruthy();
  });
});

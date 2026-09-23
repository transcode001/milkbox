import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TagEditor } from "../../src/components/TagEditor";

describe("TagEditor", () => {
  it("reflects selection on existing tag chips and reports the toggled id", () => {
    const onToggleTag = jest.fn();
    const { getByRole } = render(
      <TagEditor
        allTags={[{ id: 1, name: "買い物" }, { id: 2, name: "急ぎ" }]}
        selectedTagIds={[1]}
        onToggleTag={onToggleTag}
        onCreateTag={jest.fn()}
      />,
    );

    expect(getByRole("checkbox", { name: "買い物" }).props.accessibilityState).toMatchObject({ checked: true });
    expect(getByRole("checkbox", { name: "急ぎ" }).props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(getByRole("checkbox", { name: "急ぎ" }));
    expect(onToggleTag).toHaveBeenCalledWith(2);
  });

  it("submits the typed name and clears the input once creation succeeds", async () => {
    const onCreateTag = jest.fn().mockResolvedValue(true);
    const { getByPlaceholderText, getByLabelText } = render(
      <TagEditor allTags={[]} selectedTagIds={[]} onToggleTag={jest.fn()} onCreateTag={onCreateTag} />,
    );

    const input = getByPlaceholderText("新しいタグ");
    fireEvent.changeText(input, "特売");
    fireEvent.press(getByLabelText("タグを追加"));

    expect(onCreateTag).toHaveBeenCalledWith("特売");
    await waitFor(() => expect(input.props.value).toBe(""));
  });

  it("keeps the typed name in the input when creation fails", async () => {
    const onCreateTag = jest.fn().mockResolvedValue(false);
    const { getByPlaceholderText, getByLabelText } = render(
      <TagEditor allTags={[]} selectedTagIds={[]} onToggleTag={jest.fn()} onCreateTag={onCreateTag} />,
    );

    const input = getByPlaceholderText("新しいタグ");
    fireEvent.changeText(input, "特売");
    fireEvent.press(getByLabelText("タグを追加"));

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("特売"));
    expect(input.props.value).toBe("特売");
  });

  it("ignores submitting a blank name", () => {
    const onCreateTag = jest.fn();
    const { getByLabelText } = render(
      <TagEditor allTags={[]} selectedTagIds={[]} onToggleTag={jest.fn()} onCreateTag={onCreateTag} />,
    );

    fireEvent.press(getByLabelText("タグを追加"));
    expect(onCreateTag).not.toHaveBeenCalled();
  });
});

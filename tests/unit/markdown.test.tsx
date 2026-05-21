import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { Markdown } from "@/lib/utils/markdown";

afterEach(cleanup);

describe("Markdown — GFM task lists", () => {
  it("renders GFM task-list items as checkboxes with the right checked state", () => {
    render(<Markdown source={"- [ ] a\n- [x] b"} />);
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.checked).toBe(false);
    expect(boxes[1]!.checked).toBe(true);
  });

  it("calls onToggleCheckbox with the document-order index when interactive", () => {
    const onToggle = vi.fn();
    render(
      <Markdown
        source={"- [ ] a\n- [x] b"}
        interactive
        onToggleCheckbox={onToggle}
      />,
    );
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0]!.disabled).toBe(false);

    fireEvent.click(boxes[0]!);
    expect(onToggle).toHaveBeenCalledWith(0);

    fireEvent.click(boxes[1]!);
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it("keeps checkboxes disabled when not interactive", () => {
    render(<Markdown source={"- [ ] a"} />);
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    expect(box.disabled).toBe(true);
  });
});

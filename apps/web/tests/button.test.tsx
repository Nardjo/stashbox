import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "/Users/jordanbastin/Developer/stashbox/apps/web/src/components/ui/button.tsx";

describe("Button (shadcn/ui)", () => {
  it("renders without error", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });
});

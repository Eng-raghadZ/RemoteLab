import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultsPanel from "./ResultsPanel";

describe("ResultsPanel", () => {
  it("renders nothing when there's no resultRef", () => {
    const { container } = render(<ResultsPanel resultRef={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders registers, execution time, and note from a well-formed resultRef", () => {
    render(
      <ResultsPanel
        resultRef={JSON.stringify({
          registers: { AX: "0004", BX: "0000" },
          executionTimeMs: 2500,
          note: "Simulated result — no real hardware connected yet.",
        })}
      />
    );

    expect(screen.getByText("Execution Results")).toBeInTheDocument();
    expect(screen.getByText("AX")).toBeInTheDocument();
    expect(screen.getByText("0004")).toBeInTheDocument();
    expect(screen.getByText("BX")).toBeInTheDocument();
    expect(screen.getByText("0000")).toBeInTheDocument();
    expect(screen.getByText("2.5s")).toBeInTheDocument();
    expect(screen.getByText(/Simulated result/)).toBeInTheDocument();
  });

  it("formats sub-second execution times in milliseconds", () => {
    render(
      <ResultsPanel resultRef={JSON.stringify({ registers: { AX: "0000" }, executionTimeMs: 450 })} />
    );
    expect(screen.getByText("450ms")).toBeInTheDocument();
  });

  it("falls back to raw text when resultRef isn't valid JSON", () => {
    render(<ResultsPanel resultRef="not json at all" />);
    expect(screen.getByText("Result Data")).toBeInTheDocument();
    expect(screen.getByText("not json at all")).toBeInTheDocument();
  });

  it("falls back to raw pretty-printed JSON when parsed but no known fields are present", () => {
    render(<ResultsPanel resultRef={JSON.stringify({ somethingElse: true })} />);
    expect(screen.getByText("Execution Results")).toBeInTheDocument();
    expect(screen.getByText(/"somethingElse": true/)).toBeInTheDocument();
  });
});

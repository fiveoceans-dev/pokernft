import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { rankHandFromJson } from "../handEvaluator";
import type {
  HandEvaluatorRequest,
  HandEvaluatorResponse,
} from "../jsonFormats";

describe("HandEvaluator JSON interface", () => {
  it("evaluates hand from JSON", () => {
    const file = path.join(__dirname, "data", "handEvaluator.json");
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw) as HandEvaluatorRequest & {
      expected: HandEvaluatorResponse;
    };
    const result = rankHandFromJson({ cards: data.cards });
    expect(result.rankValue).toBe(data.expected.rankValue);
    expect(result.bestCards).toEqual(data.expected.bestCards);
  });
});

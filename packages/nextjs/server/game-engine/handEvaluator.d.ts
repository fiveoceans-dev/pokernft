import type { Card } from "./types";
import type { HandEvaluatorRequest, HandEvaluatorResponse } from "./jsonFormats";
export interface RankedHand {
    rankValue: number;
    bestCards: Card[];
}
export declare function rankHand(cards: Card[]): RankedHand;
export declare function compareHands(a: RankedHand, b: RankedHand): number;
export declare function rankHandFromJson(input: HandEvaluatorRequest): HandEvaluatorResponse;

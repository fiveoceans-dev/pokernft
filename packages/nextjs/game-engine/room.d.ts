import { GameRoom, PlayerSession } from "./types";
/** Create an empty game room */
export declare function createRoom(id: string, minBet?: number): GameRoom;
/** Add a player to an existing room */
export declare function addPlayer(room: GameRoom, player: Omit<PlayerSession, "isDealer" | "isTurn" | "hand" | "hasFolded" | "currentBet" | "tableId">): PlayerSession;
/**
 * Start a new hand at the room level and deal cards. Requires at least
 * two players to be seated with chips. Updates dealer/button positions
 * and posts blinds via {@link BlindManager}.
 */
export declare function startRoomHand(room: GameRoom): void;
/** Handle a player's betting action */
export declare function handleAction(room: GameRoom, playerId: string, action: {
    type: "fold" | "call" | "raise" | "check";
    amount?: number;
}): void;
/** Advance turn to the next active player */
export declare function nextTurn(room: GameRoom): void;
/** Progress to the next betting street and deal community cards */
export declare function progressStage(room: GameRoom): void;
/** Determine the winners of the current room */
export declare function determineWinners(room: GameRoom): PlayerSession[];
/**
 * Determine if the current betting round within a room is complete.
 * A round is complete when all active players have matched the highest bet
 * or are all-in, and the turn has returned to the appropriate player.
 */
export declare function isRoomRoundComplete(room: GameRoom): boolean;
/** Split the pot equally amongst winners */
export declare function payout(room: GameRoom, winners: PlayerSession[]): void;

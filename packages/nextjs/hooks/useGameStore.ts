// src/hooks/useGameStore.ts
import { create } from "zustand";
import { getTableStateContract } from "../services/starknet";
import type { Contract } from "starknet";

/**
 * GameState shape for our poker MVP:
 *  - players: an array of up to 9 addresses (or null if seat empty)
 *  - community: an array of up to 5 card‐codes (number) or null if not yet dealt
 *  - street: [0..4] indicating preflop (0), flop (1), turn (2), river (3), showdown (4)
 *  - loading / error flags
 *  - actions: reloadTableState, joinSeat, startHand, dealFlop, dealTurn, dealRiver
 */
interface GameState {
  players: (string | null)[];
  community: (number | null)[];
  street: number;
  loading: boolean;
  error: string | null;

  // Actions
  reloadTableState: () => Promise<void>;
  joinSeat: (seatIdx: number) => Promise<void>;
  startHand: () => Promise<void>;
  dealFlop: () => Promise<void>;
  dealTurn: () => Promise<void>;
  dealRiver: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  players: Array(9).fill(null),
  community: Array(5).fill(null),
  street: 0,
  loading: false,
  error: null,

  // Reload all on-chain state for players, community, and street
  reloadTableState: async () => {
    set({ loading: true, error: null });
    try {
      const table: Contract = await getTableStateContract();

      // 1) Read all seats
      const newPlayers: (string | null)[] = [];
      for (let i = 0; i < 9; i++) {
        // get_player_info(seat_idx: felt) → (owner: felt, hole1: felt, hole2: felt, revealed: felt)
        const res: any = await table.call("get_player_info", [BigInt(i)]);
        const ownerAddr: string = res.owner.toString();
        newPlayers[i] = ownerAddr === "0x0" ? null : ownerAddr;
      }

      // 2) Read board state (community cards + street)
      // get_board_state() → ( current_street: felt, community_cards: Array<felt>, active_seats: Array<felt> )
      const boardRes: any = await table.call("get_board_state", []);
      const street: number = Number(boardRes.current_street);

      const commArr: (number | null)[] = [];
      for (let i = 0; i < boardRes.community_cards.length; i++) {
        commArr[i] = Number(boardRes.community_cards[i]);
      }
      for (let i = boardRes.community_cards.length; i < 5; i++) {
        commArr[i] = null;
      }

      set({
        players: newPlayers,
        community: commArr,
        street,
        loading: false,
      });
    } catch (err: any) {
      console.error(err);
      set({ error: "Failed to reload table state", loading: false });
    }
  },

  // Seat the connected user at a given seat index
  joinSeat: async (seatIdx: number) => {
    set({ loading: true, error: null });
    try {
      const table: Contract = await getTableStateContract();
      // invoke("take_seat", [seat_idx])
      await table.invoke("take_seat", [BigInt(seatIdx)]);
      await get().reloadTableState();
      const count = get().players.filter((p) => p).length;
      set({ loading: false });
      if (count >= 2) {
        await get().startHand();
      }
    } catch (err: any) {
      console.error(err);
      set({ error: "Failed to join seat", loading: false });
    }
  },

  // Deal hole cards to all seated players
  startHand: async () => {
    set({ loading: true, error: null });
    try {
      const table: Contract = await getTableStateContract();
      // invoke("start_hand", [])
      await table.invoke("start_hand", []);
      await get().reloadTableState();
    } catch (err: any) {
      console.error(err);
      set({ error: "start_hand failed", loading: false });
    }
  },

  // Reveal the flop (three community cards)
  dealFlop: async () => {
    set({ loading: true, error: null });
    try {
      const table: Contract = await getTableStateContract();
      await table.invoke("deal_flop", []);
      await get().reloadTableState();
    } catch (err: any) {
      console.error(err);
      set({ error: "dealFlop failed", loading: false });
    }
  },

  // Reveal the turn (4th community card)
  dealTurn: async () => {
    set({ loading: true, error: null });
    try {
      const table: Contract = await getTableStateContract();
      await table.invoke("deal_turn", []);
      await get().reloadTableState();
    } catch (err: any) {
      console.error(err);
      set({ error: "dealTurn failed", loading: false });
    }
  },

  // Reveal the river (5th community card)
  dealRiver: async () => {
    set({ loading: true, error: null });
    try {
      const table: Contract = await getTableStateContract();
      await table.invoke("deal_river", []);
      await get().reloadTableState();
    } catch (err: any) {
      console.error(err);
      set({ error: "dealRiver failed", loading: false });
    }
  },
}));

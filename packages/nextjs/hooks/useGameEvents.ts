import { useEffect } from "react";
import { seatStore } from "../stores/seatStore";
import { useGameStore } from "./useGameStore";
import { shortAddress } from "../utils/address";
import type { ServerEvent } from "../game-engine";

export function useGameEvents() {
  const socket = useGameStore((s) => s.socket);
  const tableId = useGameStore((s) => s.tableId);
  const connectionState = useGameStore((s) => s.connectionState);

  useEffect(() => {
    if (!socket) return;

    const handler = (event: MessageEvent) => {
      let msg: ServerEvent;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (tableId && msg.tableId && msg.tableId !== tableId) return;

      switch (msg.type) {
        case "PLAYER_JOINED":
        case "PLAYER_REJOINED":
        case "PLAYER_WAITING":
          seatStore.getState().assignSeat(msg.seat, {
            playerId: msg.playerId,
            name: (msg as any).nickname || shortAddress(msg.playerId),
          });
          break;
        case "PLAYER_LEFT":
        case "PLAYER_DISCONNECTED":
          seatStore.getState().clearSeat(msg.seat);
          break;
        case "TABLE_SNAPSHOT":
          if (connectionState !== "connected") {
            const api = seatStore.getState();
            api.reset();
            const table: any = (msg as any).table;
            table?.seats?.forEach((seat: any, idx: number) => {
              if (seat?.pid) {
                api.assignSeat(idx, {
                  playerId: seat.pid,
                  name: seat.nickname || shortAddress(seat.pid),
                });
              }
            });
          }
          break;
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [socket, tableId, connectionState]);
}

export default useGameEvents;

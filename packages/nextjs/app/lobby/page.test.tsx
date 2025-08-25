import { render, screen } from "@testing-library/react";
import LobbyPage from "./page";
import { expect, test } from "vitest";

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor() {
    setTimeout(() => this.onopen && this.onopen(), 0);
  }
  send() {
    const payload = {
      tableId: "",
      type: "TABLE_LIST",
      tables: [{ id: "demo", name: "Demo" }],
    };
    setTimeout(
      () => this.onmessage && this.onmessage({ data: JSON.stringify(payload) }),
      0,
    );
  }
  close() {}
}

// @ts-ignore
global.WebSocket = MockWebSocket;

test("renders lobby with table links", async () => {
  render(<LobbyPage />);
  expect(screen.getByText("Lobby")).toBeInTheDocument();
  const link = await screen.findByRole("link", { name: "Join" });
  expect(link).toHaveAttribute("href", "/play?table=demo");
});

import { TimerManager, TIMER_CONFIG } from "../data-structures/TimerManager";

describe("TimerManager", () => {
  let timerManager: TimerManager;

  beforeEach(() => {
    timerManager = new TimerManager();
    jest.useFakeTimers();
  });

  afterEach(() => {
    timerManager.clearAllTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("Game Start Timer", () => {
    it("should start game after 10 seconds", () => {
      const gameStartCallback = jest.fn();
      const countdownSpy = jest.fn();
      
      timerManager.on('game-start-countdown', countdownSpy);
      timerManager.startGameCountdown(gameStartCallback);

      expect(timerManager.isGameStartActive()).toBe(true);
      
      // Initial countdown event
      expect(countdownSpy).toHaveBeenCalledWith(TIMER_CONFIG.GAME_START_DELAY);
      
      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);
      
      // Game shouldn't start yet
      expect(gameStartCallback).not.toHaveBeenCalled();
      expect(timerManager.isGameStartActive()).toBe(true);
      
      // Advance remaining time
      jest.advanceTimersByTime(5000);
      
      // Game should start now
      expect(gameStartCallback).toHaveBeenCalledTimes(1);
      expect(timerManager.isGameStartActive()).toBe(false);
    });

    it("should cancel game start countdown", () => {
      const gameStartCallback = jest.fn();
      const cancelledSpy = jest.fn();
      
      timerManager.on('game-start-cancelled', cancelledSpy);
      timerManager.startGameCountdown(gameStartCallback);
      
      expect(timerManager.isGameStartActive()).toBe(true);
      
      // Cancel after 3 seconds
      jest.advanceTimersByTime(3000);
      timerManager.cancelGameStart();
      
      expect(cancelledSpy).toHaveBeenCalledTimes(1);
      expect(timerManager.isGameStartActive()).toBe(false);
      
      // Advance remaining time
      jest.advanceTimersByTime(7000);
      
      // Game should not start
      expect(gameStartCallback).not.toHaveBeenCalled();
    });

    it("should emit countdown events", () => {
      const countdownSpy = jest.fn();
      
      timerManager.on('game-start-countdown', countdownSpy);
      timerManager.startGameCountdown(() => {});
      
      // Clear initial call
      countdownSpy.mockClear();
      
      // Advance by 1 second intervals
      for (let i = 1; i <= 10; i++) {
        jest.advanceTimersByTime(1000);
      }
      
      // Should have received multiple countdown updates
      expect(countdownSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe("Showdown Timer", () => {
    it("should start new hand after 5 seconds", () => {
      const newHandCallback = jest.fn();
      const completeSpy = jest.fn();
      
      timerManager.on('showdown-complete', completeSpy);
      timerManager.startShowdownTimer(newHandCallback);
      
      expect(timerManager.isShowdownActive()).toBe(true);
      
      // Advance time by 5 seconds
      jest.advanceTimersByTime(TIMER_CONFIG.SHOWDOWN_TO_NEW_HAND);
      
      // New hand should start
      expect(newHandCallback).toHaveBeenCalledTimes(1);
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(timerManager.isShowdownActive()).toBe(false);
    });

    it("should emit showdown countdown events", () => {
      const countdownSpy = jest.fn();
      
      timerManager.on('showdown-countdown', countdownSpy);
      timerManager.startShowdownTimer(() => {});
      
      // Initial event
      expect(countdownSpy).toHaveBeenCalledWith(TIMER_CONFIG.SHOWDOWN_TO_NEW_HAND);
      
      countdownSpy.mockClear();
      
      // Advance time
      jest.advanceTimersByTime(2000);
      
      // Should have countdown updates
      expect(countdownSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe("Action Timer", () => {
    it("should timeout after 15 seconds", () => {
      const timeoutCallback = jest.fn();
      const timeoutSpy = jest.fn();
      const playerId = "player1";
      
      timerManager.on('action-timeout', timeoutSpy);
      timerManager.startActionTimer(playerId, timeoutCallback);
      
      expect(timerManager.isActionTimerActive()).toBe(true);
      expect(timerManager.getCurrentActionPlayer()).toBe(playerId);
      
      // Advance time by 15 seconds
      jest.advanceTimersByTime(TIMER_CONFIG.ACTION_TIMEOUT);
      
      // Should timeout
      expect(timeoutCallback).toHaveBeenCalledTimes(1);
      expect(timeoutSpy).toHaveBeenCalledWith(playerId);
      expect(timerManager.isActionTimerActive()).toBe(false);
      expect(timerManager.getCurrentActionPlayer()).toBeNull();
    });

    it("should clear action timer when player acts", () => {
      const timeoutCallback = jest.fn();
      const playerId = "player1";
      
      timerManager.startActionTimer(playerId, timeoutCallback);
      
      expect(timerManager.isActionTimerActive()).toBe(true);
      
      // Player acts after 5 seconds
      jest.advanceTimersByTime(5000);
      timerManager.clearActionTimer();
      
      expect(timerManager.isActionTimerActive()).toBe(false);
      expect(timerManager.getCurrentActionPlayer()).toBeNull();
      
      // Advance remaining time
      jest.advanceTimersByTime(10000);
      
      // Should not timeout
      expect(timeoutCallback).not.toHaveBeenCalled();
    });

    it("should emit warning at 5 seconds remaining", () => {
      const warningSpy = jest.fn();
      const countdownSpy = jest.fn();
      const playerId = "player1";
      
      timerManager.on('action-warning', warningSpy);
      timerManager.on('action-countdown', countdownSpy);
      timerManager.startActionTimer(playerId, () => {});
      
      // Advance to warning threshold (10 seconds, leaving 5)
      jest.advanceTimersByTime(10000);
      
      // Should have emitted warning
      expect(warningSpy).toHaveBeenCalledWith(playerId, expect.any(Number));
    });

    it("should emit countdown events", () => {
      const countdownSpy = jest.fn();
      const playerId = "player1";
      
      timerManager.on('action-countdown', countdownSpy);
      timerManager.startActionTimer(playerId, () => {});
      
      // Initial event
      expect(countdownSpy).toHaveBeenCalledWith(playerId, TIMER_CONFIG.ACTION_TIMEOUT);
      
      countdownSpy.mockClear();
      
      // Advance by seconds
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(1000);
      }
      
      // Should have multiple countdown events
      expect(countdownSpy.mock.calls.length).toBeGreaterThan(0);
      countdownSpy.mock.calls.forEach(call => {
        expect(call[0]).toBe(playerId);
        expect(call[1]).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Multiple Timers", () => {
    it("should handle multiple timer types simultaneously", () => {
      const gameStartCallback = jest.fn();
      const showdownCallback = jest.fn();
      const actionCallback = jest.fn();
      
      // Start all timers
      timerManager.startGameCountdown(gameStartCallback);
      timerManager.startShowdownTimer(showdownCallback);
      timerManager.startActionTimer("player1", actionCallback);
      
      expect(timerManager.isGameStartActive()).toBe(true);
      expect(timerManager.isShowdownActive()).toBe(true);
      expect(timerManager.isActionTimerActive()).toBe(true);
      
      // Clear all
      timerManager.clearAllTimers();
      
      expect(timerManager.isGameStartActive()).toBe(false);
      expect(timerManager.isShowdownActive()).toBe(false);
      expect(timerManager.isActionTimerActive()).toBe(false);
      
      // Advance time
      jest.advanceTimersByTime(20000);
      
      // None should trigger
      expect(gameStartCallback).not.toHaveBeenCalled();
      expect(showdownCallback).not.toHaveBeenCalled();
      expect(actionCallback).not.toHaveBeenCalled();
    });
  });

  describe("Debug Info", () => {
    it("should provide debug information", () => {
      const debug = timerManager.getDebugInfo();
      
      expect(debug).toHaveProperty('gameStartActive', false);
      expect(debug).toHaveProperty('showdownActive', false);
      expect(debug).toHaveProperty('actionTimerActive', false);
      expect(debug).toHaveProperty('currentActionPlayer', null);
      expect(debug).toHaveProperty('timers');
      
      // Start some timers
      timerManager.startGameCountdown(() => {});
      timerManager.startActionTimer("player1", () => {});
      
      const debugWithTimers = timerManager.getDebugInfo();
      expect(debugWithTimers).toMatchObject({
        gameStartActive: true,
        actionTimerActive: true,
        currentActionPlayer: "player1"
      });
    });
  });
});
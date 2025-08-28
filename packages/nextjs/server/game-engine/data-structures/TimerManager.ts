import { EventEmitter } from "events";

/**
 * Timer configuration constants
 */
export const TIMER_CONFIG = {
  GAME_START_DELAY: 10_000,      // 10 seconds to start game with 2+ players
  SHOWDOWN_TO_NEW_HAND: 5_000,   // 5 seconds between showdown and new hand
  DEFAULT_ACTION_TIMEOUT: 15_000, // Default 15 seconds for player action (can be overridden)
  WARNING_THRESHOLD: 5_000,      // Show warning at 5 seconds remaining
  COUNTDOWN_INTERVAL: 1_000      // Update countdown every second
} as const;

/**
 * Timer events for UI feedback
 */
export interface TimerEvents {
  'game-start-countdown': (remainingMs: number) => void;
  'game-start-cancelled': () => void;
  'game-start-triggered': () => void;
  'showdown-countdown': (remainingMs: number) => void;
  'showdown-complete': () => void;
  'action-countdown': (playerId: string, remainingMs: number) => void;
  'action-warning': (playerId: string, remainingMs: number) => void;
  'action-timeout': (playerId: string) => void;
}

/**
 * Manages all game timers with event emission for UI feedback
 * Handles game start countdown, showdown transitions, and player action timeouts
 */
export class TimerManager extends EventEmitter {
  private gameStartTimer: NodeJS.Timeout | null = null;
  private gameStartCountdown: NodeJS.Timeout | null = null;
  private showdownTimer: NodeJS.Timeout | null = null;
  private showdownCountdown: NodeJS.Timeout | null = null;
  private actionTimer: NodeJS.Timeout | null = null;
  private actionCountdown: NodeJS.Timeout | null = null;
  private currentActionPlayerId: string | null = null;
  private actionTimeoutMs: number = TIMER_CONFIG.DEFAULT_ACTION_TIMEOUT;

  /**
   * Set the action timeout duration in milliseconds
   */
  public setActionTimeout(timeoutMs: number): void {
    this.actionTimeoutMs = timeoutMs;
  }

  /**
   * Start 10-second countdown to begin game when 2+ players are seated
   */
  public startGameCountdown(onGameStart: () => void): void {
    this.cancelGameStart();
    
    const startTime = Date.now();
    console.log('🕐 Starting 10-second game countdown');
    
    // Emit initial countdown
    this.emit('game-start-countdown', TIMER_CONFIG.GAME_START_DELAY);
    
    // Start countdown updates
    this.gameStartCountdown = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, TIMER_CONFIG.GAME_START_DELAY - elapsed);
      
      this.emit('game-start-countdown', remaining);
      
      if (remaining <= 0) {
        this.clearInterval(this.gameStartCountdown);
        this.gameStartCountdown = null;
      }
    }, TIMER_CONFIG.COUNTDOWN_INTERVAL);
    
    // Start actual game timer
    this.gameStartTimer = setTimeout(() => {
      this.clearInterval(this.gameStartCountdown);
      this.gameStartCountdown = null;
      this.gameStartTimer = null;
      
      console.log('⏰ Game start timer triggered');
      this.emit('game-start-triggered');
      onGameStart();
    }, TIMER_CONFIG.GAME_START_DELAY);
  }

  /**
   * Cancel game start countdown (e.g., if players drop below 2)
   */
  public cancelGameStart(): void {
    if (this.gameStartTimer) {
      clearTimeout(this.gameStartTimer);
      this.gameStartTimer = null;
    }
    
    if (this.gameStartCountdown) {
      clearInterval(this.gameStartCountdown);
      this.gameStartCountdown = null;
    }
    
    console.log('❌ Game start countdown cancelled');
    this.emit('game-start-cancelled');
  }

  /**
   * Start 5-second timer after showdown completes before starting new hand
   */
  public startShowdownTimer(onNewHand: () => void): void {
    this.clearShowdownTimer();
    
    const startTime = Date.now();
    console.log('🕐 Starting 5-second showdown timer');
    
    // Emit initial countdown
    this.emit('showdown-countdown', TIMER_CONFIG.SHOWDOWN_TO_NEW_HAND);
    
    // Start countdown updates
    this.showdownCountdown = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, TIMER_CONFIG.SHOWDOWN_TO_NEW_HAND - elapsed);
      
      this.emit('showdown-countdown', remaining);
      
      if (remaining <= 0) {
        this.clearInterval(this.showdownCountdown);
        this.showdownCountdown = null;
      }
    }, TIMER_CONFIG.COUNTDOWN_INTERVAL);
    
    // Start actual showdown timer
    this.showdownTimer = setTimeout(() => {
      this.clearInterval(this.showdownCountdown);
      this.showdownCountdown = null;
      this.showdownTimer = null;
      
      console.log('⏰ Showdown timer complete - starting new hand');
      this.emit('showdown-complete');
      onNewHand();
    }, TIMER_CONFIG.SHOWDOWN_TO_NEW_HAND);
  }

  /**
   * Clear showdown timer
   */
  public clearShowdownTimer(): void {
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
    }
    
    if (this.showdownCountdown) {
      clearInterval(this.showdownCountdown);
      this.showdownCountdown = null;
    }
  }

  /**
   * Start 15-second action timer for current player
   */
  public startActionTimer(playerId: string, onTimeout: () => void): void {
    this.clearActionTimer();
    
    this.currentActionPlayerId = playerId;
    const startTime = Date.now();
    console.log(`🕐 [TimerManager] Starting ${this.actionTimeoutMs/1000}s action timer for ${playerId}`);
    
    // Emit initial countdown
    this.emit('action-countdown', playerId, this.actionTimeoutMs);
    
    // Start countdown updates
    this.actionCountdown = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, this.actionTimeoutMs - elapsed);
      
      this.emit('action-countdown', playerId, remaining);
      
      // Emit warning at 5 seconds
      if (remaining <= TIMER_CONFIG.WARNING_THRESHOLD && remaining > TIMER_CONFIG.WARNING_THRESHOLD - TIMER_CONFIG.COUNTDOWN_INTERVAL) {
        console.log(`⚠️ [TimerManager] Warning threshold reached for ${playerId}: ${remaining}ms`);
        this.emit('action-warning', playerId, remaining);
      }
      
      if (remaining <= 0) {
        this.clearInterval(this.actionCountdown);
        this.actionCountdown = null;
      }
    }, TIMER_CONFIG.COUNTDOWN_INTERVAL);
    
    // Start actual action timer
    this.actionTimer = setTimeout(() => {
      this.clearInterval(this.actionCountdown);
      this.actionCountdown = null;
      this.actionTimer = null;
      
      console.log(`⏰ [TimerManager] Action timer expired for player ${playerId}`);
      this.emit('action-timeout', playerId);
      this.currentActionPlayerId = null;
      
      // Execute callback with error handling and recovery
      try {
        console.log(`🎮 [TimerManager] Executing timeout callback for ${playerId}`);
        onTimeout();
        console.log(`✅ [TimerManager] Timeout callback completed successfully for ${playerId}`);
      } catch (error) {
        console.error(`❌ [TimerManager] Timeout callback failed for ${playerId}:`, {
          playerId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        
        // Emit error event so GameEngine can handle it
        this.emit('timeout-callback-error', { playerId, error });
      }
    }, this.actionTimeoutMs);
  }

  /**
   * Clear action timer (called when player acts)
   */
  public clearActionTimer(): void {
    const wasActive = !!this.actionTimer || !!this.actionCountdown;
    const prevPlayerId = this.currentActionPlayerId;
    
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
    
    if (this.actionCountdown) {
      clearInterval(this.actionCountdown);
      this.actionCountdown = null;
    }
    
    this.currentActionPlayerId = null;
    
    if (wasActive) {
      console.log(`🛑 [TimerManager] Action timer cleared for ${prevPlayerId}`);
    }
  }

  /**
   * Check if game start countdown is active
   */
  public isGameStartActive(): boolean {
    return this.gameStartTimer !== null;
  }

  /**
   * Check if showdown timer is active
   */
  public isShowdownActive(): boolean {
    return this.showdownTimer !== null;
  }

  /**
   * Check if action timer is active
   */
  public isActionTimerActive(): boolean {
    return this.actionTimer !== null;
  }

  /**
   * Get current action player ID (if any)
   */
  public getCurrentActionPlayer(): string | null {
    return this.currentActionPlayerId;
  }

  /**
   * Clear all active timers
   */
  public clearAllTimers(): void {
    this.cancelGameStart();
    this.clearShowdownTimer();
    this.clearActionTimer();
  }

  /**
   * Get debug information about active timers
   */
  public getDebugInfo(): object {
    return {
      gameStartActive: this.isGameStartActive(),
      showdownActive: this.isShowdownActive(),
      actionTimerActive: this.isActionTimerActive(),
      currentActionPlayer: this.currentActionPlayerId,
      timers: {
        gameStart: !!this.gameStartTimer,
        gameStartCountdown: !!this.gameStartCountdown,
        showdown: !!this.showdownTimer,
        showdownCountdown: !!this.showdownCountdown,
        action: !!this.actionTimer,
        actionCountdown: !!this.actionCountdown
      }
    };
  }

  /**
   * Helper to clear interval safely
   */
  private clearInterval(timer: NodeJS.Timeout | null): void {
    if (timer) {
      clearInterval(timer);
    }
  }
}
/**
 * Timer Events System for Event-Driven Poker Engine
 * 
 * Event-sourced timer management:
 * - TurnStarted(player, deadline) events
 * - TimeoutAutoFold(player) events
 * - Clean separation from game logic
 * - Deterministic timeout handling
 */

import { EventEmitter } from "events";
import { TimerEvent } from '../core/types';
import { ACTION_TIMEOUT_MS } from '../core/constants';

/**
 * Timer state for active timers
 */
interface ActiveTimer {
  pid: string;
  seat: number;
  startTime: number;
  deadline: number;
  timeoutMs: number;
  nodeTimer: NodeJS.Timeout;
}

/**
 * Timer event types
 */
export type TimerEventType = 
  | { type: "TurnStarted"; pid: string; seat: number; deadline: number }
  | { type: "TimeoutWarning"; pid: string; seat: number; remainingMs: number }
  | { type: "TimeoutAutoFold"; pid: string; seat: number }
  | { type: "TimerCleared"; pid: string; seat: number; reason: string };

/**
 * Event-sourced timer manager
 * Emits timer events instead of directly calling game functions
 */
export class TimerEventManager extends EventEmitter {
  private activeTimers = new Map<string, ActiveTimer>();
  private defaultTimeoutMs: number;
  private warningThresholdMs: number;

  constructor(defaultTimeoutMs = ACTION_TIMEOUT_MS, warningThresholdMs = 5000) {
    super();
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.warningThresholdMs = warningThresholdMs;
    
    console.log(`⏰ [TimerEventManager] Initialized with ${defaultTimeoutMs}ms timeout (from env)`);
  }

  /**
   * Start action timer for player
   * Emits TurnStarted event and schedules timeout
   */
  startActionTimer(timerData: TimerEvent): void {
    const { pid, seat, actionTimeoutMs } = timerData;
    const timeoutMs = actionTimeoutMs || this.defaultTimeoutMs;
    const deadline = Date.now() + timeoutMs;
    
    // Clear any existing timer for this player AND any other active timers
    // This ensures only one timer is active at a time
    this.clearAllTimers("new-timer-starting");
    console.log(`⏰ [TimerEventManager] Starting timer for ${pid} at seat ${seat} (${timeoutMs}ms)`);
    
    // Create timeout handler
    const nodeTimer = setTimeout(() => {
      this.handleTimeout(pid, seat);
    }, timeoutMs);
    
    // Store active timer with metadata
    this.activeTimers.set(pid, {
      pid,
      seat,
      startTime: Date.now(),
      deadline,
      timeoutMs,
      nodeTimer
    });
    
    console.log(`⏰ [TimerEventManager] Timer stored for ${pid}, active timers: ${this.activeTimers.size}`);
    
    // Emit turn started event
    this.emit('timerEvent', {
      type: "TurnStarted",
      pid,
      seat,
      deadline
    } as TimerEventType);
    
    // Schedule warning if applicable
    if (timeoutMs > this.warningThresholdMs) {
      const warningDelay = timeoutMs - this.warningThresholdMs;
      setTimeout(() => {
        if (this.activeTimers.has(pid)) {
          this.emitWarning(pid, seat);
        }
      }, warningDelay);
    }
    
    console.log(`⏰ [TimerEventManager] Started ${timeoutMs}ms timer for ${pid} at seat ${seat}`);
  }

  /**
   * Clear timer for specific player
   */
  clearTimer(pid: string, reason = "action-taken"): boolean {
    const timer = this.activeTimers.get(pid);
    
    if (!timer) {
      console.log(`⏰ [TimerEventManager] No active timer to clear for ${pid} (${reason})`);
      return false; // No active timer
    }
    
    console.log(`⏰ [TimerEventManager] Clearing timer for ${pid} at seat ${timer.seat} (${reason})`);
    
    // Clear Node.js timeout
    clearTimeout(timer.nodeTimer);
    
    // Remove from active timers
    this.activeTimers.delete(pid);
    
    // Emit timer cleared event
    this.emit('timerEvent', {
      type: "TimerCleared",
      pid: timer.pid,
      seat: timer.seat,
      reason
    } as TimerEventType);
    
    console.log(`⏰ [TimerEventManager] Cleared timer for ${pid}: ${reason}`);
    return true;
  }

  /**
   * Clear all active timers
   */
  clearAllTimers(reason = "table-reset"): number {
    const clearedCount = this.activeTimers.size;
    
    for (const [pid] of this.activeTimers) {
      this.clearTimer(pid, reason);
    }
    
    console.log(`⏰ [TimerEventManager] Cleared ${clearedCount} timers: ${reason}`);
    return clearedCount;
  }

  /**
   * Get remaining time for player
   */
  getRemainingTime(pid: string): number {
    const timer = this.activeTimers.get(pid);
    
    if (!timer) {
      return 0;
    }
    
    const remaining = timer.deadline - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if player has active timer
   */
  hasActiveTimer(pid: string): boolean {
    return this.activeTimers.has(pid);
  }

  /**
   * Get all active timer info for debugging
   */
  getActiveTimers(): Array<{
    pid: string;
    seat: number;
    remainingMs: number;
    totalMs: number;
  }> {
    const now = Date.now();
    
    return Array.from(this.activeTimers.values()).map(timer => ({
      pid: timer.pid,
      seat: timer.seat,
      remainingMs: Math.max(0, timer.deadline - now),
      totalMs: timer.timeoutMs
    }));
  }

  /**
   * Handle timer expiration
   */
  private handleTimeout(pid: string, seat: number): void {
    const timer = this.activeTimers.get(pid);
    
    if (!timer) {
      console.log(`⏰ [TimerEventManager] Timer for ${pid} was already cleared - ignoring timeout`);
      return; // Timer was already cleared
    }
    
    // Double-check the timer is for the right seat (paranoid validation)
    if (timer.seat !== seat) {
      console.warn(`⏰ [TimerEventManager] Timer seat mismatch for ${pid}: expected ${seat}, got ${timer.seat}`);
      this.activeTimers.delete(pid);
      return;
    }
    
    console.log(`⏰ [TimerEventManager] Timer expired for ${pid} at seat ${seat} after ${Date.now() - timer.startTime}ms`);
    
    // Remove from active timers
    this.activeTimers.delete(pid);
    
    // Emit timeout event
    this.emit('timerEvent', {
      type: "TimeoutAutoFold",
      pid,
      seat
    } as TimerEventType);
    
    console.log(`⏰ [TimerEventManager] Timer expired for ${pid} at seat ${seat}`);
  }

  /**
   * Emit warning event
   */
  private emitWarning(pid: string, seat: number): void {
    const remainingMs = this.getRemainingTime(pid);
    
    if (remainingMs > 0) {
      this.emit('timerEvent', {
        type: "TimeoutWarning",
        pid,
        seat,
        remainingMs
      } as TimerEventType);
      
      console.log(`⚠️ [TimerEventManager] Warning for ${pid}: ${remainingMs}ms remaining`);
    }
  }

  /**
   * Set default timeout for new timers
   */
  setDefaultTimeout(timeoutMs: number): void {
    this.defaultTimeoutMs = timeoutMs;
    console.log(`⏰ [TimerEventManager] Default timeout set to ${timeoutMs}ms`);
  }

  /**
   * Set warning threshold
   */
  setWarningThreshold(thresholdMs: number): void {
    this.warningThresholdMs = thresholdMs;
    console.log(`⏰ [TimerEventManager] Warning threshold set to ${thresholdMs}ms`);
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics(): {
    activeTimerCount: number;
    totalTimersCreated: number;
    averageTimeoutMs: number;
  } {
    // In a full implementation, track these metrics
    return {
      activeTimerCount: this.activeTimers.size,
      totalTimersCreated: 0, // TODO: implement counter
      averageTimeoutMs: this.defaultTimeoutMs
    };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    const clearedCount = this.clearAllTimers("shutdown");
    this.removeAllListeners();
    console.log(`⏰ [TimerEventManager] Shutdown complete, cleared ${clearedCount} timers`);
  }
}

/**
 * Timer integration helper for EventEngine
 */
export class TimerIntegration {
  private timerManager: TimerEventManager;
  private eventEngine: any; // EventEngine reference

  constructor(eventEngine: any, timeoutMs = 30000) {
    this.eventEngine = eventEngine;
    this.timerManager = new TimerEventManager(timeoutMs);
    
    // Connect timer events to event engine
    this.setupEventHandlers();
    
    console.log(`🔗 [TimerIntegration] Connected timer manager to event engine`);
  }

  /**
   * Setup event handlers between timer manager and event engine
   */
  private setupEventHandlers(): void {
    this.timerManager.on('timerEvent', (timerEvent: TimerEventType) => {
      // Handle async timer events - don't block the timer manager
      this.handleTimerEvent(timerEvent).catch(error => {
        console.error(`❌ [TimerIntegration] Error handling timer event ${timerEvent.type}:`, error);
      });
    });
  }

  /**
   * Handle timer events and dispatch to event engine
   */
  private async handleTimerEvent(timerEvent: TimerEventType): Promise<void> {
    switch (timerEvent.type) {
      case "TurnStarted":
        // Notify external systems (WebSocket, UI)
        this.eventEngine.emit('turnStarted', {
          pid: timerEvent.pid,
          seat: timerEvent.seat,
          deadline: timerEvent.deadline
        });
        break;
        
      case "TimeoutWarning":
        this.eventEngine.emit('actionWarning', {
          pid: timerEvent.pid,
          seat: timerEvent.seat,
          remainingMs: timerEvent.remainingMs
        });
        break;
        
      case "TimeoutAutoFold":
        // Dispatch auto-fold event to game engine with proper async handling
        await this.eventEngine.dispatch({
          t: "TimeoutAutoFold",
          seat: timerEvent.seat
        });
        break;
        
      case "TimerCleared":
        this.eventEngine.emit('timerCleared', {
          pid: timerEvent.pid,
          seat: timerEvent.seat,
          reason: timerEvent.reason
        });
        break;
    }
  }

  /**
   * Start timer for player action
   */
  startActionTimer(pid: string, seat: number, timeoutMs?: number): void {
    const timerData: TimerEvent = {
      pid,
      seat,
      deadline: Date.now() + (timeoutMs || 30000),
      actionTimeoutMs: timeoutMs || 30000
    };
    
    this.timerManager.startActionTimer(timerData);
  }

  /**
   * Clear timer for player
   */
  clearTimer(pid: string): boolean {
    return this.timerManager.clearTimer(pid);
  }

  /**
   * Get timer manager reference
   */
  getTimerManager(): TimerEventManager {
    return this.timerManager;
  }

  /**
   * Shutdown integration
   */
  shutdown(): void {
    this.timerManager.shutdown();
    console.log(`🔗 [TimerIntegration] Shutdown complete`);
  }
}
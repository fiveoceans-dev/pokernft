/**
 * Sit Out Manager
 * 
 * Manages player sit-out states following the event-driven pattern.
 * Pure functions for state management with proper separation of concerns.
 * Follows existing manager patterns (like timerEvents.ts)
 */

import { Table, Seat, SideEffect } from "../core/types";
import { logger } from "../utils/logger";

/**
 * Sit out state tracking and management
 * Manages player sit-out states externally from core game engine
 */
export class SitOutManager {
  private readonly sitOutPlayers = new Map<string, number>(); // playerId -> timestamp
  private readonly timeoutCounts = new Map<string, number>();  // playerId -> count
  
  private readonly MAX_TIMEOUTS = 3;
  
  /**
   * Mark player as sitting out
   * Returns side effects to execute
   */
  markSitOut(
    playerId: string, 
    reason: "voluntary" | "timeout" | "busted"
  ): SideEffect[] {
    this.sitOutPlayers.set(playerId, Date.now());
    
    if (reason === "timeout") {
      const count = (this.timeoutCounts.get(playerId) || 0) + 1;
      this.timeoutCounts.set(playerId, count);
      
      logger.warn(`⏰ [SitOutManager] Player ${playerId} timeout #${count}`);
    }
    
    if (reason === "voluntary") {
      this.timeoutCounts.delete(playerId); // Reset on voluntary sit out
    }
    
    logger.info(`😴 [SitOutManager] Player ${playerId} sitting out (${reason})`);
    
    return [{
      type: "EMIT_STATE_CHANGE",
      payload: { reason: `player_sit_out_${reason}` }
    }];
  }
  
  /**
   * Mark player as sitting in
   */
  markSitIn(playerId: string): SideEffect[] {
    this.sitOutPlayers.delete(playerId);
    this.timeoutCounts.delete(playerId);
    
    logger.info(`🪑 [SitOutManager] Player ${playerId} sitting in`);
    
    return [{
      type: "EMIT_STATE_CHANGE",
      payload: { reason: "player_sit_in" }
    }];
  }
  
  /**
   * Check if player should be auto sat out after timeouts
   */
  shouldAutoSitOut(playerId: string): boolean {
    const timeouts = this.timeoutCounts.get(playerId) || 0;
    return timeouts >= this.MAX_TIMEOUTS;
  }
  
  /**
   * Get active players (not sitting out and have chips)
   */
  getActivePlayers(table: Table): Seat[] {
    return table.seats.filter(seat => 
      seat.pid && 
      !this.sitOutPlayers.has(seat.pid) && 
      seat.chips > 0 &&
      seat.status !== "empty"
    );
  }
  
  /**
   * Check if we have enough active players for a game (2+)
   */
  canStartGame(table: Table): boolean {
    const activePlayers = this.getActivePlayers(table);
    return activePlayers.length >= 2;
  }
  
  /**
   * Check if specific player is sitting out
   */
  isPlayerSittingOut(playerId: string): boolean {
    return this.sitOutPlayers.has(playerId);
  }
  
  /**
   * Get timeout count for player
   */
  getTimeoutCount(playerId: string): number {
    return this.timeoutCounts.get(playerId) || 0;
  }
  
  /**
   * Clear all tracking for a player (when they leave table)
   */
  clearPlayer(playerId: string): void {
    this.sitOutPlayers.delete(playerId);
    this.timeoutCounts.delete(playerId);
    logger.debug(`🧹 [SitOutManager] Cleared tracking for player ${playerId}`);
  }
  
  /**
   * Get sitting out timestamp for player
   */
  getSitOutTimestamp(playerId: string): number | undefined {
    return this.sitOutPlayers.get(playerId);
  }
  
  /**
   * Get count of active players
   */
  getActivePlayerCount(table: Table): number {
    return this.getActivePlayers(table).length;
  }
  
  /**
   * Check if player has chips and is not sitting out
   */
  isPlayerEligibleForHand(playerId: string, table: Table): boolean {
    const seat = table.seats.find(s => s.pid === playerId);
    if (!seat) return false;
    
    return !this.sitOutPlayers.has(playerId) && 
           seat.chips > 0 && 
           seat.status !== "empty";
  }
  
  /**
   * Increment timeout count and check if should sit out
   */
  incrementTimeout(playerId: string): { shouldSitOut: boolean; timeoutCount: number } {
    const count = (this.timeoutCounts.get(playerId) || 0) + 1;
    this.timeoutCounts.set(playerId, count);
    
    const shouldSitOut = count >= this.MAX_TIMEOUTS;
    
    logger.info(`⏰ [SitOutManager] Player ${playerId} timeout #${count}${shouldSitOut ? ' - auto sit out' : ''}`);
    
    return { shouldSitOut, timeoutCount: count };
  }
}

/**
 * Global sit out manager instances per table
 * Following existing pattern for manager storage
 */
const sitOutManagers = new Map<string, SitOutManager>();

/**
 * Get or create sit out manager for table
 */
export function getSitOutManager(tableId: string): SitOutManager {
  let manager = sitOutManagers.get(tableId);
  if (!manager) {
    manager = new SitOutManager();
    sitOutManagers.set(tableId, manager);
    logger.debug(`📋 [SitOutManager] Created for table ${tableId}`);
  }
  return manager;
}

/**
 * Remove sit out manager for table cleanup
 */
export function removeSitOutManager(tableId: string): void {
  sitOutManagers.delete(tableId);
  logger.debug(`🗑️ [SitOutManager] Removed for table ${tableId}`);
}

/**
 * Clear all sit out managers (for testing/cleanup)
 */
export function clearAllSitOutManagers(): void {
  sitOutManagers.clear();
  logger.debug(`🧹 [SitOutManager] Cleared all managers`);
}
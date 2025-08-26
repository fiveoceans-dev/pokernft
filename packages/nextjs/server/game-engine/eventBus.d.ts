import type { ServerEvent, ClientCommand } from "./networking";
/**
 * Simple event bus broadcasting server events to listeners and queuing
 * validated client commands for server processing.
 */
export declare class EventBus {
    private emitter;
    private commandQueue;
    /** Emit a server event to all listeners */
    emit(event: ServerEvent): void;
    /** Subscribe to server events */
    onEvent(listener: (event: ServerEvent) => void): void;
    /** Enqueue a client command for later processing */
    enqueueCommand(cmd: ClientCommand): void;
    /** Dequeue the next pending client command */
    dequeueCommand(): ClientCommand | undefined;
    /** Number of queued client commands */
    get pendingCommands(): number;
    /** Remove all event listeners */
    clearListeners(): void;
}
export default EventBus;

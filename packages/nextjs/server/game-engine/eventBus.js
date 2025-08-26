"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const events_1 = require("events");
/**
 * Simple event bus broadcasting server events to listeners and queuing
 * validated client commands for server processing.
 */
class EventBus {
    constructor() {
        this.emitter = new events_1.EventEmitter();
        this.commandQueue = [];
    }
    /** Emit a server event to all listeners */
    emit(event) {
        this.emitter.emit("event", event);
    }
    /** Subscribe to server events */
    onEvent(listener) {
        this.emitter.on("event", listener);
    }
    /** Enqueue a client command for later processing */
    enqueueCommand(cmd) {
        this.commandQueue.push(cmd);
    }
    /** Dequeue the next pending client command */
    dequeueCommand() {
        return this.commandQueue.shift();
    }
    /** Number of queued client commands */
    get pendingCommands() {
        return this.commandQueue.length;
    }
    /** Remove all event listeners */
    clearListeners() {
        this.emitter.removeAllListeners("event");
    }
}
exports.EventBus = EventBus;
exports.default = EventBus;
//# sourceMappingURL=eventBus.js.map
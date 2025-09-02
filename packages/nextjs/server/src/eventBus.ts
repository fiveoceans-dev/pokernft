import { createClient, createCluster } from "redis";
import type { ServerEvent } from "../game-engine";
import { logger } from "../game-engine/utils/logger";

export interface BusMessage {
  roomId: string;
  event: ServerEvent;
  origin: string;
}

class EventBus {
  private pub: any;
  private sub: any;
  private readonly channel = "poker-events";
  private publishWarned = false;

  async connect(): Promise<void> {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    try {
      if (url.includes(",")) {
        const nodes = url.split(",").map((u) => ({ url: u }));
        this.pub = createCluster({ rootNodes: nodes });
        this.sub = createCluster({ rootNodes: nodes });
      } else {
        this.pub = createClient({ url });
        this.sub = createClient({ url });
      }

      this.pub.on("error", (err: unknown) =>
        logger.error("Redis pub error", err),
      );
      this.sub.on("error", (err: unknown) =>
        logger.error("Redis sub error", err),
      );

      await this.pub.connect();
      await this.sub.connect();
      logger.info(`🔌 Redis connected at ${url}`);
    } catch (err) {
      this.pub = undefined;
      this.sub = undefined;
      throw err;
    }
  }

  async publish(message: BusMessage): Promise<void> {
    if (!this.pub || !this.pub.isOpen) {
      if (!this.publishWarned) {
        logger.warn("Publish attempted without Redis connection");
        this.publishWarned = true;
      }
      return;
    }
    try {
      await this.pub.publish(this.channel, JSON.stringify(message));
    } catch {
      if (!this.publishWarned) {
        logger.warn("Redis publish failed; messages will not be broadcast");
        this.publishWarned = true;
      }
    }
  }

  async subscribe(handler: (msg: BusMessage) => void): Promise<void> {
    if (!this.sub || !this.sub.isOpen) {
      logger.warn("Subscribe attempted without Redis connection");
      return;
    }
    await this.sub.subscribe(this.channel, (message: string) => {
      try {
        handler(JSON.parse(message) as BusMessage);
      } catch (err) {
        logger.error("Invalid bus message", err);
      }
    });
  }
}

export const bus = new EventBus();

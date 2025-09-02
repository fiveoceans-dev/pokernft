import { createClient, RedisClientType } from "redis";
import type { ServerEvent } from "../game-engine";
import { logger } from "../game-engine/utils/logger";

export interface BusMessage {
  roomId: string;
  event: ServerEvent;
  origin: string;
}

class EventBus {
  private pub: RedisClientType | undefined;
  private sub: RedisClientType | undefined;
  private readonly channel = "poker-events";

  async connect(): Promise<void> {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    this.pub = createClient({ url });
    this.sub = createClient({ url });

    this.pub.on("error", (err) => logger.error("Redis pub error", err));
    this.sub.on("error", (err) => logger.error("Redis sub error", err));

    await this.pub.connect();
    await this.sub.connect();
    logger.info(`🔌 Redis connected at ${url}`);
  }

  async publish(message: BusMessage): Promise<void> {
    if (!this.pub) {
      logger.warn("Publish attempted before Redis connected");
      return;
    }
    await this.pub.publish(this.channel, JSON.stringify(message));
  }

  async subscribe(handler: (msg: BusMessage) => void): Promise<void> {
    if (!this.sub) {
      logger.warn("Subscribe attempted before Redis connected");
      return;
    }
    await this.sub.subscribe(this.channel, (message) => {
      try {
        handler(JSON.parse(message) as BusMessage);
      } catch (err) {
        logger.error("Invalid bus message", err);
      }
    });
  }
}

export const bus = new EventBus();

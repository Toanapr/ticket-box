import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { ArtistBioWorker } from './artist-bio.worker';

export interface ArtistBioJobMessage {
  artistBioJobId: string;
  pipelineVersion: string;
}

@Injectable()
export class ArtistBioQueueService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ArtistBioQueueService.name);
  private readonly url =
    process.env.ARTIST_BIO_RABBITMQ_URL ??
    'amqp://ticketbox:ticketbox123@localhost:5672';
  private readonly exchange =
    process.env.ARTIST_BIO_EXCHANGE_NAME ?? 'artist-bio.jobs';
  private readonly routingKey = process.env.ARTIST_BIO_ROUTING_KEY ?? 'process';
  private readonly queue =
    process.env.ARTIST_BIO_QUEUE_NAME ?? 'artist-bio.jobs';
  private readonly dlx =
    process.env.ARTIST_BIO_DLX_NAME ?? 'artist-bio.jobs.dlx';
  private readonly dlq =
    process.env.ARTIST_BIO_DLQ_NAME ?? 'artist-bio.jobs.dlq';

  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly worker: ArtistBioWorker) {}

  async onModuleInit(): Promise<void> {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'direct', {
      durable: true,
    });
    await this.channel.assertExchange(this.dlx, 'direct', {
      durable: true,
    });
    await this.channel.assertQueue(this.dlq, {
      durable: true,
    });
    await this.channel.bindQueue(this.dlq, this.dlx, this.routingKey);
    await this.channel.assertQueue(this.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.dlx,
        'x-dead-letter-routing-key': this.routingKey,
      },
    });
    await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);
    await this.channel.prefetch(1);
    await this.channel.consume(this.queue, (message) => {
      void this.handleMessage(message);
    });
    this.logger.log(`Artist bio RabbitMQ queue ready: ${this.queue}`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async publish(message: ArtistBioJobMessage): Promise<void> {
    const channel = this.requireChannel();
    const body = Buffer.from(JSON.stringify(message));
    const published = channel.publish(this.exchange, this.routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: message.artistBioJobId,
      timestamp: Math.floor(Date.now() / 1000),
      headers: {
        artist_bio_job_id: message.artistBioJobId,
        pipeline_version: message.pipelineVersion,
      },
    });

    if (!published) {
      await new Promise<void>((resolve) => channel.once('drain', resolve));
    }

    this.logger.log(`Published artist bio job ${message.artistBioJobId}`);
  }

  private async handleMessage(
    message: amqp.ConsumeMessage | null,
  ): Promise<void> {
    if (!message) {
      return;
    }

    const channel = this.requireChannel();
    let payload: ArtistBioJobMessage;
    try {
      payload = parseMessage(message.content);
    } catch (error) {
      this.logger.warn(`Invalid artist bio message: ${errorMessage(error)}`);
      channel.reject(message, false);
      return;
    }

    try {
      await this.worker.processJob(payload.artistBioJobId);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `artist_bio_job_id=${payload.artistBioJobId} consumer failed`,
        errorMessage(error),
      );
      channel.reject(message, false);
    }
  }

  private requireChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('Artist bio RabbitMQ channel is not initialized');
    }

    return this.channel;
  }
}

function parseMessage(buffer: Buffer): ArtistBioJobMessage {
  const parsed: unknown = JSON.parse(buffer.toString('utf8'));

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('artistBioJobId' in parsed) ||
    !('pipelineVersion' in parsed) ||
    typeof parsed.artistBioJobId !== 'string' ||
    typeof parsed.pipelineVersion !== 'string'
  ) {
    throw new Error('Artist bio message shape is invalid');
  }

  return {
    artistBioJobId: parsed.artistBioJobId,
    pipelineVersion: parsed.pipelineVersion,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

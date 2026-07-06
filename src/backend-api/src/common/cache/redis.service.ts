import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';

class RedisUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisUnavailableError';
  }
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly timeoutMs = 200;

  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy() {
    // Commands use short-lived sockets so there is no pooled connection to close.
  }

  async get(key: string): Promise<string | null> {
    const value = await this.command(['GET', key]);
    return typeof value === 'string' ? value : null;
  }

  async setJson(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.command(['SET', key, value, 'EX', String(ttlSeconds)]);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    const value = await this.command(['DEL', ...keys]);
    return typeof value === 'number' ? value : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const value = await this.command(['KEYS', pattern]);
    return Array.isArray(value) ? value.map(String) : [];
  }

  async incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.command(['INCR', key]);
    if (count === 1) {
      await this.command(['EXPIRE', key, String(ttlSeconds)]);
    }
    return typeof count === 'number' ? count : Number(count);
  }

  async ttl(key: string): Promise<number> {
    const value = await this.command(['TTL', key]);
    return typeof value === 'number' ? value : Number(value);
  }

  private async command(args: string[]): Promise<unknown> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new RedisUnavailableError('REDIS_URL is not configured');
    }

    const url = new URL(redisUrl);
    const host = url.hostname;
    const port = Number(url.port || 6379);
    const password = url.password ? decodeURIComponent(url.password) : null;
    const db =
      url.pathname && url.pathname !== '/' ? url.pathname.slice(1) : null;
    const commandArgs = [
      ...(password ? [['AUTH', password]] : []),
      ...(db ? [['SELECT', db]] : []),
      args,
    ];

    let lastResponse: unknown = null;
    for (const item of commandArgs) {
      lastResponse = await this.sendSingleCommand(host, port, item);
    }

    return lastResponse;
  }

  private sendSingleCommand(
    host: string,
    port: number,
    args: string[],
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new RedisUnavailableError('Redis command timed out'));
      }, this.timeoutMs);

      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      socket.on('data', (chunk) => {
        chunks.push(chunk);
      });

      socket.once('close', () => {
        clearTimeout(timer);
        try {
          resolve(parseRedisResponse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) {
          reject(error);
        }
      });

      socket.connect(port, host, () => {
        socket.end(encodeRedisCommand(args));
      });
    }).catch((error) => {
      this.logger.warn(
        `Redis command failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    });
  }
}

function encodeRedisCommand(args: string[]): string {
  return `*${args.length}\r\n${args
    .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
    .join('')}`;
}

function parseRedisResponse(raw: string): unknown {
  let offset = 0;

  function readLine(): string {
    const end = raw.indexOf('\r\n', offset);
    if (end < 0) {
      throw new Error('Invalid Redis response');
    }
    const line = raw.slice(offset, end);
    offset = end + 2;
    return line;
  }

  function parse(): unknown {
    const prefix = raw[offset++];
    if (prefix === '+') {
      return readLine();
    }
    if (prefix === '-') {
      throw new Error(readLine());
    }
    if (prefix === ':') {
      return Number(readLine());
    }
    if (prefix === '$') {
      const length = Number(readLine());
      if (length < 0) {
        return null;
      }
      const value = raw.slice(offset, offset + length);
      offset += length + 2;
      return value;
    }
    if (prefix === '*') {
      const count = Number(readLine());
      if (count < 0) {
        return null;
      }
      return Array.from({ length: count }, () => parse());
    }
    throw new Error('Unsupported Redis response');
  }

  return parse();
}

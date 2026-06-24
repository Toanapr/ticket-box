import { Injectable, NotFoundException } from '@nestjs/common';
import { createStableHash } from '../../common/utils/hash.util';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';

type InventorySummary = {
  ticketTypeId: string;
  availableCount: number;
  cachedAt: string;
  staleAt: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class ConcertsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  async listPublishedUpcoming() {
    const cacheKey = `concert:list:${createStableHash({ upcoming: true })}`;
    return this.cacheService.getOrLoad(
      cacheKey,
      this.cacheService.getPublicConcertTtlSeconds(),
      async () => {
        const concerts = await this.prisma.concert.findMany({
          where: {
            status: 'published',
            startAt: {
              gte: new Date(),
            },
          },
          orderBy: {
            startAt: 'asc',
          },
          include: {
            ticketTypes: {
              include: {
                inventory: true,
              },
              orderBy: {
                price: 'asc',
              },
            },
          },
        });

        return Promise.all(
          concerts.map((concert) => this.withInventorySummary(concert)),
        );
      },
    );
  }

  async getPublishedDetail(identifier: string) {
    const id = await this.resolvePublishedConcertId(identifier);
    if (!id) {
      throw new NotFoundException('Concert not found');
    }

    const cacheKey = `concert:detail:${id}`;
    const concert = await this.cacheService.getOrLoad(
      cacheKey,
      this.cacheService.getPublicConcertTtlSeconds(),
      async () => {
        const item = await this.prisma.concert.findFirst({
          where: {
            id,
            status: 'published',
          },
          include: {
            ticketTypes: {
              include: {
                inventory: true,
              },
              orderBy: {
                price: 'asc',
              },
            },
          },
        });

        if (!item) {
          return null;
        }

        return this.withInventorySummary(item);
      },
    );

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    return concert;
  }

  private async resolvePublishedConcertId(
    identifier: string,
  ): Promise<string | null> {
    if (uuidPattern.test(identifier)) {
      return identifier;
    }

    if (identifier.length > 100 || !slugPattern.test(identifier)) {
      return null;
    }

    return this.cacheService.getOrLoad(
      `concert:slug:${identifier}`,
      this.cacheService.getPublicConcertTtlSeconds(),
      async () => {
        const concert = await this.prisma.concert.findFirst({
          where: { slug: identifier, status: 'published' },
          select: { id: true },
        });
        return concert?.id ?? null;
      },
    );
  }

  private async withInventorySummary<
    T extends {
      ticketTypes: Array<{
        id: string;
        inventory: {
          totalCapacity: number;
          reservedCount: number;
          soldCount: number;
        } | null;
      }>;
    },
  >(concert: T) {
    const ticketTypes = await Promise.all(
      concert.ticketTypes.map(async (ticketType) => {
        const summary = await this.getInventorySummary(ticketType);
        return {
          ...ticketType,
          availableCount: summary.availableCount,
          cachedAt: summary.cachedAt,
          staleAt: summary.staleAt,
        };
      }),
    );

    return {
      ...concert,
      ticketTypes,
    };
  }

  private async getInventorySummary(ticketType: {
    id: string;
    inventory: {
      totalCapacity: number;
      reservedCount: number;
      soldCount: number;
    } | null;
  }): Promise<InventorySummary> {
    const ttlSeconds = this.cacheService.getInventorySummaryTtlSeconds();
    const key = `inventory:summary:${ticketType.id}`;

    return this.cacheService.getOrLoad(
      key,
      ttlSeconds,
      () => {
        const metadata = this.cacheService.metadata(ttlSeconds);
        return Promise.resolve({
          ticketTypeId: ticketType.id,
          availableCount: ticketType.inventory
            ? ticketType.inventory.totalCapacity -
              ticketType.inventory.reservedCount -
              ticketType.inventory.soldCount
            : 0,
          ...metadata,
        });
      },
      { consumeMissBudget: false },
    );
  }
}

import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { DomainError } from '../errors/domain-error';
import { PrismaService } from '../../prisma/prisma.service';

export type IdempotencyClaim =
  | { kind: 'owner'; recordId: string; owner: string }
  | { kind: 'replay'; statusCode: number; body: Prisma.JsonValue }
  | { kind: 'processing'; resourceId: string | null; ambiguous: boolean };

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(input: {
    userId: string;
    endpoint: string;
    key: string;
    requestHash: string;
    resourceId?: string;
  }): Promise<IdempotencyClaim> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        userId_endpoint_key: {
          userId: input.userId,
          endpoint: input.endpoint,
          key: input.key,
        },
      },
    });

    if (existing) {
      if (existing.requestHash !== input.requestHash) {
        throw new DomainError(
          'Idempotency key was used with a different request',
          'duplicate_request_conflict',
          409,
        );
      }
      if (
        existing.status === IdempotencyStatus.succeeded &&
        existing.responseStatus &&
        existing.responseBody !== null
      ) {
        return {
          kind: 'replay',
          statusCode: existing.responseStatus,
          body: existing.responseBody,
        };
      }
      return {
        kind: 'processing',
        resourceId: existing.resourceId,
        ambiguous: existing.providerDispatched,
      };
    }

    const owner = randomUUID();
    try {
      const record = await this.prisma.idempotencyRecord.create({
        data: {
          userId: input.userId,
          endpoint: input.endpoint,
          key: input.key,
          requestHash: input.requestHash,
          status: IdempotencyStatus.processing,
          resourceId: input.resourceId,
          processingOwner: owner,
          processingUntil: new Date(Date.now() + 30_000),
          retainUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
      return { kind: 'owner', recordId: record.id, owner };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.claim(input);
      }
      throw error;
    }
  }

  async markProviderDispatched(recordId: string, owner: string) {
    await this.prisma.idempotencyRecord.updateMany({
      where: { id: recordId, processingOwner: owner },
      data: { providerDispatched: true },
    });
  }

  async releaseUndispatched(recordId: string, owner: string) {
    await this.prisma.idempotencyRecord.deleteMany({
      where: { id: recordId, processingOwner: owner },
    });
  }

  async complete(
    recordId: string,
    owner: string,
    statusCode: number,
    body: Prisma.InputJsonValue,
  ) {
    await this.prisma.idempotencyRecord.updateMany({
      where: { id: recordId, processingOwner: owner },
      data: {
        status: IdempotencyStatus.succeeded,
        responseStatus: statusCode,
        responseBody: body,
        processingOwner: null,
        processingUntil: null,
      },
    });
  }
}

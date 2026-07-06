import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';
import {
  GUEST_LIST_SCHEMA_VERSION,
  identityKey,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  normalizeSponsorId,
  parseGuestListCsv,
} from './guest-list-csv.util';
import { GuestListStorageService } from './guest-list-storage.service';

export const GUEST_LIST_DEFAULT_ZONE = 'GUEST-LIST';

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  delimiter?: string;
  schemaVersion: string;
  errorReason?: string;
}

interface ValidatedRow {
  rowNumber: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  sponsorId: string | null;
  identityKey: string | null;
  zoneCode: string;
  ticketTypeSlug: string | null;
  ticketTypeId: string | null;
  status: 'valid' | 'invalid';
  errorReason: string | null;
  rawRow: Record<string, string>;
}

export interface ActiveGuestListEntry {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  sponsorId: string | null;
  identityKey: string;
  zoneCode: string;
  ticketTypeId: string | null;
  ticketTypeSlug: string | null;
  ticketTypeName: string | null;
}

export interface ActiveGuestListResponse {
  concertId: string;
  version: {
    id: string;
    versionNo: number;
    entryCount: number;
    publishedAt: Date;
  } | null;
  entries: ActiveGuestListEntry[];
}

@Injectable()
export class GuestListImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: GuestListStorageService,
  ) {}

  async importCsv(
    user: CurrentUser,
    concertId: string,
    file: Express.Multer.File,
  ) {
    try {
      await this.findOwnedConcert(user, concertId);

      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('CSV file is required');
      }

      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      const existing = await this.prisma.guestListBatch.findUnique({
        where: {
          concertId_fileChecksum_schemaVersion: {
            concertId,
            fileChecksum: checksum,
            schemaVersion: GUEST_LIST_SCHEMA_VERSION,
          },
        },
        include: { version: true },
      });

      if (existing) {
        return { ...existing, idempotent: true };
      }

      const { objectKey } = await this.storage.save(
        concertId,
        checksum,
        file.buffer,
      );

      let parsed: ReturnType<typeof parseGuestListCsv>;
      try {
        parsed = parseGuestListCsv(file.buffer);
      } catch (error) {
        try {
          const summary = this.failedSummary(error);
          const batch = await this.prisma.guestListBatch.create({
            data: {
              concertId,
              fileChecksum: checksum,
              schemaVersion: GUEST_LIST_SCHEMA_VERSION,
              rawObjectKey: objectKey,
              originalName: file.originalname,
              status: 'failed',
              summary: summary as unknown as Prisma.InputJsonValue,
            },
          });
          return { ...batch, idempotent: false };
        } catch (createError) {
          await this.storage.delete(objectKey);
          throw createError;
        }
      }

      const activeIdentityKeys = await this.getActiveIdentityKeys(concertId);
      const { rows, summary } = this.validateRows(
        parsed.rows,
        parsed.delimiter,
        activeIdentityKeys,
      );

      try {
        return await this.prisma.$transaction(async (tx) => {
          const batch = await tx.guestListBatch.create({
            data: {
              concertId,
              fileChecksum: checksum,
              schemaVersion: GUEST_LIST_SCHEMA_VERSION,
              rawObjectKey: objectKey,
              originalName: file.originalname,
              status:
                summary.invalidRows > 0 ? 'validation_failed' : 'imported',
              summary: summary as unknown as Prisma.InputJsonValue,
            },
          });

          await tx.guestEntryStaging.createMany({
            data: rows.map((row) => ({
              batchId: batch.id,
              rowNumber: row.rowNumber,
              fullName: row.fullName,
              email: row.email,
              phone: row.phone,
              sponsorId: row.sponsorId,
              identityKey: row.identityKey,
              zoneCode: row.zoneCode,
              ticketTypeSlug: row.ticketTypeSlug,
              ticketTypeId: row.ticketTypeId,
              status: row.status,
              errorReason: row.errorReason,
              rawRow: row.rawRow as Prisma.InputJsonValue,
            })),
          });

          if (summary.invalidRows > 0) {
            return { ...batch, idempotent: false };
          }

          const nextVersion = await this.nextVersionNo(tx, concertId);
          await tx.guestListVersion.updateMany({
            where: { concertId, isActive: true },
            data: { isActive: false },
          });

          const version = await tx.guestListVersion.create({
            data: {
              concertId,
              batchId: batch.id,
              versionNo: nextVersion,
              isActive: true,
              checksum,
              entryCount: summary.validRows,
            },
          });

          const validRows = rows.filter(
            (row): row is ValidatedRow & {
              fullName: string;
              identityKey: string;
            } =>
              row.status === 'valid' &&
              row.fullName !== null &&
              row.identityKey !== null,
          );

          await tx.guestEntry.createMany({
            data: validRows.map((row) => ({
              versionId: version.id,
              ticketTypeId: null,
              fullName: row.fullName,
              email: row.email,
              phone: row.phone,
              sponsorId: row.sponsorId,
              identityKey: row.identityKey,
              zoneCode: GUEST_LIST_DEFAULT_ZONE,
            })),
          });

          await tx.guestListBatch.update({
            where: { id: batch.id },
            data: { status: 'published' },
          });

          await tx.guestListOutbox.create({
            data: {
              eventType: 'GuestListUpdated',
              aggregateId: version.id,
              payload: {
                concertId,
                versionId: version.id,
                versionNo: version.versionNo,
                checksum,
                entryCount: version.entryCount,
                zoneCode: GUEST_LIST_DEFAULT_ZONE,
              },
            },
          });

          return {
            ...batch,
            status: 'published',
            version,
            idempotent: false,
          };
        });
      } catch (error) {
        await this.storage.delete(objectKey);
        throw error;
      }
    } catch (error) {
      if (isGuestListSchemaError(error)) {
        throw new ServiceUnavailableException(
          'Guest list import database schema is not ready. Run the latest backend migrations and try again.',
        );
      }

      throw error;
    }
  }

  async listImports(user: CurrentUser, concertId: string) {
    await this.findOwnedConcert(user, concertId);
    return this.prisma.guestListBatch.findMany({
      where: { concertId },
      include: { version: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listImportErrors(user: CurrentUser, batchId: string) {
    const batch = await this.prisma.guestListBatch.findUnique({
      where: { id: batchId },
      include: { concert: true },
    });

    if (!batch) {
      throw new NotFoundException('Guest list import batch not found');
    }

    this.assertOrganizerOwnsConcert(user, batch.concert.organizationId);

    const rows = await this.prisma.guestEntryStaging.findMany({
      where: { batchId, status: 'invalid' },
      orderBy: { rowNumber: 'asc' },
    });

    const rowErrors = rows.map((row) => ({
      rowNumber: row.rowNumber,
      errorReason: sanitizeCsvFormula(row.errorReason ?? ''),
      rawRow: sanitizeRawRow(row.rawRow),
    }));
    const summary = batch.summary as Prisma.JsonObject;

    return {
      batchId,
      status: batch.status,
      summary: batch.summary,
      errors:
        rowErrors.length > 0 || typeof summary.errorReason !== 'string'
          ? rowErrors
          : [
              {
                rowNumber: 0,
                errorReason: sanitizeCsvFormula(summary.errorReason),
                rawRow: {},
              },
            ],
    };
  }

  async getScannerManifest(concertId: string, zoneCode?: string) {
    const version = await this.prisma.guestListVersion.findFirst({
      where: { concertId, isActive: true },
      include: {
        entries: {
          where: zoneCode ? { zoneCode } : undefined,
          orderBy: { fullName: 'asc' },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (!version) {
      return {
        concertId,
        guestList: {
          versionId: null,
          versionNo: 0,
          checksum: null,
          generatedAt: new Date().toISOString(),
          entries: [],
        },
      };
    }

    return {
      concertId,
      guestList: {
        versionId: version.id,
        versionNo: version.versionNo,
        checksum: version.checksum,
        generatedAt: new Date().toISOString(),
        entries: version.entries.map((entry) => ({
          id: entry.id,
          fullName: entry.fullName,
          email: entry.email,
          phone: entry.phone,
          sponsorId: entry.sponsorId,
          identityKey: entry.identityKey,
          zoneCode: entry.zoneCode,
          ticketTypeId: entry.ticketTypeId,
        })),
      },
    };
  }

  async listActiveEntries(
    user: CurrentUser,
    concertId: string,
  ): Promise<ActiveGuestListResponse> {
    await this.findOwnedConcert(user, concertId);

    const version = await this.prisma.guestListVersion.findFirst({
      where: { concertId, isActive: true },
      include: {
        entries: {
          include: {
            ticketType: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
          orderBy: [{ fullName: 'asc' }],
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    return {
      concertId,
      version: version
        ? {
            id: version.id,
            versionNo: version.versionNo,
            entryCount: version.entryCount,
            publishedAt: version.publishedAt,
          }
        : null,
      entries: (version?.entries ?? []).map(
        (entry): ActiveGuestListEntry => ({
          id: entry.id,
          fullName: entry.fullName,
          email: entry.email,
          phone: entry.phone,
          sponsorId: entry.sponsorId,
          identityKey: entry.identityKey,
          zoneCode: entry.zoneCode,
          ticketTypeId: entry.ticketTypeId,
          ticketTypeSlug: entry.ticketType?.slug ?? null,
          ticketTypeName: entry.ticketType?.name ?? null,
        }),
      ),
    };
  }

  async deleteActiveGuestList(user: CurrentUser, concertId: string) {
    await this.findOwnedConcert(user, concertId);

    const activeVersion = await this.prisma.guestListVersion.findFirst({
      where: { concertId, isActive: true },
      select: {
        id: true,
        versionNo: true,
        checksum: true,
        entryCount: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (!activeVersion) {
      return { concertId, deleted: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.guestListVersion.delete({
        where: { id: activeVersion.id },
      });

      await tx.guestListOutbox.create({
        data: {
          eventType: 'GuestListUpdated',
          aggregateId: concertId,
          payload: {
            concertId,
            versionId: null,
            versionNo: 0,
            checksum: null,
            entryCount: 0,
            zoneCode: GUEST_LIST_DEFAULT_ZONE,
            clearedVersionId: activeVersion.id,
            clearedVersionNo: activeVersion.versionNo,
            clearedChecksum: activeVersion.checksum,
          },
        },
      });
    });

    return {
      concertId,
      deleted: true,
      clearedVersionId: activeVersion.id,
    };
  }

  private failedSummary(error: unknown): ImportSummary {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      schemaVersion: GUEST_LIST_SCHEMA_VERSION,
      errorReason: error instanceof Error ? error.message : String(error),
    };
  }

  private validateRows(
    parsedRows: Array<{ rowNumber: number; values: Record<string, string> }>,
    delimiter: string,
    activeIdentityKeys: Set<string>,
  ): { rows: ValidatedRow[]; summary: ImportSummary } {
    const seenIdentityKeys = new Set<string>();
    let duplicateRows = 0;

    const rows = parsedRows.map(({ rowNumber, values }) => {
      const errors: string[] = [];
      const fullName = values.full_name?.trim() || null;
      const email = normalizeEmail(values.email ?? '');
      const phone = normalizePhone(values.phone ?? '');
      const sponsorId = normalizeSponsorId(values.sponsor_id ?? '');
      const key = identityKey({ email, phone, sponsorId });

      if (!fullName) errors.push('full_name is required');
      if (!key) errors.push('email, phone, or sponsor_id is required');
      if (email && !isValidEmail(email)) errors.push('email is invalid');
      if (phone && !isValidPhone(phone)) errors.push('phone is invalid');

      if (key) {
        if (seenIdentityKeys.has(key)) {
          duplicateRows += 1;
          errors.push('duplicate guest identity in file');
        } else {
          seenIdentityKeys.add(key);
        }
        if (activeIdentityKeys.has(key)) {
          duplicateRows += 1;
          errors.push('guest identity already exists in active guest list');
        }
      }

      const status = errors.length > 0 ? 'invalid' : 'valid';
      return {
        rowNumber,
        fullName,
        email,
        phone,
        sponsorId,
        identityKey: key,
        zoneCode: GUEST_LIST_DEFAULT_ZONE,
        ticketTypeSlug: null,
        ticketTypeId: null,
        status,
        errorReason: errors.length > 0 ? errors.join('; ') : null,
        rawRow: values,
      } satisfies ValidatedRow;
    });

    const invalidRows = rows.filter((row) => row.status === 'invalid').length;
    return {
      rows,
      summary: {
        totalRows: rows.length,
        validRows: rows.length - invalidRows,
        invalidRows,
        duplicateRows,
        delimiter,
        schemaVersion: GUEST_LIST_SCHEMA_VERSION,
      },
    };
  }

  private async getActiveIdentityKeys(concertId: string) {
    const activeVersion = await this.prisma.guestListVersion.findFirst({
      where: { concertId, isActive: true },
      include: { entries: { select: { identityKey: true } } },
    });
    return new Set(activeVersion?.entries.map((entry) => entry.identityKey) ?? []);
  }

  private async nextVersionNo(tx: Prisma.TransactionClient, concertId: string) {
    const latest = await tx.guestListVersion.findFirst({
      where: { concertId },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true },
    });
    return (latest?.versionNo ?? 0) + 1;
  }

  private async findOwnedConcert(user: CurrentUser, concertId: string) {
    const concert = await this.prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) throw new NotFoundException('Concert not found');
    this.assertOrganizerOwnsConcert(user, concert.organizationId);
    return concert;
  }

  private assertOrganizerOwnsConcert(user: CurrentUser, organizationId: string) {
    if (!user.organizationId) {
      throw new ForbiddenException('Organizer must belong to an organization');
    }
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Concert belongs to another organization');
    }
  }
}

function sanitizeCsvFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function sanitizeRawRow(value: Prisma.JsonValue): Prisma.JsonValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      typeof entry === 'string' ? sanitizeCsvFormula(entry) : entry,
    ]),
  ) as Prisma.JsonObject;
}

function isGuestListSchemaError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  );
}

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ScannerDeviceStatus,
  ScannerAssignmentStatus,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AssignScannerDto, ProvisionScannerDto } from './dto/scanner-admin.dto';
import { ScannerManifestProjectionService } from '../scanner/scanner-manifest-projection.service';

@Injectable()
export class AdminScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scannerManifestProjection: ScannerManifestProjectionService,
  ) {}

  async listDevices(user: CurrentUser) {
    const devices = await this.prisma.scannerDevice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          where: { status: ScannerAssignmentStatus.active },
          take: 1,
        },
      },
    });

    return {
      devices: devices.map((d) => ({
        id: d.id,
        deviceCode: d.deviceCode,
        status: d.status,
        scannerUserId: d.scannerUserId,
        lastSeenAt: d.lastSeenAt,
        createdAt: d.createdAt,
        activeAssignment: d.assignments[0] || null,
      })),
    };
  }

  async provisionDevice(user: CurrentUser, dto: ProvisionScannerDto) {
    const deviceId = randomUUID();
    const deviceCode =
      dto.deviceCode ||
      `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const scannerUserId = randomUUID();

    // Tạo User ngầm định cho thiết bị
    await this.prisma.user.create({
      data: {
        id: scannerUserId,
        email: `${deviceCode.toLowerCase()}@scanner.local`,
        role: UserRole.scanner,
        passwordHash: 'no-password-login-via-token',
        status: 'active',
        fullName: `Scanner ${deviceCode}`,
      },
    });

    // Tạo ScannerDevice
    const device = await this.prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode,
        scannerUserId,
        status: ScannerDeviceStatus.active,
      },
    });

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      accessToken: `scanner:${scannerUserId}`,
      status: device.status,
    };
  }

  async assignDevice(
    user: CurrentUser,
    deviceId: string,
    dto: AssignScannerDto,
  ) {
    const device = await this.prisma.scannerDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const concert = await this.prisma.concert.findUnique({
      where: { id: dto.concertId },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    // Khóa Assignment hiện tại (nếu có)
    await this.prisma.scannerAssignment.updateMany({
      where: {
        deviceId,
        status: ScannerAssignmentStatus.active,
      },
      data: {
        status: ScannerAssignmentStatus.inactive,
      },
    });

    // Tạo Assignment mới
    const assignment = await this.prisma.scannerAssignment.create({
      data: {
        deviceId,
        scannerUserId: device.scannerUserId,
        eventId: concert.id,
        concertId: concert.id,
        gateCode: dto.gateCode,
        zoneCode: dto.zoneCode,
        status: ScannerAssignmentStatus.active,
      },
    });

    await this.scannerManifestProjection.refreshAssignment(assignment.id);

    return assignment;
  }

  async revokeDevice(user: CurrentUser, deviceId: string) {
    const device = await this.prisma.scannerDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Thu hồi Assignment
    await this.prisma.scannerAssignment.updateMany({
      where: {
        deviceId,
        status: ScannerAssignmentStatus.active,
      },
      data: {
        status: ScannerAssignmentStatus.revoked,
      },
    });

    // Thu hồi thiết bị
    const revokedDevice = await this.prisma.scannerDevice.update({
      where: { id: deviceId },
      data: {
        status: ScannerDeviceStatus.revoked,
      },
    });

    // Khóa luôn tài khoản User tương ứng
    await this.prisma.user.update({
      where: { id: device.scannerUserId },
      data: { status: 'disabled' },
    });

    return revokedDevice;
  }
}

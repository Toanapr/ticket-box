import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScannerCheckInSyncEventDto {
  @IsUUID()
  clientEventId!: string;

  @IsString()
  ticketRef!: string;

  @IsOptional()
  @IsString()
  rawToken?: string;

  @IsString()
  scannerUserId!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  eventId!: string;

  @IsString()
  gateCode!: string;

  @IsString()
  zoneCode!: string;

  @IsDateString()
  clientScannedAt!: string;
}

export class ScannerCheckInSyncDto {
  @IsString()
  assignmentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  manifestVersion!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScannerCheckInSyncEventDto)
  events!: ScannerCheckInSyncEventDto[];
}

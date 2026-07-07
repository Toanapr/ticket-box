import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignScannerDto {
  @IsString()
  @IsNotEmpty()
  concertId!: string;

  @IsString()
  @IsNotEmpty()
  gateCode!: string;

  @IsString()
  @IsNotEmpty()
  zoneCode!: string;
}

export class ProvisionScannerDto {
  @IsString()
  @IsOptional()
  deviceCode?: string;
}

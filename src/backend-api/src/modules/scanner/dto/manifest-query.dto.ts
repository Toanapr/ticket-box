import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ManifestQueryDto {
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  chunkIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chunkSize?: number;
}

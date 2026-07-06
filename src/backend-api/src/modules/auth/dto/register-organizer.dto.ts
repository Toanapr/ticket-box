import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterOrganizerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organizationName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

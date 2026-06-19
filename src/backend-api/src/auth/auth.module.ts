import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController],
  providers: [JwtService, AuthGuard, RolesGuard],
  exports: [JwtService, AuthGuard, RolesGuard],
})
export class AuthModule {}

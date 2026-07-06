import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user';
import { LoginDto } from './dto/login.dto';
import { RegisterAudienceDto } from './dto/register-audience.dto';
import { RegisterOrganizerDto } from './dto/register-organizer.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterAudienceDto) {
    return this.authService.registerAudience(body);
  }

  @Post('admin/register')
  registerOrganizer(@Body() body: RegisterOrganizerDto) {
    return this.authService.registerOrganizer(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: CurrentUser) {
    return this.authService.getCurrentUser(user.sub);
  }
}

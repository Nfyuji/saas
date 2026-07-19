import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsString, MinLength } from 'class-validator';

class InviteDto {
  @IsString() email!: string;
  @IsOptional() @IsString() role?: string;
}

class AcceptDto {
  @IsString() name!: string;
  @IsString() @MinLength(6) password!: string;
}

class BrandingDto {
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsString() companyDisplayName?: string;
}

@Controller('team')
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Get('members')
  @UseGuards(JwtAuthGuard)
  members(@CurrentUser('companyId') companyId: string) {
    return this.teamService.listMembers(companyId);
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard)
  invites(@CurrentUser('companyId') companyId: string) {
    return this.teamService.listInvites(companyId);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  invite(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: InviteDto,
  ) {
    return this.teamService.invite(companyId, userId, dto.email, dto.role);
  }

  @Delete('invites/:id')
  @UseGuards(JwtAuthGuard)
  revoke(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.teamService.revokeInvite(companyId, id);
  }

  @Post('accept/:token')
  accept(@Param('token') token: string, @Body() dto: AcceptDto) {
    return this.teamService.acceptInvite(token, dto.name, dto.password);
  }

  @Get('branding')
  @UseGuards(JwtAuthGuard)
  branding(@CurrentUser('companyId') companyId: string) {
    return this.teamService.getBranding(companyId);
  }

  @Put('branding')
  @UseGuards(JwtAuthGuard)
  updateBranding(@CurrentUser('companyId') companyId: string, @Body() dto: BrandingDto) {
    return this.teamService.updateBranding(companyId, dto);
  }
}

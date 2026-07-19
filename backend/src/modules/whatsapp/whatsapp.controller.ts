import { Controller, Post, Get, Put, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

class ConfigureWhatsAppDto {
  @IsOptional() @IsString() phoneNumberId?: string;
  @IsOptional() @IsString() accessToken?: string;
  @IsOptional() @IsString() businessAccountId?: string;
  @IsOptional() @IsBoolean() aiAutoReply?: boolean;
  @IsOptional() @IsString() welcomeMessage?: string;
}

class TestConnectionDto {
  @IsOptional() @IsString() phoneNumberId?: string;
  @IsOptional() @IsString() accessToken?: string;
}

class EmbeddedSignupDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() phoneNumberId!: string;
  @IsString() @IsNotEmpty() wabaId!: string;
}

class SendMessageDto {
  @IsString() @IsNotEmpty() to!: string;
  @IsString() @IsNotEmpty() type!: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'location';
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() mediaId?: string;
  @IsOptional() @IsString() mediaLink?: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsString() templateName?: string;
  @IsOptional() @IsString() languageCode?: string;
  @IsOptional() templateComponents?: unknown[];
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() locationName?: string;
  @IsOptional() @IsString() locationAddress?: string;
  @IsOptional() @IsString() replyToMessageId?: string;
}

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('status')
  getStatus(@CurrentUser('companyId') companyId: string) {
    return this.whatsappService.getWhatsAppStatus(companyId);
  }

  @Get('meta/config')
  metaConfig() {
    return this.whatsappService.getMetaEmbeddedConfig();
  }

  @Post('meta/embedded-signup')
  embeddedSignup(@CurrentUser('companyId') companyId: string, @Body() dto: EmbeddedSignupDto) {
    return this.whatsappService.completeEmbeddedSignup(companyId, dto);
  }

  @Put('configure')
  configure(@CurrentUser('companyId') companyId: string, @Body() dto: ConfigureWhatsAppDto) {
    return this.whatsappService.configureWhatsApp(companyId, dto);
  }

  @Post('test-connection')
  testConnection(@CurrentUser('companyId') companyId: string, @Body() dto: TestConnectionDto) {
    return this.whatsappService.testConnection(companyId, dto);
  }

  @Post('disconnect')
  disconnect(@CurrentUser('companyId') companyId: string) {
    return this.whatsappService.disconnectWhatsApp(companyId);
  }

  @Post('send')
  sendMessage(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsappService.sendMessage(companyId, userId, dto);
  }

  @Post('send-test')
  sendTest(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { to: string; text?: string },
  ) {
    return this.whatsappService.sendTestToNumber(companyId, userId, dto.to, dto.text);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.whatsappService.uploadMedia(companyId, file.buffer, file.mimetype, file.originalname);
  }

  @Post('read/:messageId')
  markAsRead(@CurrentUser('companyId') companyId: string, @Param('messageId') messageId: string) {
    return this.whatsappService.markAsRead(companyId, messageId);
  }

  @Get('templates')
  getTemplates(@CurrentUser('companyId') companyId: string) {
    return this.whatsappService.getTemplates(companyId);
  }

  @Post('demo/enable')
  enableDemo(@CurrentUser('companyId') companyId: string) {
    return this.whatsappService.enableDemoMode(companyId);
  }

  @Post('demo/simulate')
  simulate(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: { from?: string; text: string; name?: string },
  ) {
    return this.whatsappService.simulateIncoming(companyId, dto);
  }
}

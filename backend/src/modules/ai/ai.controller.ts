import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { IsNotEmpty, IsString } from 'class-validator';

class TestAiDto {
  @IsString() @IsNotEmpty() message!: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('test')
  test(@Body() dto: TestAiDto) {
    return this.aiService.generateReply({
      companyName: 'BusinessOS AI',
      customerName: 'عميل تجريبي',
      messages: [],
      userMessage: dto.message,
    });
  }

  @Post('sentiment')
  sentiment(@Body() dto: TestAiDto) {
    return this.aiService.analyzeCustomerSentiment(dto.message);
  }
}

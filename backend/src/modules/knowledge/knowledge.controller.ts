import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class CreateKnowledgeDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() content!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() filename?: string;
}

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.knowledgeService.findAll(companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateKnowledgeDto) {
    return this.knowledgeService.create(companyId, dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('type') type?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('ارفع ملفاً نصياً (txt, md, csv, json)');
    }
    const name = file.originalname || 'file.txt';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const allowed = ['txt', 'md', 'csv', 'json', 'text', 'log'];
    if (!allowed.includes(ext) && !file.mimetype?.startsWith('text/')) {
      throw new BadRequestException('الصيغ المدعومة حالياً: .txt .md .csv .json');
    }
    const content = file.buffer.toString('utf8').trim();
    if (!content || content.length < 3) {
      throw new BadRequestException('الملف فارغ أو غير قابل للقراءة كنص');
    }
    return this.knowledgeService.create(companyId, {
      title: (title || name.replace(/\.[^.]+$/, '') || 'مستند مرفوع').trim(),
      content: content.slice(0, 100_000),
      type: type || 'catalog',
      filename: name,
    });
  }

  @Put(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateKnowledgeDto> & { isActive?: boolean },
  ) {
    return this.knowledgeService.update(companyId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.knowledgeService.delete(companyId, id);
  }
}

import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
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

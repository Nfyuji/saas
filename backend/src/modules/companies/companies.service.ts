import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';

@Injectable()
export class CompaniesService {
  constructor(@InjectModel(Company.name) private companyModel: Model<CompanyDocument>) {}

  async findOne(id: string) {
    const company = await this.companyModel.findById(id).select('-whatsapp.accessToken');
    if (!company) throw new NotFoundException('الشركة غير موجودة');
    return company;
  }

  async updateSettings(id: string, settings: Record<string, unknown>) {
    const $set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      $set[`settings.${key}`] = value;
    }
    const company = await this.companyModel
      .findByIdAndUpdate(id, { $set }, { new: true })
      .select('-whatsapp.accessToken');
    if (!company) throw new NotFoundException('الشركة غير موجودة');
    return company;
  }

  async updateProfile(id: string, data: { name?: string; phone?: string; industry?: string }) {
    const company = await this.companyModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .select('-whatsapp.accessToken');
    if (!company) throw new NotFoundException('الشركة غير موجودة');
    return company;
  }
}

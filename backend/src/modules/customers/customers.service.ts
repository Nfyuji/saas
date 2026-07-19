import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  async findAll(companyId: string, query?: { search?: string; status?: string; page?: number; limit?: number }) {
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(companyId) };
    if (query?.status) filter.status = query.status;
    if (query?.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.customerModel.find(filter).sort({ lastContactAt: -1 }).skip(skip).limit(limit).lean(),
      this.customerModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const customer = await this.customerModel.findOne({
      _id: id,
      companyId: new Types.ObjectId(companyId),
    });
    if (!customer) throw new NotFoundException('العميل غير موجود');
    return customer;
  }

  async create(companyId: string, data: Partial<Customer>) {
    return this.customerModel.create({ ...data, companyId: new Types.ObjectId(companyId) });
  }

  async update(companyId: string, id: string, data: Partial<Customer>) {
    const customer = await this.customerModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { $set: data },
      { new: true },
    );
    if (!customer) throw new NotFoundException('العميل غير موجود');
    return customer;
  }

  async delete(companyId: string, id: string) {
    const result = await this.customerModel.deleteOne({
      _id: id,
      companyId: new Types.ObjectId(companyId),
    });
    if (!result.deletedCount) throw new NotFoundException('العميل غير موجود');
    return { success: true };
  }

  async getStats(companyId: string) {
    const companyObjId = new Types.ObjectId(companyId);
    const [total, leads, customers, vip] = await Promise.all([
      this.customerModel.countDocuments({ companyId: companyObjId }),
      this.customerModel.countDocuments({ companyId: companyObjId, status: 'lead' }),
      this.customerModel.countDocuments({ companyId: companyObjId, status: 'customer' }),
      this.customerModel.countDocuments({ companyId: companyObjId, status: 'vip' }),
    ]);
    return { total, leads, customers, vip };
  }
}

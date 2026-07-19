import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KnowledgeDocument, KnowledgeDocumentDoc } from '../../schemas/knowledge.schema';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectModel(KnowledgeDocument.name)
    private knowledgeModel: Model<KnowledgeDocumentDoc>,
    private entitlements: PlanEntitlementsService,
  ) {}

  async findAll(companyId: string) {
    await this.entitlements.assertFeature(companyId, 'knowledgeEnabled');
    return this.knowledgeModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async create(
    companyId: string,
    data: { title: string; content: string; type?: string; filename?: string },
  ) {
    await this.entitlements.assertFeature(companyId, 'knowledgeEnabled');
    await this.entitlements.assertLimit(companyId, 'knowledgeDocs');
    return this.knowledgeModel.create({
      companyId: new Types.ObjectId(companyId),
      title: data.title,
      content: data.content,
      type: data.type || 'catalog',
      filename: data.filename,
      isActive: true,
    });
  }

  async update(companyId: string, id: string, data: Partial<KnowledgeDocument>) {
    const doc = await this.knowledgeModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { $set: data },
      { new: true },
    );
    if (!doc) throw new NotFoundException('المستند غير موجود');
    return doc;
  }

  async delete(companyId: string, id: string) {
    const result = await this.knowledgeModel.deleteOne({
      _id: id,
      companyId: new Types.ObjectId(companyId),
    });
    if (!result.deletedCount) throw new NotFoundException('المستند غير موجود');
    return { success: true };
  }

  async getContextForAi(companyId: string, query: string, limit = 3): Promise<string> {
    const docs = await this.knowledgeModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .lean();

    if (!docs.length) return '';

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = docs.map((d) => {
      const text = `${d.title} ${d.content}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (text.includes(t)) score += 1;
      }
      return { doc: d, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = (scored[0]?.score ? scored.filter((s) => s.score > 0) : scored)
      .slice(0, limit)
      .map((s) => s.doc);

    for (const d of top) {
      await this.knowledgeModel.updateOne({ _id: d._id }, { $inc: { useCount: 1 } });
    }

    return top.map((d) => `### ${d.title}\n${d.content.slice(0, 1500)}`).join('\n\n');
  }
}

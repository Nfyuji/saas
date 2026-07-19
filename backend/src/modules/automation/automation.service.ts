import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Automation, AutomationDocument } from '../../schemas/automation.schema';
import { CustomerDocument } from '../../schemas/customer.schema';
import { ConversationDocument } from '../../schemas/conversation.schema';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectModel(Automation.name) private automationModel: Model<AutomationDocument>,
    @Inject(forwardRef(() => WhatsappService)) private whatsappService: WhatsappService,
  ) {}

  async processIncomingMessage(
    companyId: string,
    customer: CustomerDocument,
    conversation: ConversationDocument,
    messageContent: string,
  ) {
    const automations = await this.automationModel.find({
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    });

    for (const automation of automations) {
      const shouldRun = this.checkTrigger(automation, messageContent, customer);
      if (shouldRun) {
        await this.executeActions(companyId, automation, customer, conversation);
        automation.executionCount += 1;
        await automation.save();
      }
    }
  }

  async findAll(companyId: string) {
    return this.automationModel.find({ companyId: new Types.ObjectId(companyId) }).sort({ createdAt: -1 });
  }

  async create(companyId: string, data: Partial<Automation>) {
    return this.automationModel.create({ ...data, companyId: new Types.ObjectId(companyId) });
  }

  async toggle(companyId: string, id: string) {
    const automation = await this.automationModel.findOne({
      _id: id,
      companyId: new Types.ObjectId(companyId),
    });
    if (!automation) return null;
    automation.isActive = !automation.isActive;
    await automation.save();
    return automation;
  }

  async remove(companyId: string, id: string) {
    const result = await this.automationModel.findOneAndDelete({
      _id: id,
      companyId: new Types.ObjectId(companyId),
    });
    if (!result) throw new NotFoundException('الأتمتة غير موجودة');
    return { success: true };
  }

  private checkTrigger(automation: AutomationDocument, message: string, customer: CustomerDocument): boolean {
    switch (automation.trigger) {
      case 'new_customer':
        return customer.totalMessages <= 1;
      case 'keyword': {
        const keywords = (automation.triggerConfig.keywords as string[]) || [];
        return keywords.some((k) => message.toLowerCase().includes(k.toLowerCase()));
      }
      default:
        return false;
    }
  }

  private async executeActions(
    companyId: string,
    automation: AutomationDocument,
    customer: CustomerDocument,
    conversation: ConversationDocument,
  ) {
    for (const action of automation.actions) {
      switch (action.type) {
        case 'add_tag':
          if (action.config.tag && !customer.tags.includes(action.config.tag as string)) {
            customer.tags.push(action.config.tag as string);
            await customer.save();
          }
          break;
        case 'assign_agent':
          if (action.config.agentId) {
            conversation.assignedTo = new Types.ObjectId(action.config.agentId as string);
            await conversation.save();
          }
          break;
        case 'send_message': {
          const text = String(action.config.message || action.config.text || '').trim();
          if (text && customer.phone) {
            try {
              await this.whatsappService.sendMessage(companyId, 'system', {
                to: customer.phone,
                type: 'text',
                text: text.replace(/\{name\}/g, customer.name || 'عميلنا'),
              });
            } catch (e) {
              this.logger.warn(`Automation send_message failed: ${e}`);
            }
          }
          break;
        }
        default:
          this.logger.log(`Action ${action.type} queued for automation ${automation.name}`);
      }
    }
  }
}

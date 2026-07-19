import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GenerateReplyOptions {
  companyName: string;
  instructions?: string;
  customerName: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  knowledgeContext?: string;
  sector?: string;
  salesMode?: boolean;
  customerStatus?: string;
  customerTags?: string[];
  dealStage?: string;
  dealValue?: number;
  dealTitle?: string;
  lastCsatSentiment?: string;
  isBuyer?: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get('OPENAI_API_KEY', '');
    this.model = config.get('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async generateReply(options: GenerateReplyOptions): Promise<string> {
    if (!this.apiKey) {
      return this.fallbackReply(options.userMessage, options.knowledgeContext, options.isBuyer);
    }

    const crmContext = [
      options.customerStatus ? `حالة العميل: ${options.customerStatus}` : '',
      options.customerTags?.length ? `وسوم: ${options.customerTags.join(', ')}` : '',
      options.dealStage ? `مرحلة الصفقة: ${options.dealStage}` : '',
      options.dealTitle ? `عنوان الصفقة: ${options.dealTitle}` : '',
      options.dealValue != null ? `قيمة الصفقة: ${options.dealValue}` : '',
      options.lastCsatSentiment ? `آخر تقييم رضا: ${options.lastCsatSentiment}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const salesRules = options.salesMode
      ? options.isBuyer || options.customerStatus === 'customer' || options.customerStatus === 'vip'
        ? `
أنت مستشار خدمة عملاء ممتاز عبر واتساب لعميل اشترى سابقاً:
- اشكره بلطف واسأله عن تجربته مع المنتج/الجهاز إن لم يقيّم بعد
- ساعده في الاستخدام أو أي مشكلة بسرعة
- اقترح ترقية/ملحق فقط إن كان مناسباً وباختصار
- رسالة قصيرة 2–5 أسطر`
        : `
أنت مندوب مبيعات محترف عبر واتساب:
- أهّل العميل بأسئلة قصيرة (احتياج، ميزانية، توقيت القرار)
- ادفعه لخطوة تالية واضحة: عرض سعر / حجز موعد / إصدار فاتورة
- رسالة واتساب قصيرة (2–5 أسطر)، بدون حشو
- إن طلب سعراً: لخّص العرض واسأله إن يريد فاتورة الآن
- إن كانت مرحلة الصفقة proposal/negotiation: ركّز على إزالة الاعتراضات بلطف
- احفظ نبرة ودّية واحترافية؛ لا تعد بما ليس في معرفة الشركة`
      : '';

    const systemPrompt = `أنت مساعد ذكي لشركة "${options.companyName}"${options.sector ? ` (قطاع: ${options.sector})` : ''}.
${options.instructions ? `تعليمات الشركة: ${options.instructions}` : ''}
${options.knowledgeContext ? `\nمعرفة الشركة (اعتمد عليها في الرد):\n${options.knowledgeContext}` : ''}
${crmContext ? `\nسياق CRM:\n${crmContext}` : ''}
${salesRules}
- رد بالعربية بشكل مهني وودود ومختصر وكأنك مندوب بشري ممتاز
- إذا لم تعرف، قل ذلك بصدق واطلب تحويلاً لموظف
- اسم العميل: ${options.customerName}`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...options.messages.filter((m) => m.content),
            { role: 'user', content: options.userMessage },
          ],
          max_tokens: 450,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return (
        response.data.choices[0]?.message?.content ||
        this.fallbackReply(options.userMessage, options.knowledgeContext, options.isBuyer)
      );
    } catch (error) {
      this.logger.error(`OpenAI error: ${error}`);
      return this.fallbackReply(options.userMessage, options.knowledgeContext, options.isBuyer);
    }
  }

  async generateFollowUp(options: {
    companyName: string;
    customerName: string;
    step: number;
    sector?: string;
    kind?: 'sales' | 'post_purchase';
    productHint?: string;
  }): Promise<string> {
    const product = options.productHint || 'المنتج/الجهاز';

    if (!this.apiKey) {
      if (options.kind === 'post_purchase') {
        const templates = [
          `مرحباً ${options.customerName} 🌟 شكراً لثقتك فينا! حابين نتأكد: هل ${product} عجبك؟ وأي ملاحظة تساعدنا.`,
          `أهلاً ${options.customerName}، نتمنى يكون كل شيء تمام. لو احتجت مساعدة بالاستخدام — راسلنا هنا.`,
        ];
        return templates[Math.min(options.step - 1, templates.length - 1)];
      }
      const templates = [
        `مرحباً ${options.customerName}، هل احتجت مساعدة إضافية؟ نحن جاهزون 😊`,
        `أهلاً ${options.customerName}، فقط للتذكير — هل ما زلت مهتماً؟ يمكنني إرسال عرض سعر.`,
        `مرحباً ${options.customerName}، آخر متابعة منّا 🙏 يسعدنا خدمتك متى ما أحببت.`,
      ];
      return templates[Math.min(options.step - 1, templates.length - 1)];
    }

    try {
      const system =
        options.kind === 'post_purchase'
          ? `اكتب رسالة واتساب قصيرة بالعربية بعد الشراء من ${options.companyName}. اسأل بلطف إن كان ${product} عجب العميل ${options.customerName}. الخطوة ${options.step}. بدون علامات اقتباس.`
          : `اكتب رسالة متابعة واتساب قصيرة بالعربية لشركة ${options.companyName}. الخطوة ${options.step}. اسم العميل ${options.customerName}. بدون علامات اقتباس.`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: 'اكتب الرسالة فقط.' },
          ],
          max_tokens: 140,
          temperature: 0.8,
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );
      return (
        response.data.choices[0]?.message?.content?.trim() ||
        `مرحباً ${options.customerName}، نود التأكد إن كنت بحاجة لأي مساعدة من ${options.companyName}.`
      );
    } catch {
      return `مرحباً ${options.customerName}، نود التأكد إن كنت بحاجة لأي مساعدة من ${options.companyName}.`;
    }
  }

  async analyzeCustomerSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    const lower = text.toLowerCase();
    if (
      /حلو|ممتاز|رائع|شكرا|تمام|زين|عجبني|راضي|perfect|great|good|love|👍|😍|❤️/.test(lower)
    ) {
      return 'positive';
    }
    if (/سيء|مشكلة|خربان|ما عجبني|رديء|bad|hate|❌|😡/.test(lower)) {
      return 'negative';
    }

    if (!this.apiKey) return 'neutral';
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: 'Analyze sentiment. Reply with only: positive, neutral, or negative' },
            { role: 'user', content: text },
          ],
          max_tokens: 10,
          temperature: 0,
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );
      const result = response.data.choices[0]?.message?.content?.trim().toLowerCase();
      if (['positive', 'neutral', 'negative'].includes(result)) {
        return result as 'positive' | 'neutral' | 'negative';
      }
      return 'neutral';
    } catch {
      return 'neutral';
    }
  }

  private fallbackReply(userMessage: string, knowledge?: string, isBuyer?: boolean): string {
    const lower = userMessage.toLowerCase();
    if (isBuyer && (/حلو|عجب|تمام|زين|ممتاز|سيء|مشكلة/.test(lower))) {
      if (/سيء|مشكلة|خربان|ما عجب/.test(lower)) {
        return 'نعتذر جداً 🙏 فريقنا بيتواصل معك فوراً لحل المشكلة. لو تقدر توصف لنا اللي صار باختصار؟';
      }
      return 'يسعدنا جداً إنك راضي! 🌟 لو احتجت أي شيء لاحقاً أو تبي توصية لمنتج مكمل — إحنا هنا.';
    }
    if (knowledge && (lower.includes('سعر') || lower.includes('منتج') || lower.includes('خدمة'))) {
      return `شكراً لسؤالك! حسب معلوماتنا:\n${knowledge.slice(0, 400)}\n\nهل تريد عرض سعر أو تفاصيل أكثر؟`;
    }
    if (lower.includes('سعر') || lower.includes('price') || lower.includes('تكلف')) {
      return 'شكراً لتواصلك! سأحضّر لك عرض سعر مناسب. ما المنتج/الخدمة التي تهمك؟';
    }
    if (lower.includes('فاتورة') || lower.includes('دفع') || lower.includes('ادفع')) {
      return 'بالتأكيد! يمكنني إصدار فاتورة برابط دفع مباشرة. أخبرني بالخدمة/المنتج المطلوب.';
    }
    if (lower.includes('مرحب') || lower.includes('hello') || lower.includes('السلام')) {
      return 'مرحباً بك! 👋 كيف يمكنني مساعدتك اليوم؟';
    }
    if (lower.includes('شكر') || lower.includes('thank')) {
      return 'العفو! نحن سعداء بخدمتك. هل تحتاج أي مساعدة أخرى؟';
    }
    return 'شكراً لرسالتك! كيف أقدر أساعدك اليوم — استفسار، عرض سعر، أو متابعة طلب؟';
  }
}

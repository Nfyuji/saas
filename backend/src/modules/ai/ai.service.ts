import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import {
  PlatformSettings,
  PlatformSettingsDocument,
} from '../../schemas/platform-settings.schema';
import { AiUsageLog, AiUsageLogDocument } from '../../schemas/ai-usage-log.schema';

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

type AiProvider = 'openai' | 'gemini';

interface ResolvedAiConfig {
  provider: AiProvider;
  openaiKey: string;
  geminiKey: string;
  openaiModel: string;
  geminiModel: string;
  preferred: string;
  enabled: boolean;
  openaiBudget: number;
  geminiBudget: number;
  openaiUsed: number;
  geminiUsed: number;
  openaiRequests: number;
  geminiRequests: number;
  monthKey: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private config: ConfigService,
    @InjectModel(PlatformSettings.name)
    private settingsModel: Model<PlatformSettingsDocument>,
    @InjectModel(AiUsageLog.name) private usageModel: Model<AiUsageLogDocument>,
  ) {}

  private monthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private dayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
  }

  private maskKey(key?: string | null) {
    if (!key) return '';
    if (key.length <= 8) return '••••';
    return `${'•'.repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
  }

  async getSettingsDoc() {
    let settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      settings = await this.settingsModel.create({
        key: 'default',
        openaiApiKey: this.config.get('OPENAI_API_KEY', '') || undefined,
        openaiModel: this.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
        geminiApiKey: this.config.get('GEMINI_API_KEY', '') || undefined,
        geminiModel: this.config.get('GEMINI_MODEL', 'gemini-2.0-flash'),
        aiProvider: 'auto',
        aiEnabled: true,
        openaiMonthlyTokenBudget: 1_000_000,
        geminiMonthlyTokenBudget: 1_000_000,
        aiUsageMonthKey: this.monthKey(),
      });
    }

    const mk = this.monthKey();
    if (settings.aiUsageMonthKey !== mk) {
      settings.aiUsageMonthKey = mk;
      settings.openaiTokensUsedMonth = 0;
      settings.geminiTokensUsedMonth = 0;
      settings.openaiRequestsMonth = 0;
      settings.geminiRequestsMonth = 0;
      await settings.save();
    }

    return settings;
  }

  async resolveConfig(): Promise<ResolvedAiConfig> {
    const s = await this.getSettingsDoc();
    const openaiKey = (s.openaiApiKey || this.config.get('OPENAI_API_KEY', '') || '').trim();
    const geminiKey = (s.geminiApiKey || this.config.get('GEMINI_API_KEY', '') || '').trim();
    const preferred = s.aiProvider || 'auto';

    let provider: AiProvider = 'openai';
    if (preferred === 'gemini' && geminiKey) provider = 'gemini';
    else if (preferred === 'openai' && openaiKey) provider = 'openai';
    else if (preferred === 'auto') {
      provider = openaiKey ? 'openai' : geminiKey ? 'gemini' : 'openai';
    } else if (geminiKey) provider = 'gemini';

    return {
      provider,
      openaiKey,
      geminiKey,
      openaiModel: s.openaiModel || this.config.get('OPENAI_MODEL', 'gpt-4o-mini') || 'gpt-4o-mini',
      geminiModel: s.geminiModel || this.config.get('GEMINI_MODEL', 'gemini-2.0-flash') || 'gemini-2.0-flash',
      preferred,
      enabled: s.aiEnabled !== false,
      openaiBudget: s.openaiMonthlyTokenBudget ?? 1_000_000,
      geminiBudget: s.geminiMonthlyTokenBudget ?? 1_000_000,
      openaiUsed: s.openaiTokensUsedMonth || 0,
      geminiUsed: s.geminiTokensUsedMonth || 0,
      openaiRequests: s.openaiRequestsMonth || 0,
      geminiRequests: s.geminiRequestsMonth || 0,
      monthKey: s.aiUsageMonthKey || this.monthKey(),
    };
  }

  async getAdminAiStatus() {
    const cfg = await this.resolveConfig();
    const openaiRemaining =
      cfg.openaiBudget > 0 ? Math.max(0, cfg.openaiBudget - cfg.openaiUsed) : null;
    const geminiRemaining =
      cfg.geminiBudget > 0 ? Math.max(0, cfg.geminiBudget - cfg.geminiUsed) : null;

    const last7 = await this.usageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { day: '$dayKey', provider: '$provider' },
          tokens: { $sum: '$totalTokens' },
          requests: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    return {
      enabled: cfg.enabled,
      preferredProvider: cfg.preferred,
      activeProvider: cfg.openaiKey || cfg.geminiKey ? cfg.provider : null,
      monthKey: cfg.monthKey,
      openai: {
        configured: !!cfg.openaiKey,
        maskedKey: this.maskKey(cfg.openaiKey),
        model: cfg.openaiModel,
        monthlyBudget: cfg.openaiBudget,
        usedTokens: cfg.openaiUsed,
        remainingTokens: openaiRemaining,
        usedPercent:
          cfg.openaiBudget > 0
            ? Math.min(100, Math.round((cfg.openaiUsed / cfg.openaiBudget) * 100))
            : null,
        requestsMonth: cfg.openaiRequests,
        status:
          !cfg.openaiKey
            ? 'missing'
            : cfg.openaiBudget > 0 && cfg.openaiUsed >= cfg.openaiBudget
              ? 'exhausted'
              : cfg.openaiBudget > 0 && cfg.openaiUsed / cfg.openaiBudget >= 0.9
                ? 'low'
                : 'ok',
      },
      gemini: {
        configured: !!cfg.geminiKey,
        maskedKey: this.maskKey(cfg.geminiKey),
        model: cfg.geminiModel,
        monthlyBudget: cfg.geminiBudget,
        usedTokens: cfg.geminiUsed,
        remainingTokens: geminiRemaining,
        usedPercent:
          cfg.geminiBudget > 0
            ? Math.min(100, Math.round((cfg.geminiUsed / cfg.geminiBudget) * 100))
            : null,
        requestsMonth: cfg.geminiRequests,
        status:
          !cfg.geminiKey
            ? 'missing'
            : cfg.geminiBudget > 0 && cfg.geminiUsed >= cfg.geminiBudget
              ? 'exhausted'
              : cfg.geminiBudget > 0 && cfg.geminiUsed / cfg.geminiBudget >= 0.9
                ? 'low'
                : 'ok',
      },
      series7d: last7.map((r) => ({
        day: r._id.day,
        provider: r._id.provider,
        tokens: r.tokens,
        requests: r.requests,
      })),
    };
  }

  async updateAdminAiKeys(data: {
    aiProvider?: string;
    openaiApiKey?: string;
    openaiModel?: string;
    geminiApiKey?: string;
    geminiModel?: string;
    openaiMonthlyTokenBudget?: number;
    geminiMonthlyTokenBudget?: number;
    aiEnabled?: boolean;
    resetUsage?: boolean;
  }) {
    const s = await this.getSettingsDoc();
    if (data.aiProvider && ['openai', 'gemini', 'auto'].includes(data.aiProvider)) {
      s.aiProvider = data.aiProvider;
    }
    if (typeof data.aiEnabled === 'boolean') s.aiEnabled = data.aiEnabled;
    if (data.openaiModel?.trim()) s.openaiModel = data.openaiModel.trim();
    if (data.geminiModel?.trim()) s.geminiModel = data.geminiModel.trim();
    if (typeof data.openaiMonthlyTokenBudget === 'number') {
      s.openaiMonthlyTokenBudget = Math.max(0, data.openaiMonthlyTokenBudget);
    }
    if (typeof data.geminiMonthlyTokenBudget === 'number') {
      s.geminiMonthlyTokenBudget = Math.max(0, data.geminiMonthlyTokenBudget);
    }

    // لا نستبدل المفتاح إذا أُرسل قناعاً أو فارغاً عمداً مع الحفاظ
    if (data.openaiApiKey !== undefined) {
      const k = data.openaiApiKey.trim();
      if (!k) {
        // إفراغ صريح فقط إذا أرسل "__clear__"
      } else if (k === '__clear__') {
        s.openaiApiKey = undefined;
      } else if (!k.includes('•')) {
        s.openaiApiKey = k;
      }
    }
    if (data.geminiApiKey !== undefined) {
      const k = data.geminiApiKey.trim();
      if (k === '__clear__') {
        s.geminiApiKey = undefined;
      } else if (k && !k.includes('•')) {
        s.geminiApiKey = k;
      }
    }

    if (data.resetUsage) {
      s.openaiTokensUsedMonth = 0;
      s.geminiTokensUsedMonth = 0;
      s.openaiRequestsMonth = 0;
      s.geminiRequestsMonth = 0;
      s.aiUsageMonthKey = this.monthKey();
    }

    await s.save();
    return this.getAdminAiStatus();
  }

  async testProvider(provider: 'openai' | 'gemini') {
    const cfg = await this.resolveConfig();
    if (provider === 'openai') {
      if (!cfg.openaiKey) throw new BadRequestException('مفتاح OpenAI غير مضبوط');
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: cfg.openaiModel,
          messages: [{ role: 'user', content: 'قل: ok' }],
          max_tokens: 5,
        },
        {
          headers: { Authorization: `Bearer ${cfg.openaiKey}`, 'Content-Type': 'application/json' },
          timeout: 20000,
        },
      );
      const usage = res.data.usage || {};
      await this.recordUsage('openai', cfg.openaiModel, 'test', usage, true);
      return {
        success: true,
        provider: 'openai',
        model: cfg.openaiModel,
        reply: res.data.choices?.[0]?.message?.content,
        usage,
      };
    }

    if (!cfg.geminiKey) throw new BadRequestException('مفتاح Gemini غير مضبوط');
    const model = cfg.geminiModel;
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.geminiKey}`,
      {
        contents: [{ role: 'user', parts: [{ text: 'قل: ok' }] }],
        generationConfig: { maxOutputTokens: 8 },
      },
      { timeout: 20000 },
    );
    const text =
      res.data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') ||
      '';
    const usageMeta = res.data?.usageMetadata || {};
    await this.recordUsage(
      'gemini',
      model,
      'test',
      {
        prompt_tokens: usageMeta.promptTokenCount || 0,
        completion_tokens: usageMeta.candidatesTokenCount || 0,
        total_tokens: usageMeta.totalTokenCount || 0,
      },
      true,
    );
    return { success: true, provider: 'gemini', model, reply: text, usage: usageMeta };
  }

  private async assertBudget(provider: AiProvider, cfg: ResolvedAiConfig) {
    if (!cfg.enabled) {
      throw new ServiceUnavailableException('الذكاء الاصطناعي متوقف من لوحة الأدمن');
    }
    const used = provider === 'openai' ? cfg.openaiUsed : cfg.geminiUsed;
    const budget = provider === 'openai' ? cfg.openaiBudget : cfg.geminiBudget;
    if (budget > 0 && used >= budget) {
      throw new ServiceUnavailableException(
        `انتهت ميزانية توكنات ${provider} لهذا الشهر (${used}/${budget}). زد الميزانية أو صفّر العداد من لوحة الأدمن.`,
      );
    }
  }

  private async recordUsage(
    provider: AiProvider,
    model: string,
    purpose: string,
    usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
    success: boolean,
    error?: string,
  ) {
    const prompt = usage.prompt_tokens || 0;
    const completion = usage.completion_tokens || 0;
    const total = usage.total_tokens || prompt + completion;

    await this.usageModel.create({
      provider,
      model,
      purpose,
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total,
      success,
      error,
      dayKey: this.dayKey(),
    });

    const s = await this.getSettingsDoc();
    if (provider === 'openai') {
      s.openaiTokensUsedMonth = (s.openaiTokensUsedMonth || 0) + total;
      s.openaiRequestsMonth = (s.openaiRequestsMonth || 0) + 1;
    } else {
      s.geminiTokensUsedMonth = (s.geminiTokensUsedMonth || 0) + total;
      s.geminiRequestsMonth = (s.geminiRequestsMonth || 0) + 1;
    }
    await s.save();
  }

  private async chatComplete(
    system: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    opts: { maxTokens?: number; temperature?: number; purpose?: string; json?: boolean } = {},
  ): Promise<string | null> {
    const cfg = await this.resolveConfig();
    const purpose = opts.purpose || 'chat';

    const tryOpenAI = async () => {
      if (!cfg.openaiKey) return null;
      await this.assertBudget('openai', cfg);
      const body: Record<string, unknown> = {
        model: cfg.openaiModel,
        messages: [{ role: 'system', content: system }, ...messages.filter((m) => m.role !== 'system')],
        max_tokens: opts.maxTokens ?? 450,
        temperature: opts.temperature ?? 0.7,
      };
      if (opts.json) body.response_format = { type: 'json_object' };
      const response = await axios.post('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          Authorization: `Bearer ${cfg.openaiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      });
      await this.recordUsage('openai', cfg.openaiModel, purpose, response.data.usage || {}, true);
      return response.data.choices[0]?.message?.content?.trim() || null;
    };

    const tryGemini = async () => {
      if (!cfg.geminiKey) return null;
      await this.assertBudget('gemini', cfg);
      const contents = messages
        .filter((m) => m.role !== 'system' && m.content)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
      if (!contents.length) {
        contents.push({ role: 'user', parts: [{ text: '...' }] });
      }
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiModel}:generateContent?key=${cfg.geminiKey}`,
        {
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            maxOutputTokens: opts.maxTokens ?? 450,
            temperature: opts.temperature ?? 0.7,
            ...(opts.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
        { timeout: 45000 },
      );
      const text =
        response.data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || '')
          .join('')
          .trim() || null;
      const usageMeta = response.data?.usageMetadata || {};
      await this.recordUsage(
        'gemini',
        cfg.geminiModel,
        purpose,
        {
          prompt_tokens: usageMeta.promptTokenCount || 0,
          completion_tokens: usageMeta.candidatesTokenCount || 0,
          total_tokens: usageMeta.totalTokenCount || 0,
        },
        true,
      );
      return text;
    };

    const order: Array<() => Promise<string | null>> =
      cfg.provider === 'gemini' ? [tryGemini, tryOpenAI] : [tryOpenAI, tryGemini];

    for (const fn of order) {
      try {
        const out = await fn();
        if (out) return out;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`AI call failed (${purpose}): ${msg}`);
        if (msg.includes('ميزانية') || msg.includes('متوقف')) throw error;
      }
    }
    return null;
  }

  async generateReply(options: GenerateReplyOptions): Promise<string> {
    const cfg = await this.resolveConfig();
    if ((!cfg.openaiKey && !cfg.geminiKey) || !cfg.enabled) {
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
      const content = await this.chatComplete(
        systemPrompt,
        [
          ...options.messages.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: options.userMessage },
        ],
        { maxTokens: 450, temperature: 0.7, purpose: 'sales_reply' },
      );
      return content || this.fallbackReply(options.userMessage, options.knowledgeContext, options.isBuyer);
    } catch (error) {
      this.logger.error(`AI generateReply error: ${error}`);
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
    const cfg = await this.resolveConfig();

    if ((!cfg.openaiKey && !cfg.geminiKey) || !cfg.enabled) {
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

      const content = await this.chatComplete(system, [{ role: 'user', content: 'اكتب الرسالة فقط.' }], {
        maxTokens: 140,
        temperature: 0.8,
        purpose: 'followup',
      });
      return (
        content ||
        `مرحباً ${options.customerName}، نود التأكد إن كنت بحاجة لأي مساعدة من ${options.companyName}.`
      );
    } catch {
      return `مرحباً ${options.customerName}، نود التأكد إن كنت بحاجة لأي مساعدة من ${options.companyName}.`;
    }
  }

  async analyzeCustomerSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    const lower = text.toLowerCase();
    if (/حلو|ممتاز|رائع|شكرا|تمام|زين|عجبني|راضي|perfect|great|good|love|👍|😍|❤️/.test(lower)) {
      return 'positive';
    }
    if (/سيء|مشكلة|خربان|ما عجبني|رديء|bad|hate|❌|😡/.test(lower)) {
      return 'negative';
    }

    const cfg = await this.resolveConfig();
    if ((!cfg.openaiKey && !cfg.geminiKey) || !cfg.enabled) return 'neutral';
    try {
      const result = await this.chatComplete(
        'Analyze sentiment. Reply with only: positive, neutral, or negative',
        [{ role: 'user', content: text }],
        { maxTokens: 10, temperature: 0, purpose: 'sentiment' },
      );
      const cleaned = result?.trim().toLowerCase() || '';
      if (['positive', 'neutral', 'negative'].includes(cleaned)) {
        return cleaned as 'positive' | 'neutral' | 'negative';
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

  async completeText(system: string, user: string, fallback: string, maxTokens = 700): Promise<string> {
    const cfg = await this.resolveConfig();
    if ((!cfg.openaiKey && !cfg.geminiKey) || !cfg.enabled) return fallback;
    try {
      const content = await this.chatComplete(system, [{ role: 'user', content: user }], {
        maxTokens,
        temperature: 0.7,
        purpose: 'complete_text',
      });
      return content || fallback;
    } catch (error) {
      this.logger.error(`completeText failed: ${error}`);
      return fallback;
    }
  }

  async completeJson<T>(system: string, user: string, fallback: T): Promise<T> {
    const cfg = await this.resolveConfig();
    if ((!cfg.openaiKey && !cfg.geminiKey) || !cfg.enabled) return fallback;
    try {
      const raw = await this.chatComplete(
        `${system}\nأرجع JSON صالح فقط بدون markdown.`,
        [{ role: 'user', content: user }],
        { maxTokens: 900, temperature: 0.5, purpose: 'complete_json', json: true },
      );
      if (!raw) return fallback;
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      return { ...fallback, ...JSON.parse(cleaned) } as T;
    } catch (error) {
      this.logger.error(`completeJson failed: ${error}`);
      return fallback;
    }
  }
}

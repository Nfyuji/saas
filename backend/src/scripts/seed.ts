import 'dotenv/config';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/businessos';
  console.log(
    'Seeding database:',
    uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
  );
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const companies = db.collection('companies');
  const users = db.collection('users');
  const knowledge = db.collection('knowledgedocuments');

  const password = await bcrypt.hash('123456', 12);

  // ===== أدمن المنصة (Super Admin) =====
  const platformEmail = 'admin@businessos.ai';
  await users.deleteMany({ email: platformEmail });
  await users.insertOne({
    name: 'أدمن المنصة',
    email: platformEmail,
    password,
    role: 'super_admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ===== حساب شركة تجريبية (مستخدم/مشترك) =====
  const email = 'demo@businessos.ai';
  await users.deleteMany({ email });
  await companies.deleteMany({ email });

  const companyId = new mongoose.Types.ObjectId();
  await companies.insertOne({
    _id: companyId,
    name: 'شركة العرض التجريبي',
    email,
    phone: '966500000000',
    sector: 'ecommerce',
    plan: 'growth',
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    settings: {
      language: 'ar',
      aiEnabled: true,
      salesAgentEnabled: true,
      autoFollowUp: true,
      followUpHours: [2, 24, 72],
      aiInstructions: 'أنت بائع متجر إلكتروني. كن مختصرًا وادفع لعرض السعر أو الدفع.',
    },
    whatsapp: {
      phoneNumberId: `demo_${companyId.toString()}`,
      accessToken: 'demo_token',
      displayPhoneNumber: '+966 50 000 0000',
      verifiedName: 'Demo Store',
      webhookConfigured: true,
      aiAutoReply: true,
      welcomeMessage: 'مرحباً بك في متجرنا!',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await users.insertOne({
    name: 'مدير الشركة',
    email,
    password,
    companyId,
    role: 'owner',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await knowledge.deleteMany({ companyId });
  await knowledge.insertOne({
    companyId,
    title: 'كتالوج المنتجات',
    type: 'catalog',
    content:
      'سماعات بلوتوث: 199 ريال\nشاحن سريع: 79 ريال\nساعة ذكية: 349 ريال\nالشحن مجاني فوق 200 ريال\nالدفع عند الاستلام أو رابط إلكتروني',
    isActive: true,
    useCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Seed completed');
  console.log('====================================');
  console.log('أدمن المنصة (يشترك/يوقف المشتركين):');
  console.log('  http://localhost:3000/admin');
  console.log('  admin@businessos.ai / 123456');
  console.log('------------------------------------');
  console.log('مستخدم شركة (لوحة التحكم العادية):');
  console.log('  http://localhost:3000/dashboard');
  console.log('  demo@businessos.ai / 123456');
  console.log('====================================');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db('businessos');
  const users = await db
    .collection('users')
    .find({ email: { $in: ['demo@businessos.ai', 'admin@businessos.ai'] } })
    .project({ email: 1, password: 1, isActive: 1, role: 1, companyId: 1, isPlatformAdmin: 1 })
    .toArray();
  console.log('users', users.length);
  for (const u of users) {
    const ok = await bcrypt.compare('123456', u.password || '');
    console.log(
      JSON.stringify({
        email: u.email,
        hasPass: !!u.password,
        active: u.isActive,
        role: u.role,
        admin: !!u.isPlatformAdmin,
        bcryptOk: ok,
        companyId: u.companyId ? String(u.companyId) : null,
      }),
    );
  }
  const companies = await db
    .collection('companies')
    .find({})
    .project({ name: 1, isActive: 1, plan: 1, planExpiresAt: 1 })
    .limit(5)
    .toArray();
  console.log('companies', JSON.stringify(companies, null, 2));
  await c.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

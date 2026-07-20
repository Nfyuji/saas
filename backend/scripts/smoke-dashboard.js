const fs = require('fs');
const path = require('path');
const base = 'http://localhost:3001/api';

async function main() {
  const login = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@businessos.ai', password: '123456' }),
  }).then((r) => r.json());

  if (!login.accessToken) {
    console.error('login failed', login);
    process.exit(1);
  }

  const h = {
    Authorization: 'Bearer ' + login.accessToken,
    'Content-Type': 'application/json',
  };
  const tests = [];

  async function t(name, method, pathName, body) {
    try {
      const r = await fetch(base + pathName, {
        method,
        headers: h,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        tests.push({ name, status: 'FAIL', detail: String(j.message || r.status) });
        return;
      }
      let d = 'ok';
      if (j.aiReply) d = j.aiReply.slice(0, 180);
      else if (Array.isArray(j)) d = 'count=' + j.length;
      else if (j.data && Array.isArray(j.data)) d = 'count=' + j.data.length;
      else if (j.title) d = j.title;
      else if (j.summary) d = JSON.stringify(j.summary).slice(0, 140);
      else if (j.configured !== undefined)
        d = `wa ai=${j.aiAutoReply} provider=${j.provider}`;
      else if (j.settings)
        d = `sales=${j.settings.salesAgentEnabled} ai=${j.settings.aiEnabled}`;
      else if (j.user) d = j.user.email || 'profile';
      else if (j.total !== undefined) d = 'total=' + j.total;
      tests.push({ name, status: 'OK', detail: d });
    } catch (e) {
      tests.push({ name, status: 'FAIL', detail: e.message });
    }
  }

  await t('profile', 'GET', '/auth/profile');
  await t('company', 'GET', '/companies/me');
  await t('whatsapp', 'GET', '/whatsapp/status');
  await t('stats', 'GET', '/dashboard/stats');
  await t('reports', 'GET', '/dashboard/reports');
  await t('customers', 'GET', '/customers');
  await t('deals', 'GET', '/deals');
  await t('inbox', 'GET', '/conversations');
  await t('followups', 'GET', '/followups');
  await t('opportunities', 'GET', '/followups/opportunities');
  await t('knowledge', 'GET', '/knowledge');
  await t('automations', 'GET', '/automations');
  await t('team', 'GET', '/team/members');
  await t('webhooks', 'GET', '/webhooks/outbound');
  await t('content', 'GET', '/intelligence/content');
  await t('social', 'GET', '/intelligence/social');
  await t('forecast', 'GET', '/intelligence/forecast');
  await t('executive', 'GET', '/intelligence/executive');
  await t('competitors', 'GET', '/intelligence/competitors');
  await t('usage', 'GET', '/billing/usage');
  await t('invoices', 'GET', '/invoices');
  await t('notifications', 'GET', '/notifications');
  await t('campaign preview', 'POST', '/campaigns/preview', {});
  await t('save agent', 'PUT', '/companies/me/settings', {
    aiInstructions: 'نحن متجر. الأسعار من المعرفة فقط. أجب باختصار بالعربية.',
    aiEnabled: true,
    salesAgentEnabled: true,
  });
  await t('knowledge create', 'POST', '/knowledge', {
    title: 'أسعار باقات',
    type: 'catalog',
    content: 'باقة النمو: 49 دولار شهرياً. باقة الاحتراف: 99 دولار شهرياً.',
  });

  const tmp = path.join(process.env.TEMP || '/tmp', 'bos-policy.txt');
  fs.writeFileSync(tmp, 'سياسة الاسترجاع: يمكن الإرجاع خلال 7 أيام فقط.', 'utf8');
  const fd = new FormData();
  const buf = fs.readFileSync(tmp);
  fd.append('file', new Blob([buf], { type: 'text/plain' }), 'policy.txt');
  fd.append('type', 'policy');
  fd.append('title', 'سياسة الاسترجاع');
  const up = await fetch(base + '/knowledge/upload', {
    method: 'POST',
    headers: { Authorization: h.Authorization },
    body: fd,
  });
  const uj = await up.json().catch(() => ({}));
  tests.push({
    name: 'knowledge upload',
    status: up.ok ? 'OK' : 'FAIL',
    detail: up.ok ? uj.title || uj.filename || 'uploaded' : String(uj.message || up.status),
  });

  const sim = await fetch(base + '/whatsapp/demo/simulate', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      from: '967711223344',
      name: 'عميل معرفة',
      text: 'كم سعر باقة النمو؟ وهل فيه استرجاع؟',
    }),
  });
  const sj = await sim.json().catch(() => ({}));
  tests.push({
    name: 'AI agent reply',
    status: sim.ok && sj.aiReply ? 'OK' : 'FAIL',
    detail: sim.ok
      ? String(sj.aiReply || JSON.stringify(sj)).slice(0, 250)
      : String(sj.message || sim.status),
  });

  const out = path.join(__dirname, 'smoke-result.json');
  fs.writeFileSync(out, JSON.stringify(tests, null, 2), 'utf8');
  console.log(JSON.stringify(tests, null, 2));
  const fail = tests.filter((x) => x.status === 'FAIL');
  console.log('SUMMARY ok=' + (tests.length - fail.length) + ' fail=' + fail.length);
  console.log('Wrote ' + out);
  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

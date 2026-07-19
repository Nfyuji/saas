/**
 * اختبار خفيف بدون Jest — يتحقق من ثوابت الباقات.
 * تشغيل: npm run test
 */
import { DEFAULT_PLANS } from '../modules/plans/plans.service';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(DEFAULT_PLANS.length >= 4, 'يجب وجود 4 باقات افتراضية على الأقل');
assert(DEFAULT_PLANS.every((p) => p.code && p.name), 'كل باقة تحتاج code و name');
assert(DEFAULT_PLANS.some((p) => p.popular), 'يجب وجود باقة popular');
assert(
  DEFAULT_PLANS.every((p) => p.limits && 'messagesPerDay' in (p.limits || {})),
  'كل باقة تحتاج messagesPerDay',
);

console.log('✅ plans defaults ok');

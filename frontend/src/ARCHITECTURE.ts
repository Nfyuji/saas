/**
 * معمارية الواجهة (SPA-like)
 *
 * - lib/api.ts          → عميل HTTP موحّد (JWT, timeout, abort, errors)
 * - services/           → استدعاءات API حسب النطاق
 * - hooks/              → React Query (cache, invalidate, optimistic)
 * - types/              → أنواع مشتركة
 * - utils/              → debounce وغيرها
 * - providers/          → QueryClient + Toast
 *
 * الصفحات المهاجرة كنموذج: customers, deals, knowledge
 * باقي الصفحات ما زالت تعمل عبر api مباشرة — انقلها تدريجياً لنفس النمط.
 */
export {};

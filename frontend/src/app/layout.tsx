import type { Metadata, Viewport } from 'next';
import { Tajawal, Cairo } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { DeviceAccessGate } from '@/components/DeviceAccessGate';
import './globals.css';

const tajawal = Tajawal({
  variable: '--font-arabic',
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
});

const cairo = Cairo({
  variable: '--font-display',
  subsets: ['arabic'],
  weight: ['700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'BusinessOS AI · نظام التشغيل الذكي للشركات',
  description: 'منصة إدارة الشركات بالذكاء الاصطناعي وواتساب',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${cairo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <AuthProvider>
          <DeviceAccessGate>{children}</DeviceAccessGate>
        </AuthProvider>
      </body>
    </html>
  );
}

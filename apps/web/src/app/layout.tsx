import './globals.css';
import { Providers } from './providers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PulseTime - Workforce Time Tracking & Productivity SaaS',
  description: 'Enterprise multi-tenant workforce monitoring, time-tracking, activity analytics, and employee productivity platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

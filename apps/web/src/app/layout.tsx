import './globals.css';
import { Providers } from './providers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TimeLogger - Workforce Time Tracking & Productivity SaaS',
  description: 'Enterprise multi-tenant workforce monitoring, time-tracking, activity analytics, and employee productivity platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f4f4f4] text-[#161616] min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

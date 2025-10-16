import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { MSWProvider } from '@/components/providers/msw-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MoneyWise - Personal Finance Management',
  description: 'AI-powered personal finance management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <MSWProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </MSWProvider>
      </body>
    </html>
  );
}

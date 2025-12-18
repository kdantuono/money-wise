import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { MSWProvider } from '@/components/providers/msw-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

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
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            <MSWProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </MSWProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { Navigation } from './components/navigation';
import Header from './components/Header';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MoneyWise - Smart Personal Finance',
  description: 'Automatically track your spending, subscriptions, and income',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <AuthProvider>
          <AppProvider>
            <div className='min-h-screen bg-[#F5F7FA]'>
              <div className='flex'>
                {/* Desktop Navigation */}
                <div className='hidden lg:block'>
                  <Navigation />
                </div>
                <main className='flex-1'>
                  <Header />
                  {children}
                </main>
              </div>
            </div>
            <Toaster richColors />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

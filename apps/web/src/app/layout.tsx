import type { Metadata } from 'next';
// Local font instead of Google Fonts to avoid external dependencies
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { Navigation } from './components/navigation';
import Header from './components/Header';
import { Toaster } from '@/components/ui/sonner';

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
      <body className="font-sans antialiased">{/* Using system font instead of Inter */}
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

'use client';
import {
  BellIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

const Header = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className='sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-blue-100 px-4 py-4 lg:px-8 shadow-sm'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='sm'
            className='lg:hidden hover:bg-blue-50'
          >
            <MenuIcon className='h-6 w-6 text-blue-700' />
          </Button>
          <h1 className='text-xl font-bold text-blue-950'>
            {pathname === '/' ? '💼 Financial Overview' : '⚙️ Settings'}
          </h1>
        </div>
        <div className='flex items-center gap-4'>
          <div className='relative hidden lg:block'>
            <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400' />
            <Input
              className='w-[300px] pl-9 bg-blue-50/50 border-blue-200 focus:border-blue-500 rounded-full'
              placeholder='Search transactions, cards...'
            />
          </div>
          <button className='hidden rounded-full p-2 bg-blue-50 hover:bg-blue-100 transition-colors lg:block'>
            <SettingsIcon className='h-5 w-5 text-blue-600' />
          </button>
          <button className='hidden relative rounded-full p-2 bg-green-50 hover:bg-green-100 transition-colors lg:block'>
            <BellIcon className='h-5 w-5 text-green-600' />
            <div className='w-2 h-2 bg-blue-500 rounded-full absolute top-1 right-2'></div>
          </button>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center text-sm font-medium'>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={logout}
              className='text-red-600 hover:text-red-700 hidden lg:flex'
            >
              <LogOut className='mr-2 h-4 w-4' />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

'use client';
import {
  BellIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Navigation } from './navigation';
import { usePathname } from 'next/navigation';

const Header = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className='sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-blue-100 px-4 py-4 lg:px-8 shadow-sm'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='lg:hidden hover:bg-blue-50'
              >
                <MenuIcon className='h-6 w-6 text-blue-700' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='w-64 p-0'>
              <SheetHeader className='hidden'>
                <SheetTitle></SheetTitle>
                <SheetDescription></SheetDescription>
              </SheetHeader>
              <Navigation />
            </SheetContent>
          </Sheet>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
                <Avatar>
                  <AvatarImage src={'/placeholder.svg'} />
                  <AvatarFallback className='bg-gradient-to-r from-blue-600 to-purple-600 text-white'>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-56' align='end' forceMount>
              <div className='flex flex-col space-y-1 p-2'>
                <p className='text-sm font-medium leading-none'>{user?.name}</p>
                <p className='text-xs leading-none text-muted-foreground'>
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className='text-red-600 focus:text-red-600 cursor-pointer'
              >
                <LogOut className='mr-2 h-4 w-4' />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Header;

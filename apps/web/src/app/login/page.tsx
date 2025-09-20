'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3002/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Welcome back!');
        router.push('/');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Login failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Logo/Brand - Trust-Building Financial Institution Style */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl mb-4 shadow-lg'>
            <span className='text-2xl font-bold text-white'>M</span>
          </div>
          <h1 className='text-3xl font-bold text-white mb-2'>MoneyWise</h1>
          <p className='text-blue-200'>Secure Personal Finance Management</p>

          {/* Trust Indicators */}
          <div className='flex items-center justify-center space-x-4 mt-4 text-xs text-blue-300'>
            <div className='flex items-center space-x-1'>
              <div className='w-2 h-2 bg-green-400 rounded-full'></div>
              <span>Bank-Level Security</span>
            </div>
            <div className='flex items-center space-x-1'>
              <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>

        <Card className='shadow-xl border border-blue-800/20 bg-white/95 backdrop-blur-sm'>
          <CardHeader className='space-y-1 pb-4'>
            <CardTitle className='text-2xl font-bold text-center text-blue-950'>
              Welcome Back
            </CardTitle>
            <CardDescription className='text-center text-slate-600'>
              Sign in to manage your finances securely
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor='email'
                  className='text-sm font-medium text-blue-950'
                >
                  Email Address
                </Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500' />
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className='pl-10 h-12 border-blue-200 focus:border-blue-600 focus:ring-blue-600/20 rounded-xl bg-blue-50/30'
                    placeholder='Enter your email'
                    required
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='password'
                  className='text-sm font-medium text-blue-950'
                >
                  Password
                </Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500' />
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className='pl-10 pr-10 h-12 border-blue-200 focus:border-blue-600 focus:ring-blue-600/20 rounded-xl bg-blue-50/30'
                    placeholder='Enter your password'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700'
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <Link
                  href='/forgot-password'
                  className='text-sm text-blue-600 hover:text-blue-500 font-medium'
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type='submit'
                disabled={loading}
                className='w-full h-12 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl'
              >
                {loading ? (
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Signing in securely...
                  </div>
                ) : (
                  <div className='flex items-center'>
                    Sign In Securely
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </div>
                )}
              </Button>
            </form>

            <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t border-gray-200' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-white px-2 text-gray-500'>
                  Demo Credentials
                </span>
              </div>
            </div>

            <div className='text-center space-y-2'>
              <p className='text-sm text-gray-600'>
                <strong>Email:</strong> test@example.com
              </p>
              <p className='text-sm text-gray-600'>
                <strong>Password:</strong> password123
              </p>
            </div>

            <div className='text-center mt-6'>
              <p className='text-sm text-gray-600'>
                Don't have an account?{' '}
                <Link
                  href='/register'
                  className='font-semibold text-blue-600 hover:text-blue-500'
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await register(
        formData.name,
        formData.email,
        formData.password
      );

      if (result.success) {
        toast.success('Account created successfully!');
        router.push('/');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 6)
      return { strength: 1, text: 'Weak', color: 'bg-red-500' };
    if (password.length < 10)
      return { strength: 2, text: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, text: 'Strong', color: 'bg-green-500' };
  };

  const strength = passwordStrength();

  return (
    <div className='min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E8EBF0] flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Logo/Brand */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4'>
            <span className='text-2xl font-bold text-white'>M</span>
          </div>
          <h1 className='text-3xl font-bold text-[#2D3648] mb-2'>MoneyWise</h1>
          <p className='text-gray-600'>Smart Personal Finance Management</p>
        </div>

        <Card className='shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
          <CardHeader className='space-y-1 pb-4'>
            <CardTitle className='text-2xl font-bold text-center text-[#2D3648]'>
              Create Account
            </CardTitle>
            <CardDescription className='text-center text-gray-600'>
              Join MoneyWise and start managing your finances
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor='name'
                  className='text-sm font-medium text-[#2D3648]'
                >
                  Full Name
                </Label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <Input
                    id='name'
                    type='text'
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    className='pl-10 h-12 border-gray-200 focus:border-blue-500 rounded-xl'
                    placeholder='Enter your full name'
                    required
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='email'
                  className='text-sm font-medium text-[#2D3648]'
                >
                  Email Address
                </Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <Input
                    id='email'
                    type='email'
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className='pl-10 h-12 border-gray-200 focus:border-blue-500 rounded-xl'
                    placeholder='Enter your email'
                    required
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='password'
                  className='text-sm font-medium text-[#2D3648]'
                >
                  Password
                </Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e =>
                      handleInputChange('password', e.target.value)
                    }
                    className='pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 rounded-xl'
                    placeholder='Create a password'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
                {formData.password && (
                  <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <div className='flex-1 h-2 bg-gray-200 rounded-full overflow-hidden'>
                        <div
                          className={`h-full transition-all duration-300 ${strength.color}`}
                          style={{ width: `${(strength.strength / 3) * 100}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          strength.strength === 1
                            ? 'text-red-500'
                            : strength.strength === 2
                              ? 'text-yellow-500'
                              : 'text-green-500'
                        }`}
                      >
                        {strength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='confirmPassword'
                  className='text-sm font-medium text-[#2D3648]'
                >
                  Confirm Password
                </Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <Input
                    id='confirmPassword'
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e =>
                      handleInputChange('confirmPassword', e.target.value)
                    }
                    className='pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 rounded-xl'
                    placeholder='Confirm your password'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                  {formData.confirmPassword &&
                    formData.password === formData.confirmPassword && (
                      <CheckCircle className='absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500' />
                    )}
                </div>
              </div>

              <Button
                type='submit'
                disabled={loading}
                className='w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200'
              >
                {loading ? (
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Creating Account...
                  </div>
                ) : (
                  <div className='flex items-center'>
                    Create Account
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </div>
                )}
              </Button>
            </form>

            <div className='text-center mt-6'>
              <p className='text-sm text-gray-600'>
                Already have an account?{' '}
                <Link
                  href='/login'
                  className='font-semibold text-blue-600 hover:text-blue-500'
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div className='text-xs text-gray-500 text-center mt-4'>
              By creating an account, you agree to our{' '}
              <Link href='/terms' className='text-blue-600 hover:underline'>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href='/privacy' className='text-blue-600 hover:underline'>
                Privacy Policy
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

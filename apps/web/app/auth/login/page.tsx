'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError()
      await login(data.email, data.password)
      router.push('/dashboard')
    } catch (_error) {
      // Error is handled by the store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-[-0.01em] text-foreground">
            <span className="text-emerald-500">&#9679;</span> Zecca
          </h2>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">
            Accedi al tuo account
          </p>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[14px] font-semibold">Accedi</CardTitle>
            <CardDescription className="text-[13px]">
              Inserisci email e password per accedere
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} data-testid="login-form">
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md" data-testid="error-message" role="alert">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                    data-testid="email-input"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive" data-testid="email-error">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      {...register('password')}
                      className={errors.password ? 'border-destructive' : ''}
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <span className="text-gray-400 text-sm" aria-hidden="true">Hide</span>
                      ) : (
                        <span className="text-gray-400 text-sm" aria-hidden="true">Show</span>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive" data-testid="password-error">{errors.password.message}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="login-button"
                >
                  {isLoading ? 'Accesso in corso...' : 'Accedi'}
                </Button>

                <p className="text-center text-[13px] text-muted-foreground">
                  Non hai un account?{' '}
                  <Link
                    href="/auth/register"
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Registrati
                  </Link>
                </p>
              </CardFooter>
            </form>
        </Card>
      </div>
    </div>
  )
}
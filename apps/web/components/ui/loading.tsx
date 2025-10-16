import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingScreenProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function LoadingScreen({ message = 'Loading...', size = 'lg' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <LoadingSpinner size={size} className="mb-4" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}

interface LoadingCardProps {
  message?: string
  className?: string
}

export function LoadingCard({ message = 'Loading...', className }: LoadingCardProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <LoadingSpinner className="mb-4" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}

interface LoadingButtonProps {
  children: React.ReactNode
  isLoading: boolean
  loadingText?: string
  className?: string
}

export function LoadingButton({
  children,
  isLoading,
  loadingText = 'Loading...',
  className
}: LoadingButtonProps) {
  return (
    <button disabled={isLoading} className={cn('flex items-center justify-center', className)}>
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
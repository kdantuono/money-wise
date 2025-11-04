import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          MoneyWise
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          AI-powered Personal Finance Management
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <Button size="lg">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap, Shield } from 'lucide-react'

// SRP: Single Responsibility - Handle login form logic only
interface LoginFormProps {
  email: string
  password: string
  isLoading: boolean
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit
}) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
          <Mail className="h-4 w-4 text-cyan-400" />
          Access ID
        </Label>
        <div className="relative group">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="relative z-40 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all duration-300 pointer-events-auto"
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none rounded-md z-35"></div>
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
          <Lock className="h-4 w-4 text-purple-400" />
          Security Key
        </Label>
        <div className="relative group">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="relative z-40 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-400 focus:ring-purple-400/20 pr-12 transition-all duration-300 pointer-events-auto"
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-50 pointer-events-auto"
            disabled={isLoading}
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/10 to-purple-400/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none rounded-md z-35"></div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="relative z-40 w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none pointer-events-auto"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 animate-spin" />
            UNLOCKING SYSTEM...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            AUTHENTICATE
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </Button>
    </form>
  )
}
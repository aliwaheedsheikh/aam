import { useState } from 'react';
import { Button } from '../ui/button';
import { Lock, Building2 } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      try {
        setIsSubmitting(true);
        setErrorMessage('');
        await onLogin(username, password);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Login failed');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <Building2 className="size-8 text-[#1F3A5F]" strokeWidth={2} />
            <h1 className="text-2xl font-semibold text-[#2E2E2E] tracking-tight">
              VenueOps ERP
            </h1>
          </div>
          <p className="text-sm text-[#6B7280]">
            Unified Operations Platform for Banquet, Catering & Hospitality
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-7">
          {/* Secure Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 text-xs text-[#6B7280]">
            <Lock className="size-3.5" />
            <span>Secure Enterprise Login</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">
                User Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter user name"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1F3A5F] focus:border-transparent transition-colors text-[#2E2E2E] placeholder:text-gray-400"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1F3A5F] focus:border-transparent transition-colors text-[#2E2E2E] placeholder:text-gray-400"
                required
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-[#1F3A5F] hover:text-[#2C5282] font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Sign In Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={!username || !password || isSubmitting}
                className="w-full py-2.5 text-sm font-medium bg-[#1F3A5F] hover:bg-[#2C5282] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[#9CA3AF]">
          © 2026 VenueOps ERP. All rights reserved.
        </div>
      </div>
    </div>
  );
}

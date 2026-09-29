import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { GoogleLogo } from '@/components/auth/GoogleLogo'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function continueWithGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ url: string }>('/auth/google/url', { skipAuth: true })
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
      setGoogleLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email, password }),
      })
      setAuthSession(data.accessToken, data.refreshToken, data.user)
      navigate('/all-files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFD] p-4 dark:bg-[#131314]">
      <div className="w-full max-w-[420px] rounded-[28px] border border-[#E0E3E7] bg-white p-8 shadow-sm dark:border-[#36373A] dark:bg-[#1E1F20]">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">Sign in</h1>
          <p className="mt-1 text-sm text-[#747775] dark:text-[#8E918F]">to continue to 9Drive</p>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-4">
          <div>
            <label className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-[#F9DEDC]/50 border border-[#F9DEDC] p-2.5 text-xs text-[#B3261E]">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-between">
            <Link
              to="/register"
              className="text-xs font-medium text-[#0B57D0] hover:underline dark:text-[#A8C7FA]"
            >
              Create account
            </Link>
            <Button disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-[#E0E3E7] dark:border-[#36373A]">
          <Button
            variant="outline"
            className="w-full"
            disabled={googleLoading}
            onClick={continueWithGoogle}
          >
            <GoogleLogo />
            <span>{googleLoading ? 'Redirecting...' : 'Sign in with Google'}</span>
          </Button>
        </div>
      </div>
    </main>
  )
}

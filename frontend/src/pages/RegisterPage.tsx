import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { GoogleLogo } from '@/components/auth/GoogleLogo'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'
import { useLanguage } from '@/context/LanguageContext'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()

declare global {
  interface Window {
    grecaptcha?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => number
      reset: (widgetId?: number) => void
    }
  }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const recaptchaRef = useRef<HTMLDivElement | null>(null)
  const recaptchaWidgetId = useRef<number | null>(null)

  useEffect(() => {
    if (!recaptchaSiteKey) return
    const scriptId = 'google-recaptcha-script'
    const renderCaptcha = () => {
      if (!recaptchaRef.current || !window.grecaptcha || recaptchaWidgetId.current !== null) return
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: recaptchaSiteKey,
        callback: setCaptchaToken,
        'expired-callback': () => setCaptchaToken(''),
      })
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = renderCaptcha
      document.body.appendChild(script)
    } else {
      renderCaptcha()
    }
  }, [])

  async function continueWithGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ url: string }>('/auth/google/url', { skipAuth: true })
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google register failed')
      setGoogleLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (recaptchaSiteKey && !captchaToken) {
      setError('Please complete the captcha.')
      setLoading(false)
      return
    }
    try {
      const data = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ name, email, password, captchaToken }),
      })
      setAuthSession(data.accessToken, data.refreshToken, data.user)
      navigate('/all-files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed')
      if (recaptchaWidgetId.current !== null) window.grecaptcha?.reset(recaptchaWidgetId.current)
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFD] p-4 dark:bg-[#131314]">
      <div className="w-full max-w-[420px] rounded-[28px] border border-[#E0E3E7] bg-white p-8 shadow-sm dark:border-[#36373A] dark:bg-[#1E1F20]">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-normal text-[#1F1F1F] dark:text-[#E3E3E3]">{t('auth.create_account', 'Create account')}</h1>
          <p className="mt-1 text-sm text-[#747775] dark:text-[#8E918F]">{t('auth.start', 'to start using 9Drive')}</p>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-4">
          <div>
            <label htmlFor="register-name" className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">
              {t('auth.name', 'Your name')}
            </label>
            <Input
              value={name}
              id="register-name" name="name" autoComplete="name" aria-invalid={Boolean(error)} aria-describedby={error ? 'register-error' : undefined}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.full_name', 'First and last name')}
              required
            />
          </div>

          <div>
            <label htmlFor="register-email" className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">
              Email
            </label>
            <Input
              type="email"
              id="register-email" name="email" autoComplete="email" aria-invalid={Boolean(error)} aria-describedby={error ? 'register-error' : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] block mb-1">
              {t('auth.password', 'Password')}
            </label>
            <Input
              type="password"
              id="register-password" name="password" autoComplete="new-password" aria-invalid={Boolean(error)} aria-describedby={error ? 'register-error' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.choose_password', 'Choose a strong password')}
              required
            />
          </div>

          {recaptchaSiteKey && (
            <div className="flex justify-center pt-1">
              <div ref={recaptchaRef} />
            </div>
          )}

          {error ? (
            <p id="register-error" role="alert" className="rounded-lg bg-[#F9DEDC]/50 border border-[#F9DEDC] p-2.5 text-xs text-[#B3261E] dark:bg-[#8C1D18]/30 dark:border-[#F2B8B5] dark:text-[#F2B8B5]">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-between">
            <Link
              to="/login"
              className="text-xs font-medium text-[#0B57D0] hover:underline dark:text-[#A8C7FA]"
            >
              {t('auth.sign_in_instead', 'Sign in instead')}
            </Link>
            <Button disabled={loading}>
              {loading ? t('auth.creating', 'Creating account…') : t('auth.create_account', 'Create account')}
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
            <span>{googleLoading ? t('auth.redirecting', 'Redirecting…') : t('auth.google_sign_up', 'Sign up with Google')}</span>
          </Button>
        </div>
      </div>
    </main>
  )
}

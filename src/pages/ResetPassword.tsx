import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthService } from '@/services/authService'
import { APP_HOME } from '@/config/routes'
import { supabase } from '@/lib/supabase'
import { useAuthModalStore } from '@/store/authModalStore'
import { useAuthStore } from '@/store/authStore'
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles'
import { toast } from 'sonner'

type ResetStatus = 'checking' | 'ready' | 'invalid' | 'success'

const RECOVERY_SESSION_WAIT_MS = 2500

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export default function ResetPassword() {
  const navigate = useNavigate()
  const passwordId = useId()
  const confirmPasswordId = useId()
  const { openAuthModal } = useAuthModalStore()
  const { setUser } = useAuthStore()
  const [status, setStatus] = useState<ResetStatus>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const handledRecoveryRef = useRef(false)

  useEffect(() => {
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let isMounted = true

    const markReady = (user: unknown) => {
      if (!isMounted || handledRecoveryRef.current) return
      handledRecoveryRef.current = true
      setUser(user as Parameters<typeof setUser>[0])
      setStatus('ready')
      setErrorMessage(null)
    }

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
        timeoutTimer = null
      }
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user) {
        cleanup()
        markReady(session.user)
      }
    })

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          cleanup()
          markReady(data.session.user)
        }
      } catch {
        // The invalid-link fallback below gives the user a way back to sign in.
      }
    }

    void checkSession()

    pollTimer = setInterval(() => {
      void checkSession()
    }, 250)

    timeoutTimer = setTimeout(() => {
      cleanup()
      if (!handledRecoveryRef.current && isMounted) {
        setStatus('invalid')
        setErrorMessage('This password reset link is invalid or has expired.')
      }
    }, RECOVERY_SESSION_WAIT_MS)

    return () => {
      isMounted = false
      cleanup()
      authListener.subscription.unsubscribe()
    }
  }, [setUser])

  const handleBackToSignIn = () => {
    navigate(APP_HOME)
    openAuthModal()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await AuthService.updatePassword(password)
      const user = await AuthService.getCurrentUser()
      setUser(user)
      setStatus('success')
      toast.success('Password updated successfully')
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to update password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <section
        className="w-full max-w-md rounded-xl p-6 text-center shadow-2xl"
        style={getGlassmorphismStyles('dark')}
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: getColor('text', 'primary') as string }}
        >
          Reset Password
        </h1>

        {status === 'checking' && (
          <div className="mt-6 space-y-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white/80" />
            <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
              Checking your reset link...
            </p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="mt-6 space-y-4">
            <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
              {errorMessage}
            </p>
            <Button
              type="button"
              className="w-full"
              style={getGlassmorphismStyles('buttonAccent')}
              onClick={handleBackToSignIn}
            >
              Back to Sign In
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6 space-y-4">
            <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
              Your password has been updated. You can continue to StoryboardFlow.
            </p>
            <Button
              type="button"
              className="w-full"
              style={getGlassmorphismStyles('buttonAccent')}
              onClick={() => navigate(APP_HOME)}
            >
              Continue to App
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <p className="text-center text-sm" style={{ color: getColor('text', 'secondary') as string }}>
              Enter a new password for your account.
            </p>
            <div>
              <Label htmlFor={passwordId} style={{ color: getColor('text', 'secondary') as string }}>
                New Password
              </Label>
              <Input
                id={passwordId}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={6}
                style={{
                  backgroundColor: getColor('input', 'background') as string,
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
                className="placeholder:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor={confirmPasswordId} style={{ color: getColor('text', 'secondary') as string }}>
                Confirm Password
              </Label>
              <Input
                id={confirmPasswordId}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={6}
                style={{
                  backgroundColor: getColor('input', 'background') as string,
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
                className="placeholder:opacity-50"
              />
            </div>
            {errorMessage && (
              <p className="text-sm" role="alert" style={{ color: getColor('text', 'secondary') as string }}>
                {errorMessage}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
      </section>
    </main>
  )
}

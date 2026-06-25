import { useEffect, useId, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { Chrome } from 'lucide-react'
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles'
import { AuthService } from '@/services/authService'
import { useAuthModalStore } from '@/store/authModalStore'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const RESEND_COOLDOWN_SECONDS = 60

type ResendStatus = 'idle' | 'sending' | 'sent' | 'error'
type PasswordResetStatus = 'idle' | 'sent'

const isEmailNotConfirmedError = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (code === 'email_not_confirmed') return true
  }

  const message = getErrorMessage(error, '').toLowerCase()
  return (
    message.includes('user not confirmed') ||
    message.includes('email address is not confirmed')
  )
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupNoticeEmail, setSignupNoticeEmail] = useState<string | null>(null)
  const [verificationRecoveryMode, setVerificationRecoveryMode] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<ResendStatus>('idle')
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)
  const [passwordResetMode, setPasswordResetMode] = useState(false)
  const [passwordResetStatus, setPasswordResetStatus] = useState<PasswordResetStatus>('idle')
  const idBase = useId()
  const emailId = `${idBase}-email`
  const passwordId = `${idBase}-password`
  const displayNameId = `${idBase}-displayName`
  const resetEmailId = `${idBase}-reset-email`
  
  const { signIn, signUp, signInWithGoogle, setLogoutReason } = useAuthStore()
  const authModalMode = useAuthModalStore((state) => state.authModalMode)

  useEffect(() => {
    if (!isOpen) return
    setIsSignUp(authModalMode === 'sign-up')
  }, [isOpen, authModalMode])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (isSignUp) {
        await signUp(email, password, displayName)
        setSignupNoticeEmail(email)
      } else {
        await signIn(email, password)
        toast.success('Signed in successfully!')
        onClose()
      }
      // Reset any previous forced-logout reason once user successfully authenticates
      setLogoutReason('none')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Authentication failed'))
      if (!isSignUp && isEmailNotConfirmedError(error)) {
        setPendingVerificationEmail(email)
        setVerificationRecoveryMode(true)
        setResendStatus('idle')
        setResendError(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleContinueAfterSignup = () => {
    setSignupNoticeEmail(null)
    onClose()
  }

  const handleModalOpenChange = (open: boolean) => {
    if (open) return
    setSignupNoticeEmail(null)
    setVerificationRecoveryMode(false)
    setPendingVerificationEmail(null)
    setResendStatus('idle')
    setResendError(null)
    setPasswordResetMode(false)
    setPasswordResetStatus('idle')
    onClose()
  }

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setResendCooldownSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldownSeconds])

  const handleResendVerificationEmail = async () => {
    if (!pendingVerificationEmail || resendStatus === 'sending' || resendCooldownSeconds > 0) return

    setResendStatus('sending')
    setResendError(null)
    try {
      await AuthService.resendConfirmationEmail(pendingVerificationEmail)
      setResendStatus('sent')
      setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS)
      toast.success('Verification email sent')
    } catch (error: unknown) {
      setResendStatus('error')
      setResendError(getErrorMessage(error, 'Failed to resend verification email'))
      toast.error(getErrorMessage(error, 'Failed to resend verification email'))
    }
  }

  const handleBackToSignIn = () => {
    setVerificationRecoveryMode(false)
    setPendingVerificationEmail(null)
    setIsSignUp(false)
    setResendStatus('idle')
    setResendError(null)
    setPasswordResetMode(false)
    setPasswordResetStatus('idle')
  }

  const handleForgotPassword = () => {
    setIsSignUp(false)
    setPassword('')
    setPasswordResetMode(true)
    setPasswordResetStatus('idle')
  }

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await AuthService.requestPasswordReset(email)
      setPasswordResetStatus('sent')
      toast.success('Password reset email sent')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send password reset email'))
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmailAfterSignup = async () => {
    setLoading(true)
    try {
      await AuthService.signOut()
      setSignupNoticeEmail(null)
      setIsSignUp(true)
      setEmail('')
      setPassword('')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to change email'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    
    try {
      await signInWithGoogle()
      // Reset any previous forced-logout reason
      setLogoutReason('none')
      // Note: User will be redirected, so we don't close the modal here
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Google authentication failed'))
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent 
        className="sm:max-w-[360px]"
        style={getGlassmorphismStyles('dark')}
      >
        {signupNoticeEmail ? (
          <>
            <DialogHeader className="text-center space-y-2">
              <DialogTitle
                className="text-2xl font-bold"
                style={{
                  color: getColor('text', 'primary') as string,
                  textAlign: 'center'
                }}
              >
                Check your inbox
              </DialogTitle>
              <DialogDescription
                className="text-sm"
                style={{
                  color: getColor('text', 'secondary') as string,
                  textAlign: 'center'
                }}
              >
                We sent a verification email to:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-4 pb-4 text-center">
              <p className="text-sm font-medium" style={{ color: getColor('text', 'primary') as string }}>
                {signupNoticeEmail}
              </p>
              <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                You can continue using StoryboardFlow while you verify your account. Your work stays saved on this device until verification is complete.
              </p>
              <Button
                type="button"
                className="w-full"
                style={getGlassmorphismStyles('buttonAccent')}
                onClick={handleContinueAfterSignup}
                disabled={loading}
              >
                Continue
              </Button>
              <Button
                type="button"
                className="w-full"
                style={getGlassmorphismStyles('buttonSecondary')}
                onClick={() => void handleChangeEmailAfterSignup()}
                disabled={loading}
              >
                Change email
              </Button>
            </div>
          </>
        ) : passwordResetMode ? (
          <>
            <DialogHeader className="text-center space-y-2">
              <DialogTitle
                className="text-2xl font-bold"
                style={{
                  color: getColor('text', 'primary') as string,
                  textAlign: 'center'
                }}
              >
                Reset Password
              </DialogTitle>
              <DialogDescription
                className="text-sm"
                style={{
                  color: getColor('text', 'secondary') as string,
                  textAlign: 'center'
                }}
              >
                {passwordResetStatus === 'sent'
                  ? "Check your email for a password reset link. If you don't see it, check your spam folder."
                  : 'Enter your email and we will send you a secure reset link.'}
              </DialogDescription>
            </DialogHeader>
            {passwordResetStatus === 'sent' ? (
              <div className="space-y-4 px-4 pb-4 text-center">
                <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                  If an account exists for this email, you will receive instructions to choose a new password.
                </p>
                <p className="text-sm font-medium" style={{ color: getColor('text', 'primary') as string }}>
                  {email}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  style={getGlassmorphismStyles('buttonAccent')}
                  onClick={handleBackToSignIn}
                  disabled={loading}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4 px-4 pb-4">
                <div>
                  <Label htmlFor={resetEmailId} style={{ color: getColor('text', 'secondary') as string }}>Email</Label>
                  <Input
                    id={resetEmailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    style={{
                      backgroundColor: getColor('input', 'background') as string,
                      border: `1px solid ${getColor('input', 'border') as string}`,
                      color: getColor('text', 'primary') as string
                    }}
                    className="placeholder:opacity-50"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  style={getGlassmorphismStyles('buttonAccent')}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  style={getGlassmorphismStyles('buttonSecondary')}
                  onClick={handleBackToSignIn}
                  disabled={loading}
                >
                  Back to Sign In
                </Button>
              </form>
            )}
          </>
        ) : verificationRecoveryMode ? (
          <>
            <DialogHeader className="text-center space-y-2">
              <DialogTitle
                className="text-2xl font-bold"
                style={{
                  color: getColor('text', 'primary') as string,
                  textAlign: 'center'
                }}
              >
                Verify Your Email
              </DialogTitle>
              <DialogDescription
                className="text-sm"
                style={{
                  color: getColor('text', 'secondary') as string,
                  textAlign: 'center'
                }}
              >
                Your account exists, but your email address has not yet been verified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-4 pb-4 text-center">
              <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                Verify your email to access your saved project.
              </p>
              {pendingVerificationEmail && (
                <p className="text-sm font-medium" style={{ color: getColor('text', 'primary') as string }}>
                  {pendingVerificationEmail}
                </p>
              )}
              <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                If your original verification link has expired, request a new verification email below. If your account has been verified please use the Sign In button below.
              </p>
              <p
                className="min-h-[1rem] text-xs"
                aria-live="polite"
                aria-atomic="true"
                style={{
                  color: (resendStatus === 'error' ? getColor('text', 'secondary') : getColor('text', 'muted')) as string,
                  visibility: resendStatus === 'idle' ? 'hidden' : 'visible'
                }}
              >
                {resendStatus === 'sent'
                  ? 'Verification email sent. Please check your inbox.'
                  : resendStatus === 'error'
                    ? resendError || 'Failed to resend verification email.'
                    : '\u00A0'}
              </p>
              <Button
                type="button"
                className="w-full"
                style={getGlassmorphismStyles('buttonAccent')}
                onClick={() => void handleResendVerificationEmail()}
                disabled={loading || resendStatus === 'sending' || resendCooldownSeconds > 0 || !pendingVerificationEmail}
              >
                {resendStatus === 'sending'
                  ? 'Sending...'
                  : resendCooldownSeconds > 0
                    ? `Resend available in ${resendCooldownSeconds} seconds`
                    : 'Resend Verification Email'}
              </Button>
              <Button
                type="button"
                className="w-full"
                style={getGlassmorphismStyles('buttonSecondary')}
                onClick={handleBackToSignIn}
                disabled={loading}
              >
                Sign In
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center space-y-2">
              <DialogTitle 
                className="text-2xl font-bold"
                style={{ 
                  color: getColor('text', 'primary') as string,
                  textAlign: 'center'
                }}
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </DialogTitle>
              <DialogDescription 
                className="text-base leading-relaxed pt-1"
                style={{ 
                  color: getColor('text', 'secondary') as string,
                  textAlign: 'center'
                }}
              >
                {isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="font-semibold underline underline-offset-4 decoration-1 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                      style={{
                        color: getColor('brand', 'primary') as string,
                        outlineColor: getColor('brand', 'primary') as string,
                      }}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New user?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="font-semibold underline underline-offset-4 decoration-1 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                      style={{
                        color: getColor('brand', 'primary') as string,
                        outlineColor: getColor('brand', 'primary') as string,
                      }}
                    >
                      Create an account
                    </button>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          {isSignUp && (
            <div>
              <Label htmlFor={displayNameId} style={{ color: getColor('text', 'secondary') as string }}>Display Name</Label>
              <Input
                id={displayNameId}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                style={{ 
                  backgroundColor: getColor('input', 'background') as string, 
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
                className="placeholder:opacity-50"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor={emailId} style={{ color: getColor('text', 'secondary') as string }}>Email</Label>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              style={{ 
                backgroundColor: getColor('input', 'background') as string, 
                border: `1px solid ${getColor('input', 'border') as string}`,
                color: getColor('text', 'primary') as string
              }}
              className="placeholder:opacity-50"
            />
          </div>
          
          <div>
            <Label htmlFor={passwordId} style={{ color: getColor('text', 'secondary') as string }}>Password</Label>
            <Input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
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
          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm underline disabled:opacity-50"
                style={{ color: getColor('brand', 'primary') as string }}
              >
                Forgot password?
              </button>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
            style={getGlassmorphismStyles('buttonAccent')}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        {/* Social Login Divider */}
        <div className="relative px-4">
          <div className="absolute inset-0 flex items-center px-4">
            <span 
              className="w-full" 
              style={{ 
                borderTop: `1px solid ${getColor('input', 'border') as string}`
              }}
            />
          </div>
          <div className="relative flex justify-center text-xs">
            <span 
              className="px-2" 
              style={{ 
                color: getColor('text', 'muted') as string,
                backgroundColor: getColor('background', 'secondary') as string
              }}
            >
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-2 px-4 pb-4">
          <Button
            type="button"
            className="w-full"
            style={getGlassmorphismStyles('button')}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
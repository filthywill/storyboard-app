import { useId, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { Github, Chrome, Apple } from 'lucide-react'
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const idBase = useId()
  const emailId = `${idBase}-email`
  const passwordId = `${idBase}-password`
  const displayNameId = `${idBase}-displayName`
  
  const { signIn, signUp, signInWithGoogle, signInWithGitHub, signInWithApple, setLogoutReason } = useAuthStore()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (isSignUp) {
        await signUp(email, password, displayName)
        toast.success('Account created! Please check your email.')
      } else {
        await signIn(email, password)
        toast.success('Signed in successfully!')
      }
      // Reset any previous forced-logout reason once user successfully authenticates
      setLogoutReason('none')
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github' | 'apple') => {
    setLoading(true)
    
    try {
      if (provider === 'google') {
        await signInWithGoogle()
      } else if (provider === 'github') {
        await signInWithGitHub()
      } else if (provider === 'apple') {
        await signInWithApple()
      }
      // Reset any previous forced-logout reason
      setLogoutReason('none')
      // Note: User will be redirected, so we don't close the modal here
    } catch (error: any) {
      toast.error(error.message || `${provider} authentication failed`)
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent 
        className="sm:max-w-[360px]"
        style={getGlassmorphismStyles('dark')}
      >
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
            className="text-sm"
            style={{ 
              color: getColor('text', 'secondary') as string,
              textAlign: 'center'
            }}
          >
            {isSignUp ? (
              <>Already have an account? <button type="button" onClick={() => setIsSignUp(false)} style={{ color: getColor('button', 'primary') as string, textDecoration: 'underline' }}>Sign in</button></>
            ) : (
              <>New user? <button type="button" onClick={() => setIsSignUp(true)} style={{ color: getColor('button', 'primary') as string, textDecoration: 'underline' }}>Create an account</button></>
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
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
          
          <Button
            type="button"
            className="w-full"
            style={getGlassmorphismStyles('button')}
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          
          <Button
            type="button"
            className="w-full"
            style={getGlassmorphismStyles('button')}
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
          >
            <Apple className="w-4 h-4 mr-2" />
            Continue with Apple
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
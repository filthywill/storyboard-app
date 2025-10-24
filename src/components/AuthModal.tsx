import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { Github, Chrome, Apple } from 'lucide-react'

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSignUp ? 'Create Account' : 'Sign In'}</DialogTitle>
          <DialogDescription>
            {isSignUp 
              ? 'Create a new account to start using Storyboard Flow' 
              : 'Sign in to your account to continue'
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Social Login Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
          >
            <Apple className="w-4 h-4 mr-2" />
            Continue with Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
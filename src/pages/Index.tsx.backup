import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { AuthService } from '@/services/authService'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUser, setLogoutReason } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          navigate('/?error=auth_failed')
          return
        }

        if (data.session?.user) {
          // User successfully authenticated
          setUser(data.session.user)
          setLogoutReason('none')
          
          // Handle session management for social logins
          try {
            await AuthService.handleExistingSessions(data.session.user.id)
            await AuthService.createSessionRecord(data.session.user.id)
          } catch (error) {
            console.warn('Session management failed:', error)
            // Don't block the login if session management fails
          }
          
          navigate('/')
        } else {
          // No session found
          navigate('/?error=no_session')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/?error=auth_failed')
      }
    }

    handleAuthCallback()
  }, [navigate, setUser, setLogoutReason])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}

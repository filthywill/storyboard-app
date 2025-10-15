import { supabase } from '@/lib/supabase'

export class AuthService {
  private static currentSessionId: string | null = null;
  static async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    })
    
    if (error) throw error
    
    // Create user profile
    if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email: data.user.email,
        display_name: displayName
      })
    }
    
    return data
  }
  
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    // Handle existing sessions after successful authentication
    if (data.user) {
      await this.handleExistingSessions(data.user.id);
      await this.createSessionRecord(data.user.id);
    }
    
    return data
  }
  
  static async signOut() {
    // Invalidate current session
    if (this.currentSessionId) {
      await this.invalidateSession(this.currentSessionId);
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
  
  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
  
  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }
  
  static onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null)
    })
  }

  // Session Management Methods
  private static async handleExistingSessions(userId: string): Promise<void> {
    try {
      console.log(`Checking for existing sessions for user: ${userId}`);
      
      // Check for active sessions for this user
      const { data: existingSessions, error: sessionError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (sessionError) {
        console.warn('Error checking existing sessions:', sessionError);
        return;
      }

      console.log(`Found ${existingSessions?.length || 0} existing sessions:`, existingSessions);

      if (existingSessions && existingSessions.length > 0) {
        console.log(`Invalidating ${existingSessions.length} existing sessions...`);
        await this.forceLogoutOtherSessions(existingSessions);
      } else {
        console.log('No existing sessions found');
      }
    } catch (error) {
      console.warn('Error checking existing sessions:', error);
      // Don't throw - we can continue with login even if session check fails
    }
  }

  private static async forceLogoutOtherSessions(sessions: any[]): Promise<void> {
    try {
      console.log(`Force logout: Invalidating ${sessions.length} sessions:`, sessions.map(s => ({ id: s.id, user_id: s.user_id })));
      
      // Invalidate other sessions
      for (const session of sessions) {
        console.log(`Invalidating session ${session.id} for user ${session.user_id}`);
        const { error } = await supabase
          .from('user_sessions')
          .update({ 
            is_active: false, 
            ended_at: new Date().toISOString() 
          })
          .eq('id', session.id);
          
        if (error) {
          console.error(`Failed to invalidate session ${session.id}:`, error);
        } else {
          console.log(`Successfully invalidated session ${session.id}`);
        }
      }
      console.log(`Invalidated ${sessions.length} existing sessions`);
      
      // Trigger real-time notification to other sessions
      await this.notifySessionsInvalidated(sessions);
    } catch (error) {
      console.error('Error invalidating sessions:', error);
    }
  }

  private static async notifySessionsInvalidated(sessions: any[]): Promise<void> {
    try {
      console.log(`Sending broadcast notification for ${sessions.length} invalidated sessions`);
      
      // Send a real-time notification to force logout other sessions
      const { error } = await supabase
        .channel('session-updates')
        .send({
          type: 'broadcast',
          event: 'sessions-invalidated',
          payload: { 
            invalidatedSessions: sessions.map(s => s.id),
            timestamp: new Date().toISOString()
          }
        });
        
      if (error) {
        console.error('Failed to send broadcast notification:', error);
      } else {
        console.log('Broadcast notification sent successfully');
      }
    } catch (error) {
      console.warn('Failed to notify sessions of invalidation:', error);
    }
  }

  private static async createSessionRecord(userId: string): Promise<void> {
    try {
      const sessionId = crypto.randomUUID();
      this.currentSessionId = sessionId;
      
      const sessionToken = crypto.randomUUID();
      
      await supabase
        .from('user_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          session_token: sessionToken,
          is_active: true,
          started_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ip_address: null // We can't get IP from client side
        });
      
      console.log('Session record created:', sessionId);
    } catch (error) {
      console.error('Error creating session record:', error);
    }
  }

  private static async invalidateSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq('id', sessionId);
      
      this.currentSessionId = null;
      console.log('Session invalidated:', sessionId);
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  static async validateCurrentSession(): Promise<boolean> {
    try {
      if (!this.currentSessionId) {
        console.log('No current session ID, validation failed');
        return false;
      }

      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('is_active')
        .eq('id', this.currentSessionId)
        .single();

      if (error) {
        console.error('Session validation error:', error);
        return false;
      }

      const isValid = session?.is_active === true;
      console.log('Session validation result:', { sessionId: this.currentSessionId, isValid });
      return isValid;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  static async updateLastActivity(): Promise<void> {
    try {
      if (!this.currentSessionId) return;

      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', this.currentSessionId);
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  static getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase.rpc('cleanup_expired_sessions');
      console.log('Session cleanup completed');
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }

  static async initializeSessionManagement(): Promise<void> {
    try {
      // Clean up expired sessions on app start
      await this.cleanupExpiredSessions();
      
      // Set up periodic cleanup (every hour)
      setInterval(() => {
        this.cleanupExpiredSessions();
      }, 60 * 60 * 1000);
      
      console.log('Session management initialized');
    } catch (error) {
      console.error('Error initializing session management:', error);
    }
  }
}




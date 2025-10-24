import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    'Please check your .env file and ensure all required variables are set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          last_accessed_at: string
          is_deleted: boolean
          deleted_at: string | null
          version: number
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      project_data: {
        Row: {
          id: string
          project_id: string
          pages: any
          shots: any
          shot_order: string[] | null
          project_settings: any
          ui_settings: any
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_data']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['project_data']['Insert']>
      }
      project_images: {
        Row: {
          id: string
          project_id: string
          shot_id: string
          storage_path: string
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_images']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['project_images']['Insert']>
      }
    }
  }
}

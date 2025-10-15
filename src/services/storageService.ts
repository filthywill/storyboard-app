import { supabase } from '@/lib/supabase'

export class StorageService {
  private static bucketName = 'project-images'
  
  static async uploadImage(
    projectId: string,
    shotId: string,
    file: File
  ): Promise<string> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('Not authenticated')
    
    // Create unique file path: userId/projectId/shotId-timestamp.ext
    const fileExt = file.name.split('.').pop()
    const fileName = `${shotId}-${Date.now()}.${fileExt}`
    const filePath = `${user.data.user.id}/${projectId}/${fileName}`
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath)
    
    // Storage upload successful
    
    // Track in database - use upsert to handle potential duplicates
    const { error: dbError } = await supabase.from('project_images').upsert({
      project_id: projectId,
      shot_id: shotId,
      storage_path: filePath,
      file_size: file.size,
      mime_type: file.type
    }, {
      onConflict: 'project_id,shot_id'
    })
    
    if (dbError) {
      console.error('Failed to track image in database:', dbError)
      throw dbError
    }
    
    // Database tracking successful
    return publicUrl
  }
  
  static async deleteImage(storagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([storagePath])
    
    if (error) throw error
    
    // Remove from tracking table
    await supabase
      .from('project_images')
      .delete()
      .eq('storage_path', storagePath)
  }
  
  static async deleteProjectImages(projectId: string): Promise<void> {
    // Get all images for project
    const { data: images } = await supabase
      .from('project_images')
      .select('storage_path')
      .eq('project_id', projectId)
    
    if (!images || images.length === 0) return
    
    // Delete from storage
    const paths = images.map(img => img.storage_path)
    await supabase.storage
      .from(this.bucketName)
      .remove(paths)
    
    // Delete from tracking table
    await supabase
      .from('project_images')
      .delete()
      .eq('project_id', projectId)
  }
  
  static async getUserStorageUsage(): Promise<{ used: number; limit: number }> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) return { used: 0, limit: 10 * 1024 * 1024 } // 10MB limit
    
    // Get all images for user
    const { data: images } = await supabase
      .from('project_images')
      .select('file_size')
      .eq('project_id', supabase.from('projects').select('id').eq('user_id', user.data.user.id))
    
    const used = images?.reduce((total, img) => total + (img.file_size || 0), 0) || 0
    const limit = 10 * 1024 * 1024 // 10MB
    
    return { used, limit }
  }
}




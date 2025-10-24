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
    
    // Check if there's an existing image for this shot and clean it up
    const { data: existingImage } = await supabase
      .from('project_images')
      .select('storage_path')
      .eq('project_id', projectId)
      .eq('shot_id', shotId)
      .single()
    
    // Create unique file path: userId/projectId/shotId-timestamp.ext
    const fileExt = file.name.split('.').pop()
    const fileName = `${shotId}-${Date.now()}.${fileExt}`
    const filePath = `${user.data.user.id}/${projectId}/${fileName}`
    
    // Upload new file
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
    
    // Update database tracking (upsert will replace existing record)
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
    
    // Clean up old image file from storage (if it existed)
    if (existingImage?.storage_path && existingImage.storage_path !== filePath) {
      console.log(`Cleaning up old image: ${existingImage.storage_path}`)
      try {
        await supabase.storage
          .from(this.bucketName)
          .remove([existingImage.storage_path])
        console.log(`✅ Old image cleaned up successfully`)
      } catch (cleanupError) {
        // Don't fail the upload if cleanup fails, just log it
        console.warn('Failed to cleanup old image:', cleanupError)
      }
    }
    
    // Database tracking successful
    return publicUrl
  }

  /**
   * Upload project logo to cloud storage
   */
  static async uploadProjectLogo(
    projectId: string,
    file: File
  ): Promise<string> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('Not authenticated')
    
    // Check if there's an existing logo for this project and clean it up
    const { data: existingLogo } = await supabase
      .from('project_images')
      .select('storage_path')
      .eq('project_id', projectId)
      .eq('shot_id', 'project-logo')
      .single()
    
    // Create unique file path: userId/projectId/project-logo-timestamp.ext
    const fileExt = file.name.split('.').pop()
    const fileName = `project-logo-${Date.now()}.${fileExt}`
    const filePath = `${user.data.user.id}/${projectId}/${fileName}`
    
    // Upload new file
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
    
    // Update database tracking (upsert will replace existing record)
    const { error: dbError } = await supabase.from('project_images').upsert({
      project_id: projectId,
      shot_id: 'project-logo', // Special shot_id for project logo
      storage_path: filePath,
      file_size: file.size,
      mime_type: file.type
    }, {
      onConflict: 'project_id,shot_id'
    })
    
    if (dbError) {
      console.error('Failed to track project logo in database:', dbError)
      throw dbError
    }
    
    // Clean up old logo file from storage (if it existed)
    if (existingLogo?.storage_path && existingLogo.storage_path !== filePath) {
      console.log(`Cleaning up old project logo: ${existingLogo.storage_path}`)
      try {
        await supabase.storage
          .from(this.bucketName)
          .remove([existingLogo.storage_path])
        console.log(`✅ Old project logo cleaned up successfully`)
      } catch (cleanupError) {
        // Don't fail the upload if cleanup fails, just log it
        console.warn('Failed to cleanup old project logo:', cleanupError)
      }
    }
    
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
  
  /**
   * Delete a shot's image from both storage and database tracking
   * This is the primary method to use when cleaning up shot images
   */
  static async deleteShotImage(
    projectId: string,
    shotId: string,
    imageUrl?: string
  ): Promise<void> {
    try {
      // First, get the storage path from the database
      const { data: imageRecord, error: fetchError } = await supabase
        .from('project_images')
        .select('storage_path')
        .eq('project_id', projectId)
        .eq('shot_id', shotId)
        .single()
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching image record:', fetchError)
        throw fetchError
      }
      
      // If we found a record, delete the file from storage
      if (imageRecord?.storage_path) {
        console.log(`Deleting image from storage: ${imageRecord.storage_path}`)
        await this.deleteImage(imageRecord.storage_path)
      } else if (imageUrl) {
        // Fallback: try to extract storage path from URL
        console.log('No database record found, attempting to extract path from URL')
        const pathMatch = imageUrl.match(/project-images\/(.+)$/)
        if (pathMatch) {
          const storagePath = pathMatch[1]
          console.log(`Deleting image from storage (via URL): ${storagePath}`)
          await this.deleteImage(storagePath)
        }
      }
      
      // Delete the database tracking record
      const { error: deleteError } = await supabase
        .from('project_images')
        .delete()
        .eq('project_id', projectId)
        .eq('shot_id', shotId)
      
      if (deleteError) {
        console.error('Error deleting image record from database:', deleteError)
        throw deleteError
      }
      
      console.log(`✅ Successfully deleted image for shot ${shotId}`)
    } catch (error) {
      console.error(`Failed to delete image for shot ${shotId}:`, error)
      throw error
    }
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

  /**
   * Download an image from cloud storage by URL
   */
  static async downloadImage(imageUrl: string): Promise<Blob> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Failed to download image:', error);
      throw error;
    }
  }

  /**
   * Get project logo information from database
   */
  static async getProjectLogo(projectId: string): Promise<string | null> {
    try {
      const { data: existingLogo } = await supabase
        .from('project_images')
        .select('storage_path')
        .eq('project_id', projectId)
        .eq('shot_id', 'project-logo')
        .single()
      
      return existingLogo?.storage_path || null;
    } catch (error) {
      console.error(`Failed to get project logo for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Delete project logo from cloud storage and database
   */
  static async deleteProjectLogo(projectId: string): Promise<void> {
    try {
      // Get the existing logo record
      const { data: existingLogo } = await supabase
        .from('project_images')
        .select('storage_path')
        .eq('project_id', projectId)
        .eq('shot_id', 'project-logo')
        .single()
      
      if (existingLogo?.storage_path) {
        // Delete from storage
        await supabase.storage
          .from(this.bucketName)
          .remove([existingLogo.storage_path])
        
        // Delete from database
        await supabase
          .from('project_images')
          .delete()
          .eq('project_id', projectId)
          .eq('shot_id', 'project-logo')
        
        console.log(`✅ Successfully deleted project logo for project ${projectId}`);
      }
    } catch (error) {
      console.error(`Failed to delete project logo for project ${projectId}:`, error);
      throw error;
    }
  }
}




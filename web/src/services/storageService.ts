import { supabase } from '../lib/supabase';

export class StorageService {
  /**
   * Upload a file to Supabase storage
   * @param bucket - The storage bucket name (e.g., 'course-videos', 'course-thumbnails')
   * @param file - The file to upload
   * @param path - Optional path within the bucket (e.g., 'courses/123/')
   * @returns The public URL of the uploaded file
   */
  static async uploadFile(
    bucket: string,
    file: File,
    path: string = ''
  ): Promise<{ url: string; error: string | null }> {
    try {
      // Generate unique filename with timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return { url: '', error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return { url: urlData.publicUrl, error: null };
    } catch (error: any) {
      console.error('Upload error:', error);
      return { url: '', error: error.message };
    }
  }

  /**
   * Upload video file
   */
  static async uploadVideo(file: File, courseId?: string): Promise<{ url: string; error: string | null }> {
    const path = courseId ? `courses/${courseId}/` : '';
    return this.uploadFile('course-videos', file, path);
  }

  /**
   * Upload thumbnail/image file
   */
  static async uploadThumbnail(file: File, courseId?: string): Promise<{ url: string; error: string | null }> {
    const path = courseId ? `courses/${courseId}/` : '';
    return this.uploadFile('course-thumbnails', file, path);
  }

  /**
   * Upload PDF document file
   */
  static async uploadPDF(file: File, courseId?: string): Promise<{ url: string; error: string | null }> {
    const path = courseId ? `courses/${courseId}/` : '';
    return this.uploadFile('course-pdf', file, path);
  }

  /**
   * Delete a file from storage
   * @param bucket - The storage bucket name
   * @param filePath - The path of the file to delete
   */
  static async deleteFile(bucket: string, filePath: string): Promise<{ error: string | null }> {
    try {
      // Extract the file path from URL if full URL is provided
      let path = filePath;
      if (filePath.includes('supabase.co')) {
        const urlParts = filePath.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          path = urlParts[1].split('/').slice(1).join('/');
        }
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Storage delete error:', error);
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Delete error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get signed URL for private file (if bucket is private)
   * @param bucket - The storage bucket name
   * @param filePath - The path of the file
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   */
  static async getSignedUrl(
    bucket: string,
    filePath: string,
    expiresIn: number = 3600
  ): Promise<{ url: string; error: string | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Signed URL error:', error);
        return { url: '', error: error.message };
      }

      return { url: data.signedUrl, error: null };
    } catch (error: any) {
      console.error('Signed URL error:', error);
      return { url: '', error: error.message };
    }
  }
}

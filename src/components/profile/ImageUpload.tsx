
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface ImageUploadProps {
  type: 'header' | 'footer' | 'signature' | 'company_logo'
  currentImageUrl?: string
  onImageUploaded: (url: string) => void
}

export default function ImageUpload({ type, currentImageUrl, onImageUploaded }: ImageUploadProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)

  // Update preview when currentImageUrl changes
  useEffect(() => {
    setPreview(currentImageUrl || null)
  }, [currentImageUrl])

  const getTitle = () => {
    switch (type) {
      case 'header': return 'Header Image'
      case 'footer': return 'Footer Image'
      case 'signature': return 'Signature Image'
      case 'company_logo': return 'Company Logo'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'header': return 'Upload your company header/logo (recommended: 800x200px)'
      case 'footer': return 'Upload your company footer image (recommended: 800x100px)'
      case 'signature': return 'Upload your signature image (recommended: 300x100px)'
      case 'company_logo': return 'Upload your company logo (recommended: 200x200px)'
    }
  }

  const uploadImage = async (file: File) => {
    if (!user) return

    setUploading(true)
    try {
      // Create file path with user ID
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${type}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('user-images')
        .getPublicUrl(fileName)

      const imageUrl = data.publicUrl

      // Update user profile
      const updateField = `${type}_image_url`
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: imageUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPreview(imageUrl)
      onImageUploaded(imageUrl)

      toast({
        title: 'Image uploaded',
        description: `${getTitle()} has been uploaded successfully.`,
      })
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async () => {
    if (!user) return

    try {
      // Update profile to remove image URL
      const updateField = `${type}_image_url`
      const { error } = await supabase
        .from('profiles')
        .update({ [updateField]: null })
        .eq('id', user.id)

      if (error) throw error

      setPreview(null)
      onImageUploaded('')

      toast({
        title: 'Image removed',
        description: `${getTitle()} has been removed.`,
      })
    } catch (error: any) {
      toast({
        title: 'Remove failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 2MB.',
          variant: 'destructive',
        })
        return
      }

      uploadImage(file)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          {getTitle()}
        </CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <img
                src={preview}
                alt={`${type} preview`}
                className="max-w-full max-h-32 object-contain mx-auto"
              />
            </div>
            <div className="flex gap-2">
              <Label htmlFor={`${type}-upload`} className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Replace
                  </span>
                </Button>
              </Label>
              <Button variant="destructive" size="sm" onClick={removeImage}>
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Label htmlFor={`${type}-upload`} className="cursor-pointer">
              <Button variant="outline" disabled={uploading} asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </span>
              </Button>
            </Label>
          </div>
        )}
        
        <Input
          id={`${type}-upload`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}

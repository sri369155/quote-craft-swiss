
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface ImageUploadProps {
  type: 'header' | 'footer' | 'signature' | 'company_logo'
  currentImageUrl?: string
  onImageUploaded: (url: string) => void
  onImageSaved?: () => void // Callback to refresh custom images list
}

export default function ImageUpload({ type, currentImageUrl, onImageUploaded, onImageSaved }: ImageUploadProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [imageName, setImageName] = useState('')

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

  const checkDuplicateName = async (name: string): Promise<boolean> => {
    if (!user) return false
    
    const { data, error } = await supabase
      .from('custom_images')
      .select('id')
      .eq('user_id', user.id)
      .eq('image_type', type === 'company_logo' ? 'header' : type)
      .eq('image_name', name)
      .maybeSingle()
    
    return !error && data !== null
  }

  const uploadImage = async (file: File, customName?: string) => {
    if (!user) return

    setUploading(true)
    try {
      // Generate unique filename for storage
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const storageFileName = `${user.id}/${type}_${timestamp}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(storageFileName, file, { upsert: false })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('user-images')
        .getPublicUrl(storageFileName)

      const imageUrl = data.publicUrl

      // Update user profile (set as default)
      const updateField = `${type}_image_url`
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: imageUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Save to custom_images table if it's not company_logo and has a custom name
      if (type !== 'company_logo' && customName) {
        const { error: insertError } = await supabase
          .from('custom_images')
          .insert({
            user_id: user.id,
            image_type: type,
            image_url: imageUrl,
            image_name: customName,
            is_default: false
          })

        if (insertError) throw insertError
        
        // Notify parent to refresh the list
        if (onImageSaved) {
          onImageSaved()
        }
      }

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
      setPendingFile(null)
      setImageName('')
      setShowNameDialog(false)
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // For company_logo, upload directly without saving to custom_images
      if (type === 'company_logo') {
        await uploadImage(file)
      } else {
        // For other types, ask for a name to save in database
        setPendingFile(file)
        const defaultName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        setImageName(defaultName)
        setShowNameDialog(true)
      }
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleSaveWithName = async () => {
    if (!pendingFile || !imageName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this image.',
        variant: 'destructive',
      })
      return
    }

    // Check for duplicate name
    const isDuplicate = await checkDuplicateName(imageName.trim())
    if (isDuplicate) {
      toast({
        title: 'Duplicate name',
        description: 'An image with this name already exists. Please use a different name.',
        variant: 'destructive',
      })
      return
    }

    await uploadImage(pendingFile, imageName.trim())
  }

  return (
    <>
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

      {/* Name Dialog for saving to database */}
      <AlertDialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Image to Library</AlertDialogTitle>
            <AlertDialogDescription>
              Give this image a unique name to save it to your library for future use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="image-name">Image Name</Label>
            <Input
              id="image-name"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="Enter a unique name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveWithName()
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingFile(null)
              setImageName('')
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveWithName} disabled={!imageName.trim()}>
              Save Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

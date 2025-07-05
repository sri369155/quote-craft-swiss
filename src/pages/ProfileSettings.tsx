
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Save } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import ImageUpload from '@/components/profile/ImageUpload'
import { Profile } from '@/types/database'

export default function ProfileSettings() {
  const { user, profile, updateProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    header_image_url: '',
    footer_image_url: '',
    signature_image_url: '',
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company_name: profile.company_name || '',
        header_image_url: profile.header_image_url || '',
        footer_image_url: profile.footer_image_url || '',
        signature_image_url: profile.signature_image_url || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateProfile({
        full_name: formData.full_name,
        company_name: formData.company_name,
      })

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUploaded = (type: string, url: string) => {
    setFormData(prev => ({
      ...prev,
      [`${type}_image_url`]: url
    }))
  }

  return (
    <div className="min-h-screen bg-green-50">
      <header className="sticky top-0 z-50 bg-green-100/80 backdrop-blur-md border-b border-border">
        <div className="container-app">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg tracking-tight">Profile Settings</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your personal and company information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Your company name"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={loading} className="btn-primary">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* PDF Customization Images */}
          <Card>
            <CardHeader>
              <CardTitle>PDF Customization</CardTitle>
              <CardDescription>
                Upload custom images for your quotation PDFs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ImageUpload
                  type="header"
                  currentImageUrl={formData.header_image_url}
                  onImageUploaded={(url) => handleImageUploaded('header', url)}
                />
                <ImageUpload
                  type="footer"
                  currentImageUrl={formData.footer_image_url}
                  onImageUploaded={(url) => handleImageUploaded('footer', url)}
                />
                <ImageUpload
                  type="signature"
                  currentImageUrl={formData.signature_image_url}
                  onImageUploaded={(url) => handleImageUploaded('signature', url)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Save, ArrowLeft } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import ImageUpload from '@/components/profile/ImageUpload'
import { Profile } from '@/types/database'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    company_slogan: '',
    gst_number: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_logo_url: '',
    header_image_url: '',
    footer_image_url: '',
    signature_image_url: '',
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company_name: profile.company_name || '',
        company_slogan: profile.company_slogan || '',
        gst_number: profile.gst_number || '',
        company_address: profile.company_address || '',
        company_phone: profile.company_phone || '',
        company_email: profile.company_email || '',
        company_logo_url: profile.company_logo_url || '',
        header_image_url: profile.header_image_url || '',
        footer_image_url: profile.footer_image_url || '',
        signature_image_url: profile.signature_image_url || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
          company_slogan: formData.company_slogan,
          gst_number: formData.gst_number,
          company_address: formData.company_address,
          company_phone: formData.company_phone,
          company_email: formData.company_email,
          company_logo_url: formData.company_logo_url,
          header_image_url: formData.header_image_url,
          footer_image_url: formData.footer_image_url,
          signature_image_url: formData.signature_image_url,
        })
        .eq('id', user?.id)

      if (error) throw error

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
          <div className="flex items-center justify-between h-16 bg-primary px-4 rounded-lg -mx-4">
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg tracking-tight">Profile Settings</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Information */}
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="text-white">Company Details</CardTitle>
              <CardDescription className="text-white/80">
                Update your company information for PDF headers and footers
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
                <div className="space-y-2">
                  <Label htmlFor="company_slogan">Company Slogan</Label>
                  <Input
                    id="company_slogan"
                    value={formData.company_slogan}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_slogan: e.target.value }))}
                    placeholder="Your company slogan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_number: e.target.value }))}
                    placeholder="GST Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_phone">Company Phone</Label>
                  <Input
                    id="company_phone"
                    value={formData.company_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_phone: e.target.value }))}
                    placeholder="Company phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_email">Company Email</Label>
                  <Input
                    id="company_email"
                    value={formData.company_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
                    placeholder="Company email address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_address">Company Address</Label>
                <Input
                  id="company_address"
                  value={formData.company_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
                  placeholder="Complete company address"
                />
              </div>
              <Button onClick={handleSave} disabled={loading} className="btn-primary">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* PDF Customization Images */}
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="text-white">PDF Customization</CardTitle>
              <CardDescription className="text-white/80">
                Upload custom images for your quotation PDFs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <ImageUpload
                  type="company_logo"
                  currentImageUrl={formData.company_logo_url}
                  onImageUploaded={(url) => handleImageUploaded('company_logo', url)}
                />
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

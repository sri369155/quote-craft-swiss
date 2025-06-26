
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types/database'

interface CustomerFormProps {
  onCustomerAdded: (customer: Customer) => void
}

export default function CustomerForm({ onCustomerAdded }: CustomerFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer name is required.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: user!.id,
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Customer added',
        description: `${data.name} has been added successfully.`,
      })

      onCustomerAdded(data)
    } catch (error: any) {
      toast({
        title: 'Error adding customer',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-name">Name *</Label>
        <Input
          id="customer-name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Customer name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-email">Email</Label>
        <Input
          id="customer-email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="customer@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-phone">Phone</Label>
        <Input
          id="customer-phone"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+91 98765 43210"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-address">Address</Label>
        <Textarea
          id="customer-address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Customer address"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Adding...' : 'Add Customer'}
        </Button>
      </div>
    </form>
  )
}

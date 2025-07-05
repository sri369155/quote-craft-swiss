import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Users, TrendingUp, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Quotation } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalQuotations: 0,
    draftQuotations: 0,
    acceptedQuotations: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    if (user) {
      loadQuotations()
    }
  }, [user])

  const loadQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setQuotations((data as Quotation[]) || [])
      
      // Calculate stats
      const total = data?.length || 0
      const drafts = data?.filter(q => q.status === 'draft').length || 0
      const accepted = data?.filter(q => q.status === 'accepted').length || 0
      const revenue = data?.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total_amount, 0) || 0

      setStats({
        totalQuotations: total,
        draftQuotations: drafts,
        acceptedQuotations: accepted,
        totalRevenue: revenue,
      })
    } catch (error: any) {
      toast({
        title: 'Error loading quotations',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out.',
      })
    } catch (error: any) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-orange-600 bg-orange-50'
      case 'sent': return 'text-blue-600 bg-blue-50'
      case 'accepted': return 'text-green-600 bg-green-50'
      case 'rejected': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-green-100/80 backdrop-blur-md border-b border-border">
        <div className="container-app">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg tracking-tight">InvoiceGen</span>
              </div>
              
              <nav className="hidden md:flex items-center space-x-1">
                <Button variant="ghost" className="h-9 px-4 text-sm font-medium" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button variant="ghost" className="h-9 px-4 text-sm font-medium" onClick={() => navigate('/quotations')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Quotations
                </Button>
                <Button variant="ghost" className="h-9 px-4 text-sm font-medium" onClick={() => navigate('/customers')}>
                  <Users className="w-4 h-4 mr-2" />
                  Customers
                </Button>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.full_name || user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuotations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Quotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draftQuotations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.acceptedQuotations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/quotations')}>
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Create Quotation</h3>
              <p className="text-sm text-muted-foreground">Generate professional quotations for your clients</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/customers')}>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Manage Customers</h3>
              <p className="text-sm text-muted-foreground">Add and organize your customer information</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">View Reports</h3>
              <p className="text-sm text-muted-foreground">Analyze your quotation performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quotations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Quotations</CardTitle>
                <CardDescription>
                  Your latest quotations and their status
                </CardDescription>
              </div>
              <Button className="btn-primary" onClick={() => navigate('/quotations')}>
                <Plus className="w-4 h-4 mr-2" />
                New Quotation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quotations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No quotations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first quotation to get started
                </p>
                <Button className="btn-primary" onClick={() => navigate('/quotations')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quotation
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Number</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Title</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.slice(0, 5).map((quotation) => (
                      <tr key={quotation.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/quotations')}>
                        <td className="py-3 px-2 font-mono text-sm">{quotation.quotation_number}</td>
                        <td className="py-3 px-2 font-medium">{quotation.title}</td>
                        <td className="py-3 px-2">{formatCurrency(quotation.total_amount)}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                            {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(quotation.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {quotations.length > 5 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" onClick={() => navigate('/quotations')}>
                      View All Quotations
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

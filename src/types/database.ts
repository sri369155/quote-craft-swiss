
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          updated_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          quotation_number: string
          title: string
          description: string | null
          status: 'draft' | 'sent' | 'accepted' | 'rejected'
          subtotal: number
          tax_rate: number
          tax_amount: number
          total_amount: number
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          quotation_number: string
          title: string
          description?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          subtotal: number
          tax_rate: number
          tax_amount: number
          total_amount: number
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          quotation_number?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total_amount?: number
          valid_until?: string | null
          updated_at?: string
        }
      }
      quotation_items: {
        Row: {
          id: string
          quotation_id: string
          description: string
          quantity: number
          unit_price: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          quotation_id: string
          description: string
          quantity: number
          unit_price: number
          line_total: number
          created_at?: string
        }
        Update: {
          id?: string
          quotation_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          line_total?: number
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Quotation = Database['public']['Tables']['quotations']['Row']
export type QuotationItem = Database['public']['Tables']['quotation_items']['Row']

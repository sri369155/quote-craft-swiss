export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          hsn_code: string | null
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          hsn_code?: string | null
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          hsn_code?: string | null
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          consignee_address: string | null
          consignee_email: string | null
          consignee_gstin: string | null
          consignee_name: string | null
          consignee_phone: string | null
          created_at: string | null
          customer_id: string
          delivery_date: string | null
          delivery_number: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          order_date: string | null
          order_number: string | null
          status: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          title: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consignee_address?: string | null
          consignee_email?: string | null
          consignee_gstin?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          created_at?: string | null
          customer_id: string
          delivery_date?: string | null
          delivery_number?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          order_date?: string | null
          order_number?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title: string
          total_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consignee_address?: string | null
          consignee_email?: string | null
          consignee_gstin?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_date?: string | null
          delivery_number?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          order_date?: string | null
          order_number?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bank_account_number: string | null
          bank_account_type: string | null
          bank_branch: string | null
          bank_ifsc_code: string | null
          bank_name: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_phone: string | null
          company_slogan: string | null
          created_at: string | null
          email: string
          footer_image_url: string | null
          full_name: string | null
          gst_number: string | null
          header_image_url: string | null
          id: string
          signature_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_branch?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_slogan?: string | null
          created_at?: string | null
          email: string
          footer_image_url?: string | null
          full_name?: string | null
          gst_number?: string | null
          header_image_url?: string | null
          id: string
          signature_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_branch?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_slogan?: string | null
          created_at?: string | null
          email?: string
          footer_image_url?: string | null
          full_name?: string | null
          gst_number?: string | null
          header_image_url?: string | null
          id?: string
          signature_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string | null
          description: string
          hsn_code: string | null
          id: string
          line_total: number
          quantity: number
          quotation_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          hsn_code?: string | null
          id?: string
          line_total?: number
          quantity?: number
          quotation_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          hsn_code?: string | null
          id?: string
          line_total?: number
          quantity?: number
          quotation_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          quotation_number: string
          status: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          title: string
          total_amount: number
          updated_at: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          quotation_number: string
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title: string
          total_amount?: number
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          quotation_number?: string
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

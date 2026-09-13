export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          language: string
          latitude: number | null
          location: string | null
          location_sharing_enabled: boolean
          location_updated_at: string | null
          longitude: number | null
          name: string
          phone: string | null
          postal_code: string | null
          role: string
          state: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          language?: string
          latitude?: number | null
          location?: string | null
          location_sharing_enabled?: boolean
          location_updated_at?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          postal_code?: string | null
          role?: string
          state?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          language?: string
          latitude?: number | null
          location?: string | null
          location_sharing_enabled?: boolean
          location_updated_at?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          role?: string
          state?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      recycler_offers: {
        Row: {
          created_at: string
          id: string
          message: string | null
          pickup_date: string | null
          price_per_kg: number
          recycler_id: string
          status: string
          total_price: number
          updated_at: string
          waste_listing_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          pickup_date?: string | null
          price_per_kg: number
          recycler_id: string
          status?: string
          total_price: number
          updated_at?: string
          waste_listing_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          pickup_date?: string | null
          price_per_kg?: number
          recycler_id?: string
          status?: string
          total_price?: number
          updated_at?: string
          waste_listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recycler_offers_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recyclers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recycler_offers_waste_listing_id_fkey"
            columns: ["waste_listing_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recyclers: {
        Row: {
          address: string | null
          business_hours: string | null
          city: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          location: string | null
          location_sharing_enabled: boolean
          location_updated_at: string | null
          longitude: number | null
          materials: string[]
          name: string
          operating_area: string | null
          postal_code: string | null
          rate_per_kg: number | null
          registration_number: string | null
          state: string | null
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_note: string | null
          verification_status: string
          verified: boolean
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          location_sharing_enabled?: boolean
          location_updated_at?: string | null
          longitude?: number | null
          materials?: string[]
          name: string
          operating_area?: string | null
          postal_code?: string | null
          rate_per_kg?: number | null
          registration_number?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_note?: string | null
          verification_status?: string
          verified?: boolean
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          location_sharing_enabled?: boolean
          location_updated_at?: string | null
          longitude?: number | null
          materials?: string[]
          name?: string
          operating_area?: string | null
          postal_code?: string | null
          rate_per_kg?: number | null
          registration_number?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_note?: string | null
          verification_status?: string
          verified?: boolean
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agreed_price_per_kg: number | null
          asking_price: number | null
          category: string
          collector_id: string
          completed_at: string | null
          condition: string
          created_at: string
          final_price: number | null
          final_weight_kg: number | null
          handover_at: string | null
          handover_code: string | null
          handover_notes: string | null
          handover_photo_url: string | null
          id: string
          indicative_price: number | null
          latitude: number | null
          listing_code: string
          longitude: number | null
          notes: string | null
          otp_verified: boolean
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          photo_url: string | null
          pickup_address: string | null
          pickup_date: string | null
          quantity_note: string | null
          receipt_number: string
          recycler_confirmed_at: string | null
          recycler_id: string | null
          selected_offer_id: string | null
          status: string
          updated_at: string
          weight_kg: number
        }
        Insert: {
          agreed_price_per_kg?: number | null
          asking_price?: number | null
          category: string
          collector_id: string
          completed_at?: string | null
          condition: string
          created_at?: string
          final_price?: number | null
          final_weight_kg?: number | null
          handover_at?: string | null
          handover_code?: string | null
          handover_notes?: string | null
          handover_photo_url?: string | null
          id?: string
          indicative_price?: number | null
          latitude?: number | null
          listing_code?: string
          longitude?: number | null
          notes?: string | null
          otp_verified?: boolean
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          photo_url?: string | null
          pickup_address?: string | null
          pickup_date?: string | null
          quantity_note?: string | null
          receipt_number?: string
          recycler_confirmed_at?: string | null
          recycler_id?: string | null
          selected_offer_id?: string | null
          status?: string
          updated_at?: string
          weight_kg: number
        }
        Update: {
          agreed_price_per_kg?: number | null
          asking_price?: number | null
          category?: string
          collector_id?: string
          completed_at?: string | null
          condition?: string
          created_at?: string
          final_price?: number | null
          final_weight_kg?: number | null
          handover_at?: string | null
          handover_code?: string | null
          handover_notes?: string | null
          handover_photo_url?: string | null
          id?: string
          indicative_price?: number | null
          latitude?: number | null
          listing_code?: string
          longitude?: number | null
          notes?: string | null
          otp_verified?: boolean
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          photo_url?: string | null
          pickup_address?: string | null
          pickup_date?: string | null
          quantity_note?: string | null
          receipt_number?: string
          recycler_confirmed_at?: string | null
          recycler_id?: string | null
          selected_offer_id?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recyclers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

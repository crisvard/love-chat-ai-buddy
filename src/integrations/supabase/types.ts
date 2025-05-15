export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          gender: string
          id: string
          image: string
          name: string
        }
        Insert: {
          gender: string
          id?: string
          image: string
          name: string
        }
        Update: {
          gender?: string
          id?: string
          image?: string
          name?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          created_at: string
          description: string | null
          gender: string
          id: string
          image: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gender?: string
          id?: string
          image: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gender?: string
          id?: string
          image?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          is_active: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          description: string | null
          display_order: number | null
          duration: string
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          description?: string | null
          display_order?: number | null
          duration: string
          features?: Json
          id: string
          is_active?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          description?: string | null
          display_order?: number | null
          duration?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string
          created_at: string
          email: string
          id: string
          is_adult: boolean
          name: string
          stripe_customer_id: string | null
          terms_accepted: boolean
        }
        Insert: {
          country: string
          created_at?: string
          email: string
          id: string
          is_adult?: boolean
          name: string
          stripe_customer_id?: string | null
          terms_accepted?: boolean
        }
        Update: {
          country?: string
          created_at?: string
          email?: string
          id?: string
          is_adult?: boolean
          name?: string
          stripe_customer_id?: string | null
          terms_accepted?: boolean
        }
        Relationships: []
      }
      user_agent_selections: {
        Row: {
          agent_avatar: string | null
          agent_id: string
          created_at: string
          id: string
          nickname: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_avatar?: string | null
          agent_id: string
          created_at?: string
          id?: string
          nickname: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_avatar?: string | null
          agent_id?: string
          created_at?: string
          id?: string
          nickname?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agent_selections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchased_gifts: {
        Row: {
          created_at: string
          gift_id: string
          id: string
          price_paid: number
          purchase_date: string
          transaction_details: Json | null
          updated_at: string
          used_in_chat_message_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          gift_id: string
          id?: string
          price_paid?: number
          purchase_date?: string
          transaction_details?: Json | null
          updated_at?: string
          used_in_chat_message_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          gift_id?: string
          id?: string
          price_paid?: number
          purchase_date?: string
          transaction_details?: Json | null
          updated_at?: string
          used_in_chat_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchased_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_selected_agent: {
        Row: {
          created_at: string
          custom_avatar_url: string | null
          nickname: string
          selected_agent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_avatar_url?: string | null
          nickname: string
          selected_agent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_avatar_url?: string | null
          nickname?: string
          selected_agent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_selected_agent_selected_agent_id_fkey"
            columns: ["selected_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          end_date: string | null
          id: string
          is_active: boolean
          plan_id: string
          start_date: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          start_date?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          start_date?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

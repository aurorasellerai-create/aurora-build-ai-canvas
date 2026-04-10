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
      conversion_jobs: {
        Row: {
          archived: boolean
          created_at: string
          deletion_scheduled_at: string | null
          download_url: string | null
          error_message: string | null
          id: string
          marked_for_deletion: boolean
          processing_time_ms: number | null
          progress: number
          source_url: string
          status: string
          step_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          deletion_scheduled_at?: string | null
          download_url?: string | null
          error_message?: string | null
          id?: string
          marked_for_deletion?: boolean
          processing_time_ms?: number | null
          progress?: number
          source_url: string
          status?: string
          step_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          deletion_scheduled_at?: string | null
          download_url?: string | null
          error_message?: string | null
          id?: string
          marked_for_deletion?: boolean
          processing_time_ms?: number | null
          progress?: number
          source_url?: string
          status?: string
          step_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount: number
          created_at: string
          credits_amount: number
          currency: string
          id: string
          package_name: string
          provider: string
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_amount: number
          currency?: string
          id?: string
          package_name: string
          provider?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_amount?: number
          currency?: string
          id?: string
          package_name?: string
          provider?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_usage: {
        Row: {
          action: string
          created_at: string
          credits_used: number
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          credits_used?: number
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          credits_used?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          provider: string
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          provider?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          provider?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_credits: number
          avatar_url: string | null
          bonus_builds: number
          created_at: string
          credits_balance: number
          daily_builds_count: number
          display_name: string | null
          id: string
          last_build_date: string
          payment_date: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          referral_code: string | null
          status: string
          subscription_status: string | null
          teste_expira_em: string | null
          tipo_usuario: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits?: number
          avatar_url?: string | null
          bonus_builds?: number
          created_at?: string
          credits_balance?: number
          daily_builds_count?: number
          display_name?: string | null
          id?: string
          last_build_date?: string
          payment_date?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          referral_code?: string | null
          status?: string
          subscription_status?: string | null
          teste_expira_em?: string | null
          tipo_usuario?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits?: number
          avatar_url?: string | null
          bonus_builds?: number
          created_at?: string
          credits_balance?: number
          daily_builds_count?: number
          display_name?: string | null
          id?: string
          last_build_date?: string
          payment_date?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          referral_code?: string | null
          status?: string
          subscription_status?: string | null
          teste_expira_em?: string | null
          tipo_usuario?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          app_name: string
          created_at: string
          download_url: string | null
          error_message: string | null
          format: Database["public"]["Enums"]["app_format"]
          id: string
          progress: number
          site_url: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          app_name: string
          created_at?: string
          download_url?: string | null
          error_message?: string | null
          format?: Database["public"]["Enums"]["app_format"]
          id?: string
          progress?: number
          site_url: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          app_name?: string
          created_at?: string
          download_url?: string | null
          error_message?: string | null
          format?: Database["public"]["Enums"]["app_format"]
          id?: string
          progress?: number
          site_url?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          rewarded: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          rewarded?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          rewarded?: boolean
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          category: string
          created_at: string
          details: Json | null
          id: string
          message: string
          resolution_method: string | null
          resolved: boolean
          severity: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          resolution_method?: string | null
          resolved?: boolean
          severity?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          resolution_method?: string | null
          resolved?: boolean
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      check_and_increment_build: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      consume_credits: {
        Args: { p_action: string; p_amount?: number; p_user_id: string }
        Returns: boolean
      }
      expire_trials: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_referral_rewards: {
        Args: { p_referrer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_format: "apk" | "aab" | "pwa"
      app_role: "admin" | "moderator" | "user" | "founder"
      payment_status: "pending" | "approved" | "refunded" | "cancelled"
      project_status: "pending" | "processing" | "completed" | "error"
      user_plan: "free" | "pro" | "premium"
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
    Enums: {
      app_format: ["apk", "aab", "pwa"],
      app_role: ["admin", "moderator", "user", "founder"],
      payment_status: ["pending", "approved", "refunded", "cancelled"],
      project_status: ["pending", "processing", "completed", "error"],
      user_plan: ["free", "pro", "premium"],
    },
  },
} as const

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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          id: string
          is_active: boolean | null
          service_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          service_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          service_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          embeddings_generated: boolean | null
          file_size: number
          filename: string
          id: string
          mime_type: string
          parsed_content: string | null
          session_id: string | null
          storage_path: string
          type: string
        }
        Insert: {
          created_at?: string
          embeddings_generated?: boolean | null
          file_size: number
          filename: string
          id?: string
          mime_type: string
          parsed_content?: string | null
          session_id?: string | null
          storage_path: string
          type: string
        }
        Update: {
          created_at?: string
          embeddings_generated?: boolean | null
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          parsed_content?: string | null
          session_id?: string | null
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_hash: string
          used: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          used?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          used?: boolean | null
        }
        Relationships: []
      }
      google_vision_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          project_id: string
          service_account_email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id: string
          service_account_email: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          service_account_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          ai_suggestions_count: number | null
          company_name: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          interview_type: string | null
          job_description: string | null
          position_title: string | null
          questions_count: number | null
          resume_id: string | null
          session_type: string
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string | null
          user_satisfaction_rating: number | null
        }
        Insert: {
          ai_suggestions_count?: number | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string | null
          job_description?: string | null
          position_title?: string | null
          questions_count?: number | null
          resume_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          user_satisfaction_rating?: number | null
        }
        Update: {
          ai_suggestions_count?: number | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string | null
          job_description?: string | null
          position_title?: string | null
          questions_count?: number | null
          resume_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          user_satisfaction_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_transcripts: {
        Row: {
          ai_suggestion: string
          confidence_score: number | null
          created_at: string
          id: string
          question_text: string
          session_id: string
          timestamp_in_session: number
          user_feedback: string | null
          user_response: string | null
        }
        Insert: {
          ai_suggestion: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          question_text: string
          session_id: string
          timestamp_in_session: number
          user_feedback?: string | null
          user_response?: string | null
        }
        Update: {
          ai_suggestion?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          question_text?: string
          session_id?: string
          timestamp_in_session?: number
          user_feedback?: string | null
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_learning_enabled: boolean | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          notification_preferences: Json | null
          preferred_interview_duration: number | null
          updated_at: string
        }
        Insert: {
          ai_learning_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          notification_preferences?: Json | null
          preferred_interview_duration?: number | null
          updated_at?: string
        }
        Update: {
          ai_learning_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          notification_preferences?: Json | null
          preferred_interview_duration?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          filename: string
          id: string
          is_default: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          filename: string
          id?: string
          is_default?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          filename?: string
          id?: string
          is_default?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_analytics: {
        Row: {
          ai_usage_rate: number | null
          avg_response_time: number | null
          behavioral_questions: number | null
          company_questions: number | null
          created_at: string
          helpful_suggestions: number | null
          id: string
          session_id: string
          technical_questions: number | null
          total_questions: number
          total_suggestions: number | null
          user_id: string
        }
        Insert: {
          ai_usage_rate?: number | null
          avg_response_time?: number | null
          behavioral_questions?: number | null
          company_questions?: number | null
          created_at?: string
          helpful_suggestions?: number | null
          id?: string
          session_id: string
          technical_questions?: number | null
          total_questions?: number
          total_suggestions?: number | null
          user_id: string
        }
        Update: {
          ai_usage_rate?: number | null
          avg_response_time?: number | null
          behavioral_questions?: number | null
          company_questions?: number | null
          created_at?: string
          helpful_suggestions?: number | null
          id?: string
          session_id?: string
          technical_questions?: number | null
          total_questions?: number
          total_suggestions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_code_attempts: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          session_code: string | null
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address: unknown
          session_code?: string | null
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          session_code?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      session_connections: {
        Row: {
          connection_id: string
          created_at: string
          device_type: string
          id: string
          last_ping: string
          session_id: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string
          device_type: string
          id?: string
          last_ping?: string
          session_id?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string
          device_type?: string
          id?: string
          last_ping?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_connections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          coding_sessions_included: number | null
          coding_sessions_used: number | null
          completed_at: string | null
          created_at: string
          device_mode: string
          duration_minutes: number
          expires_at: string | null
          id: string
          image_captures_included: number | null
          image_captures_used: number | null
          job_role: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_cents: number
          questions_included: number | null
          questions_used: number | null
          session_code: string | null
          session_type: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coding_sessions_included?: number | null
          coding_sessions_used?: number | null
          completed_at?: string | null
          created_at?: string
          device_mode?: string
          duration_minutes: number
          expires_at?: string | null
          id?: string
          image_captures_included?: number | null
          image_captures_used?: number | null
          job_role?: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_cents: number
          questions_included?: number | null
          questions_used?: number | null
          session_code?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coding_sessions_included?: number | null
          coding_sessions_used?: number | null
          completed_at?: string | null
          created_at?: string
          device_mode?: string
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          image_captures_included?: number | null
          image_captures_used?: number | null
          job_role?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_cents?: number
          questions_included?: number | null
          questions_used?: number | null
          session_code?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          created_at: string
          generated_answer: string
          id: string
          question_text: string
          session_id: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          generated_answer: string
          id?: string
          question_text: string
          session_id?: string | null
          timestamp?: string
        }
        Update: {
          created_at?: string
          generated_answer?: string
          id?: string
          question_text?: string
          session_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_session_code_rate_limit: {
        Args: { client_ip: unknown }
        Returns: boolean
      }
      cleanup_expired_otps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_connections: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_session_by_code: {
        Args: { session_code_input: string }
        Returns: {
          device_mode: string
          expires_at: string
          id: string
          session_code: string
          session_type: string
          status: Database["public"]["Enums"]["session_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_session_code_attempt: {
        Args: { client_ip: unknown; code: string; was_successful: boolean }
        Returns: undefined
      }
      start_session: {
        Args: { session_uuid: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      plan_type: "coding-helper" | "quick-session" | "question-analysis"
      session_status:
        | "pending_payment"
        | "pending_assets"
        | "assets_received"
        | "lobby_ready"
        | "in_progress"
        | "completed"
        | "expired"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      plan_type: ["coding-helper", "quick-session", "question-analysis"],
      session_status: [
        "pending_payment",
        "pending_assets",
        "assets_received",
        "lobby_ready",
        "in_progress",
        "completed",
        "expired",
        "cancelled",
      ],
    },
  },
} as const

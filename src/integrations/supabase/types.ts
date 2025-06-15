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
          completed_at: string | null
          created_at: string
          device_mode: string
          duration_minutes: number
          expires_at: string | null
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_cents: number
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          device_mode?: string
          duration_minutes: number
          expires_at?: string | null
          id?: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_cents: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          device_mode?: string
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_cents?: number
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
      cleanup_expired_otps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_connections: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      plan_type: "standard" | "pro" | "elite"
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
    Enums: {
      plan_type: ["standard", "pro", "elite"],
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

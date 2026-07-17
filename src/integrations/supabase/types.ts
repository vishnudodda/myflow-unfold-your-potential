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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model: string
          notes: string | null
          output_schema: Json | null
          slug: string
          system_prompt: string
          user_template: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          notes?: string | null
          output_schema?: Json | null
          slug: string
          system_prompt: string
          user_template: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          notes?: string | null
          output_schema?: Json | null
          slug?: string
          system_prompt?: string
          user_template?: string
          version?: number
        }
        Relationships: []
      }
      ai_results: {
        Row: {
          assessment_id: string | null
          confidence: number | null
          created_at: string
          id: string
          model: string | null
          output: Json
          prompt_slug: string
          prompt_version: number
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          model?: string | null
          output: Json
          prompt_slug: string
          prompt_version: number
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          model?: string | null
          output?: Json
          prompt_slug?: string
          prompt_version?: number
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          tagline: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
        }
        Relationships: []
      }
      assessments: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          estimated_minutes: number | null
          id: string
          is_active: boolean
          prompt_slug: string | null
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean
          prompt_slug?: string | null
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean
          prompt_slug?: string | null
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assessment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      career_matches: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          match_score: number
          reasoning: string | null
          required_skills: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          match_score: number
          reasoning?: string | null
          required_skills?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          match_score?: number
          reasoning?: string | null
          required_skills?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      future_letters: {
        Row: {
          created_at: string
          deliver_at: string
          email: string
          id: string
          letter: string
          name: string | null
          sent_at: string | null
          years: number
        }
        Insert: {
          created_at?: string
          deliver_at: string
          email: string
          id?: string
          letter: string
          name?: string | null
          sent_at?: string | null
          years: number
        }
        Update: {
          created_at?: string
          deliver_at?: string
          email?: string
          id?: string
          letter?: string
          name?: string | null
          sent_at?: string | null
          years?: number
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          age: number | null
          answers: Json
          completed: boolean
          created_at: string
          custom_skill: string | null
          duration_ms: number | null
          education: string | null
          email: string | null
          goal: string | null
          id: string
          interests: string[]
          name: string
          one_liner: string | null
          result: Json | null
          skills: string[]
        }
        Insert: {
          age?: number | null
          answers?: Json
          completed?: boolean
          created_at?: string
          custom_skill?: string | null
          duration_ms?: number | null
          education?: string | null
          email?: string | null
          goal?: string | null
          id?: string
          interests?: string[]
          name: string
          one_liner?: string | null
          result?: Json | null
          skills?: string[]
        }
        Update: {
          age?: number | null
          answers?: Json
          completed?: boolean
          created_at?: string
          custom_skill?: string | null
          duration_ms?: number | null
          education?: string | null
          email?: string | null
          goal?: string | null
          id?: string
          interests?: string[]
          name?: string
          one_liner?: string | null
          result?: Json | null
          skills?: string[]
        }
        Relationships: []
      }
      industry_insights: {
        Row: {
          categories: string[]
          created_at: string
          description: string
          icon: string | null
          id: string
          last_verified: string
          publication_year: number
          sort_weight: number
          source_name: string
          source_url: string
          statistic: string
          title: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          last_verified?: string
          publication_year: number
          sort_weight?: number
          source_name: string
          source_url: string
          statistic: string
          title: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          last_verified?: string
          publication_year?: number
          sort_weight?: number
          source_name?: string
          source_url?: string
          statistic?: string
          title?: string
        }
        Relationships: []
      }
      learning_resources: {
        Row: {
          created_at: string
          creator: string | null
          duration: string | null
          id: string
          kind: string
          reason: string | null
          skill_tag: string | null
          thumbnail_url: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator?: string | null
          duration?: string | null
          id?: string
          kind: string
          reason?: string | null
          skill_tag?: string | null
          thumbnail_url?: string | null
          title: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator?: string | null
          duration?: string | null
          id?: string
          kind?: string
          reason?: string | null
          skill_tag?: string | null
          thumbnail_url?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string | null
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          confidence: string | null
          created_at: string
          deadline: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_remote: boolean | null
          kind: string
          location: string | null
          match_reason: string | null
          organization: string | null
          posted_date: string | null
          required_skills: string[] | null
          stipend: string | null
          title: string
          trust_score: number | null
          url: string | null
          user_id: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_remote?: boolean | null
          kind: string
          location?: string | null
          match_reason?: string | null
          organization?: string | null
          posted_date?: string | null
          required_skills?: string[] | null
          stipend?: string | null
          title: string
          trust_score?: number | null
          url?: string | null
          user_id: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_remote?: boolean | null
          kind?: string
          location?: string | null
          match_reason?: string | null
          organization?: string | null
          posted_date?: string | null
          required_skills?: string[] | null
          stipend?: string | null
          title?: string
          trust_score?: number | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      power_stats: {
        Row: {
          benchmark: string | null
          created_at: string
          id: string
          is_estimate: boolean | null
          label: string
          narrative: string | null
          source: string | null
          user_id: string
          value: string
        }
        Insert: {
          benchmark?: string | null
          created_at?: string
          id?: string
          is_estimate?: boolean | null
          label: string
          narrative?: string | null
          source?: string | null
          user_id: string
          value: string
        }
        Update: {
          benchmark?: string | null
          created_at?: string
          id?: string
          is_estimate?: boolean | null
          label?: string
          narrative?: string | null
          source?: string | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_band: Database["public"]["Enums"]["age_band"] | null
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          education_level: string | null
          experience_level: string | null
          goals: string[] | null
          onboarded_at: string | null
          updated_at: string
          user_id: string
          work_mode: string | null
        }
        Insert: {
          age_band?: Database["public"]["Enums"]["age_band"] | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          experience_level?: string | null
          goals?: string[] | null
          onboarded_at?: string | null
          updated_at?: string
          user_id: string
          work_mode?: string | null
        }
        Update: {
          age_band?: Database["public"]["Enums"]["age_band"] | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          experience_level?: string | null
          goals?: string[] | null
          onboarded_at?: string | null
          updated_at?: string
          user_id?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      question_option_traits: {
        Row: {
          created_at: string
          option_id: string
          reason: string | null
          trait_slug: string
          weight: number
        }
        Insert: {
          created_at?: string
          option_id: string
          reason?: string | null
          trait_slug: string
          weight: number
        }
        Update: {
          created_at?: string
          option_id?: string
          reason?: string | null
          trait_slug?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_option_traits_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_option_traits_trait_slug_fkey"
            columns: ["trait_slug"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["slug"]
          },
        ]
      }
      question_options: {
        Row: {
          id: string
          label: string
          question_id: string
          sort_order: number
          trait_weights: Json
          value: string
        }
        Insert: {
          id?: string
          label: string
          question_id: string
          sort_order: number
          trait_weights?: Json
          value: string
        }
        Update: {
          id?: string
          label?: string
          question_id?: string
          sort_order?: number
          trait_weights?: Json
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reasoning: {
        Row: {
          confidence_note: string | null
          contributions: Json
          created_at: string
          dimensions: string[]
          frameworks: Json
          primary_trait: string | null
          question_id: string
          raw: Json | null
          secondary_traits: string[]
          suggested_improvements: string | null
          updated_at: string
        }
        Insert: {
          confidence_note?: string | null
          contributions?: Json
          created_at?: string
          dimensions?: string[]
          frameworks?: Json
          primary_trait?: string | null
          question_id: string
          raw?: Json | null
          secondary_traits?: string[]
          suggested_improvements?: string | null
          updated_at?: string
        }
        Update: {
          confidence_note?: string | null
          contributions?: Json
          created_at?: string
          dimensions?: string[]
          frameworks?: Json
          primary_trait?: string | null
          question_id?: string
          raw?: Json | null
          secondary_traits?: string[]
          suggested_improvements?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reasoning_primary_trait_fkey"
            columns: ["primary_trait"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "question_reasoning_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          sort_order: number
          text: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          horizon: string
          id: string
          roadmap_id: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          horizon: string
          id?: string
          roadmap_id: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          horizon?: string
          id?: string
          roadmap_id?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_milestones_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          content: Json
          created_at: string
          horizon: string
          id: string
          is_active: boolean
          summary: string | null
          target_career: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          horizon?: string
          id?: string
          is_active?: boolean
          summary?: string | null
          target_career?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          horizon?: string
          id?: string
          is_active?: boolean
          summary?: string | null
          target_career?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_models: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          reason: string | null
          story: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          reason?: string | null
          story?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          reason?: string | null
          story?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      traits: {
        Row: {
          created_at: string
          description: string | null
          is_seed: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_seed?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_seed?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_assessments: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assessments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          option_id: string
          question_id: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          option_id: string
          question_id: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          option_id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
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
      age_band: "11_14" | "15_18" | "19_22" | "23_27"
      app_role: "admin" | "moderator" | "user" | "super_admin"
      assessment_status: "not_started" | "in_progress" | "completed"
      recommendation_kind:
        | "career"
        | "learning"
        | "role_model"
        | "success_story"
        | "opportunity"
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
      age_band: ["11_14", "15_18", "19_22", "23_27"],
      app_role: ["admin", "moderator", "user", "super_admin"],
      assessment_status: ["not_started", "in_progress", "completed"],
      recommendation_kind: [
        "career",
        "learning",
        "role_model",
        "success_story",
        "opportunity",
      ],
    },
  },
} as const

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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean | null
          created_at: string
          cta_text: string | null
          id: string
          image_url: string | null
          link_url: string | null
          sort_order: number | null
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          cta_text?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          cta_text?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          exam_type: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exam_type?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exam_type?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          city: string | null
          courses: string[] | null
          created_at: string
          exams_accepted: string[] | null
          fees: string | null
          id: string
          name: string
          placement_avg: string | null
          ranking: number | null
          slug: string
          state: string | null
          type: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          courses?: string[] | null
          created_at?: string
          exams_accepted?: string[] | null
          fees?: string | null
          id?: string
          name: string
          placement_avg?: string | null
          ranking?: number | null
          slug: string
          state?: string | null
          type?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          courses?: string[] | null
          created_at?: string
          exams_accepted?: string[] | null
          fees?: string | null
          id?: string
          name?: string
          placement_avg?: string | null
          ranking?: number | null
          slug?: string
          state?: string | null
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          batch_info: string | null
          created_at: string
          curriculum: string[] | null
          description: string | null
          duration: string | null
          fees: number | null
          id: string
          institute_id: string
          name: string
          syllabus_url: string | null
          updated_at: string
        }
        Insert: {
          batch_info?: string | null
          created_at?: string
          curriculum?: string[] | null
          description?: string | null
          duration?: string | null
          fees?: number | null
          id?: string
          institute_id: string
          name: string
          syllabus_url?: string | null
          updated_at?: string
        }
        Update: {
          batch_info?: string | null
          created_at?: string
          curriculum?: string[] | null
          description?: string | null
          duration?: string | null
          fees?: number | null
          id?: string
          institute_id?: string
          name?: string
          syllabus_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          conducting_body: string | null
          created_at: string
          cutoffs: Json | null
          description: string | null
          eligibility: string | null
          exam_date: string | null
          frequency: string | null
          full_name: string | null
          id: string
          important_dates: Json | null
          name: string
          pattern: Json | null
          registration_deadline: string | null
          slug: string
          syllabus: string[] | null
        }
        Insert: {
          conducting_body?: string | null
          created_at?: string
          cutoffs?: Json | null
          description?: string | null
          eligibility?: string | null
          exam_date?: string | null
          frequency?: string | null
          full_name?: string | null
          id?: string
          important_dates?: Json | null
          name: string
          pattern?: Json | null
          registration_deadline?: string | null
          slug: string
          syllabus?: string[] | null
        }
        Update: {
          conducting_body?: string | null
          created_at?: string
          cutoffs?: Json | null
          description?: string | null
          eligibility?: string | null
          exam_date?: string | null
          frequency?: string | null
          full_name?: string | null
          id?: string
          important_dates?: Json | null
          name?: string
          pattern?: Json | null
          registration_deadline?: string | null
          slug?: string
          syllabus?: string[] | null
        }
        Relationships: []
      }
      faculty: {
        Row: {
          bio: string | null
          created_at: string
          designation: string | null
          experience: string | null
          id: string
          institute_id: string
          name: string
          photo_url: string | null
          qualification: string | null
          specialization: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          designation?: string | null
          experience?: string | null
          id?: string
          institute_id: string
          name: string
          photo_url?: string | null
          qualification?: string | null
          specialization?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          designation?: string | null
          experience?: string | null
          id?: string
          institute_id?: string
          name?: string
          photo_url?: string | null
          qualification?: string | null
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          institute_id: string | null
          message: string | null
          name: string
          phone: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          institute_id?: string | null
          message?: string | null
          name: string
          phone?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          institute_id?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          address: string | null
          banner_url: string | null
          category_id: string | null
          city: string | null
          created_at: string
          description: string | null
          discount: string | null
          email: string | null
          featured: boolean | null
          features: string[] | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mode: string | null
          name: string
          offer: string | null
          phone: string | null
          rating: number | null
          slug: string
          state: string | null
          students_count: number | null
          success_rate: number | null
          total_reviews: number | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          discount?: string | null
          email?: string | null
          featured?: boolean | null
          features?: string[] | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mode?: string | null
          name: string
          offer?: string | null
          phone?: string | null
          rating?: number | null
          slug: string
          state?: string | null
          students_count?: number | null
          success_rate?: number | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          discount?: string | null
          email?: string | null
          featured?: boolean | null
          features?: string[] | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mode?: string | null
          name?: string
          offer?: string | null
          phone?: string | null
          rating?: number | null
          slug?: string
          state?: string | null
          students_count?: number | null
          success_rate?: number | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          target_exam: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          target_exam?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          target_exam?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          content: string | null
          created_at: string
          id: string
          institute_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          admin_reply?: string | null
          content?: string | null
          created_at?: string
          id?: string
          institute_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          admin_reply?: string | null
          content?: string | null
          created_at?: string
          id?: string
          institute_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_institutes: {
        Row: {
          created_at: string
          id: string
          institute_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_institutes_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
    },
  },
} as const

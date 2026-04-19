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
      admin_permissions: {
        Row: {
          allowed_sections: string[]
          created_at: string
          display_name: string
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_sections?: string[]
          created_at?: string
          display_name: string
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_sections?: string[]
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          feature: string
          id: string
          model: string | null
          prompt_tokens: number | null
          status: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          feature: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          status?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          feature?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          status?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_results: {
        Row: {
          ai_summary: string | null
          college_predictions: Json | null
          created_at: string
          id: string
          probability_scores: Json | null
          profile_analysis_id: string
          recommendations: Json | null
          strengths: Json | null
          study_plan: Json | null
          weaknesses: Json | null
        }
        Insert: {
          ai_summary?: string | null
          college_predictions?: Json | null
          created_at?: string
          id?: string
          probability_scores?: Json | null
          profile_analysis_id: string
          recommendations?: Json | null
          strengths?: Json | null
          study_plan?: Json | null
          weaknesses?: Json | null
        }
        Update: {
          ai_summary?: string | null
          college_predictions?: Json | null
          created_at?: string
          id?: string
          probability_scores?: Json | null
          profile_analysis_id?: string
          recommendations?: Json | null
          strengths?: Json | null
          study_plan?: Json | null
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_profile_analysis_id_fkey"
            columns: ["profile_analysis_id"]
            isOneToOne: false
            referencedRelation: "profile_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author: string | null
          banner_url: string | null
          category: string | null
          cluster_id: string | null
          comparison_id: string | null
          content: string | null
          content_hash: string | null
          content_score: number | null
          created_at: string
          excerpt: string | null
          featured: boolean | null
          funnel_stage: string | null
          h1_tag: string | null
          id: string
          image_url: string | null
          intro: string | null
          is_comparison: boolean | null
          keywords: string[] | null
          last_seo_refresh: string | null
          meta_description: string | null
          meta_title: string | null
          primary_keyword: string | null
          priority: number | null
          published: boolean | null
          slug: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          banner_url?: string | null
          category?: string | null
          cluster_id?: string | null
          comparison_id?: string | null
          content?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          image_url?: string | null
          intro?: string | null
          is_comparison?: boolean | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_keyword?: string | null
          priority?: number | null
          published?: boolean | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          banner_url?: string | null
          category?: string | null
          cluster_id?: string | null
          comparison_id?: string | null
          content?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          image_url?: string | null
          intro?: string | null
          is_comparison?: boolean | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_keyword?: string | null
          priority?: number | null
          published?: boolean | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "topic_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean | null
          created_at: string
          cta_text: string | null
          id: string
          image_url: string | null
          link_url: string | null
          mobile_image_url: string | null
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
          mobile_image_url?: string | null
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
          mobile_image_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      business_inquiries: {
        Row: {
          contact_number: string
          created_at: string
          id: string
          institute_name: string
          institute_type: string
          poc_email: string
          poc_name: string
          status: string
          updated_at: string
          website_url: string | null
          whatsapp_number: string
        }
        Insert: {
          contact_number: string
          created_at?: string
          id?: string
          institute_name: string
          institute_type: string
          poc_email: string
          poc_name: string
          status?: string
          updated_at?: string
          website_url?: string | null
          whatsapp_number: string
        }
        Update: {
          contact_number?: string
          created_at?: string
          id?: string
          institute_name?: string
          institute_type?: string
          poc_email?: string
          poc_name?: string
          status?: string
          updated_at?: string
          website_url?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      cat_score_submissions: {
        Row: {
          accuracy: number | null
          application_no: string | null
          attempted: number | null
          candidate_name: string
          correct: number | null
          created_at: string
          dilr_accuracy: number | null
          dilr_attempted: number | null
          dilr_correct: number | null
          dilr_incorrect: number | null
          dilr_score: number | null
          email: string | null
          estimated_percentile: number | null
          id: string
          incorrect: number | null
          max_score: number
          negative_marks: number | null
          phone: string | null
          qa_accuracy: number | null
          qa_attempted: number | null
          qa_correct: number | null
          qa_incorrect: number | null
          qa_score: number | null
          questions_data: Json | null
          sections_data: Json | null
          state: string | null
          subject: string | null
          test_date: string | null
          test_time: string | null
          total_questions: number | null
          total_score: number
          unattempted: number | null
          user_id: string | null
          varc_accuracy: number | null
          varc_attempted: number | null
          varc_correct: number | null
          varc_incorrect: number | null
          varc_score: number | null
        }
        Insert: {
          accuracy?: number | null
          application_no?: string | null
          attempted?: number | null
          candidate_name?: string
          correct?: number | null
          created_at?: string
          dilr_accuracy?: number | null
          dilr_attempted?: number | null
          dilr_correct?: number | null
          dilr_incorrect?: number | null
          dilr_score?: number | null
          email?: string | null
          estimated_percentile?: number | null
          id?: string
          incorrect?: number | null
          max_score?: number
          negative_marks?: number | null
          phone?: string | null
          qa_accuracy?: number | null
          qa_attempted?: number | null
          qa_correct?: number | null
          qa_incorrect?: number | null
          qa_score?: number | null
          questions_data?: Json | null
          sections_data?: Json | null
          state?: string | null
          subject?: string | null
          test_date?: string | null
          test_time?: string | null
          total_questions?: number | null
          total_score?: number
          unattempted?: number | null
          user_id?: string | null
          varc_accuracy?: number | null
          varc_attempted?: number | null
          varc_correct?: number | null
          varc_incorrect?: number | null
          varc_score?: number | null
        }
        Update: {
          accuracy?: number | null
          application_no?: string | null
          attempted?: number | null
          candidate_name?: string
          correct?: number | null
          created_at?: string
          dilr_accuracy?: number | null
          dilr_attempted?: number | null
          dilr_correct?: number | null
          dilr_incorrect?: number | null
          dilr_score?: number | null
          email?: string | null
          estimated_percentile?: number | null
          id?: string
          incorrect?: number | null
          max_score?: number
          negative_marks?: number | null
          phone?: string | null
          qa_accuracy?: number | null
          qa_attempted?: number | null
          qa_correct?: number | null
          qa_incorrect?: number | null
          qa_score?: number | null
          questions_data?: Json | null
          sections_data?: Json | null
          state?: string | null
          subject?: string | null
          test_date?: string | null
          test_time?: string | null
          total_questions?: number | null
          total_score?: number
          unattempted?: number | null
          user_id?: string | null
          varc_accuracy?: number | null
          varc_attempted?: number | null
          varc_correct?: number | null
          varc_incorrect?: number | null
          varc_score?: number | null
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
      city_pages: {
        Row: {
          active: boolean | null
          city_aliases: string[] | null
          cluster_id: string | null
          content_hash: string | null
          content_score: number | null
          created_at: string
          detailed_content: string | null
          faq_content: string | null
          funnel_stage: string | null
          h1_tag: string | null
          hero_image_url: string | null
          id: string
          intro_content: string | null
          keywords: string[] | null
          last_seo_refresh: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          primary_keyword: string | null
          slug: string
          sort_order: number | null
          state: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          city_aliases?: string[] | null
          cluster_id?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          detailed_content?: string | null
          faq_content?: string | null
          funnel_stage?: string | null
          h1_tag?: string | null
          hero_image_url?: string | null
          id?: string
          intro_content?: string | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          primary_keyword?: string | null
          slug: string
          sort_order?: number | null
          state?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          city_aliases?: string[] | null
          cluster_id?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          detailed_content?: string | null
          faq_content?: string | null
          funnel_stage?: string | null
          h1_tag?: string | null
          hero_image_url?: string | null
          id?: string
          intro_content?: string | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          primary_keyword?: string | null
          slug?: string
          sort_order?: number | null
          state?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_pages_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "topic_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_of_week: {
        Row: {
          active: boolean | null
          banner_url: string | null
          coupon_code: string | null
          coupon_discount: string | null
          created_at: string
          description: string | null
          headline: string | null
          id: string
          institute_id: string
          offer_details: string | null
          offer_text: string | null
          results_summary: string | null
          selected_courses: string | null
          website_url: string | null
        }
        Insert: {
          active?: boolean | null
          banner_url?: string | null
          coupon_code?: string | null
          coupon_discount?: string | null
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          institute_id: string
          offer_details?: string | null
          offer_text?: string | null
          results_summary?: string | null
          selected_courses?: string | null
          website_url?: string | null
        }
        Update: {
          active?: boolean | null
          banner_url?: string | null
          coupon_code?: string | null
          coupon_discount?: string | null
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          institute_id?: string
          offer_details?: string | null
          offer_text?: string | null
          results_summary?: string | null
          selected_courses?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_of_week_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_results: {
        Row: {
          avg_score_improvement: number | null
          cat_99_plus: number | null
          coaching_of_week_id: string
          conversions: number | null
          created_at: string
          id: string
          iim_a_selections: number | null
          iim_b_selections: number | null
          students_placed: number | null
          total_calls: number | null
          xat_99_plus: number | null
          year: number
        }
        Insert: {
          avg_score_improvement?: number | null
          cat_99_plus?: number | null
          coaching_of_week_id: string
          conversions?: number | null
          created_at?: string
          id?: string
          iim_a_selections?: number | null
          iim_b_selections?: number | null
          students_placed?: number | null
          total_calls?: number | null
          xat_99_plus?: number | null
          year: number
        }
        Update: {
          avg_score_improvement?: number | null
          cat_99_plus?: number | null
          coaching_of_week_id?: string
          conversions?: number | null
          created_at?: string
          id?: string
          iim_a_selections?: number | null
          iim_b_selections?: number | null
          students_placed?: number | null
          total_calls?: number | null
          xat_99_plus?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_results_coaching_of_week_id_fkey"
            columns: ["coaching_of_week_id"]
            isOneToOne: false
            referencedRelation: "coaching_of_week"
            referencedColumns: ["id"]
          },
        ]
      }
      college_sections: {
        Row: {
          college_id: string
          content: string | null
          created_at: string
          data: Json | null
          id: string
          section_type: string
          sort_order: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          college_id: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          section_type: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          college_id?: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          section_type?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_sections_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          accreditations: string[] | null
          admission_process: string | null
          banner_url: string | null
          campus_size: string | null
          city: string | null
          cluster_id: string | null
          college_category: string | null
          content_hash: string | null
          content_score: number | null
          courses: string[] | null
          created_at: string
          cutoff_info: Json | null
          description: string | null
          established: number | null
          exams_accepted: string[] | null
          fees: string | null
          fees_lakhs: number | null
          funnel_stage: string | null
          h1_tag: string | null
          highlights: Json | null
          id: string
          keywords: string[] | null
          last_seo_refresh: string | null
          last_updated_by: string | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          placement_avg: string | null
          placement_highest: string | null
          placement_median: string | null
          primary_keyword: string | null
          ranking: number | null
          slug: string
          source: string | null
          specializations: string[] | null
          state: string | null
          submitted_by_user_id: string | null
          tier: string | null
          top_recruiters: string[] | null
          total_students: number | null
          type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accreditations?: string[] | null
          admission_process?: string | null
          banner_url?: string | null
          campus_size?: string | null
          city?: string | null
          cluster_id?: string | null
          college_category?: string | null
          content_hash?: string | null
          content_score?: number | null
          courses?: string[] | null
          created_at?: string
          cutoff_info?: Json | null
          description?: string | null
          established?: number | null
          exams_accepted?: string[] | null
          fees?: string | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          highlights?: Json | null
          id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          placement_avg?: string | null
          placement_highest?: string | null
          placement_median?: string | null
          primary_keyword?: string | null
          ranking?: number | null
          slug: string
          source?: string | null
          specializations?: string[] | null
          state?: string | null
          submitted_by_user_id?: string | null
          tier?: string | null
          top_recruiters?: string[] | null
          total_students?: number | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accreditations?: string[] | null
          admission_process?: string | null
          banner_url?: string | null
          campus_size?: string | null
          city?: string | null
          cluster_id?: string | null
          college_category?: string | null
          content_hash?: string | null
          content_score?: number | null
          courses?: string[] | null
          created_at?: string
          cutoff_info?: Json | null
          description?: string | null
          established?: number | null
          exams_accepted?: string[] | null
          fees?: string | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          highlights?: Json | null
          id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          placement_avg?: string | null
          placement_highest?: string | null
          placement_median?: string | null
          primary_keyword?: string | null
          ranking?: number | null
          slug?: string
          source?: string | null
          specializations?: string[] | null
          state?: string | null
          submitted_by_user_id?: string | null
          tier?: string | null
          top_recruiters?: string[] | null
          total_students?: number | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colleges_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "topic_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          link: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_claims: {
        Row: {
          claimed_at: string
          coupon_id: string
          id: string
          login_source: string | null
          target_exam: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          coupon_id: string
          id?: string
          login_source?: string | null
          target_exam?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          coupon_id?: string
          id?: string
          login_source?: string | null
          target_exam?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_claims_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_text: string | null
          id: string
          institute_id: string | null
          max_uses: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_text?: string | null
          id?: string
          institute_id?: string | null
          max_uses?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_text?: string | null
          id?: string
          institute_id?: string | null
          max_uses?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          batch_info: string | null
          brochure_url: string | null
          course_category_id: string | null
          created_at: string
          curriculum: string[] | null
          demo_video_url: string | null
          description: string | null
          discount_text: string | null
          duration: string | null
          eligibility: string | null
          enrolled_count: number | null
          fees: number | null
          highlights: string[] | null
          id: string
          institute_id: string
          mode: string | null
          name: string
          rating: number | null
          start_date: string | null
          syllabus_url: string | null
          total_seats: number | null
          updated_at: string
        }
        Insert: {
          batch_info?: string | null
          brochure_url?: string | null
          course_category_id?: string | null
          created_at?: string
          curriculum?: string[] | null
          demo_video_url?: string | null
          description?: string | null
          discount_text?: string | null
          duration?: string | null
          eligibility?: string | null
          enrolled_count?: number | null
          fees?: number | null
          highlights?: string[] | null
          id?: string
          institute_id: string
          mode?: string | null
          name: string
          rating?: number | null
          start_date?: string | null
          syllabus_url?: string | null
          total_seats?: number | null
          updated_at?: string
        }
        Update: {
          batch_info?: string | null
          brochure_url?: string | null
          course_category_id?: string | null
          created_at?: string
          curriculum?: string[] | null
          demo_video_url?: string | null
          description?: string | null
          discount_text?: string | null
          duration?: string | null
          eligibility?: string | null
          enrolled_count?: number | null
          fees?: number | null
          highlights?: string[] | null
          id?: string
          institute_id?: string
          mode?: string | null
          name?: string
          rating?: number | null
          start_date?: string | null
          syllabus_url?: string | null
          total_seats?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_course_category_id_fkey"
            columns: ["course_category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
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
          cluster_id: string | null
          conducting_body: string | null
          content_hash: string | null
          content_score: number | null
          created_at: string
          cutoffs: Json | null
          description: string | null
          eligibility: string | null
          exam_date: string | null
          frequency: string | null
          full_name: string | null
          funnel_stage: string | null
          h1_tag: string | null
          id: string
          important_dates: Json | null
          keywords: string[] | null
          last_seo_refresh: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          pattern: Json | null
          primary_keyword: string | null
          registration_deadline: string | null
          slug: string
          syllabus: string[] | null
        }
        Insert: {
          cluster_id?: string | null
          conducting_body?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          cutoffs?: Json | null
          description?: string | null
          eligibility?: string | null
          exam_date?: string | null
          frequency?: string | null
          full_name?: string | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          important_dates?: Json | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          pattern?: Json | null
          primary_keyword?: string | null
          registration_deadline?: string | null
          slug: string
          syllabus?: string[] | null
        }
        Update: {
          cluster_id?: string | null
          conducting_body?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          cutoffs?: Json | null
          description?: string | null
          eligibility?: string | null
          exam_date?: string | null
          frequency?: string | null
          full_name?: string | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          important_dates?: Json | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          pattern?: Json | null
          primary_keyword?: string | null
          registration_deadline?: string | null
          slug?: string
          syllabus?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "topic_clusters"
            referencedColumns: ["id"]
          },
        ]
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
      indexing_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          indexing_url_id: string | null
          response: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          indexing_url_id?: string | null
          response?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          indexing_url_id?: string | null
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexing_logs_indexing_url_id_fkey"
            columns: ["indexing_url_id"]
            isOneToOne: false
            referencedRelation: "indexing_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      indexing_urls: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          indexed_at: string | null
          last_response: Json | null
          last_submitted_at: string | null
          next_retry_at: string | null
          page_type: string
          record_id: string | null
          retry_count: number
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          indexed_at?: string | null
          last_response?: Json | null
          last_submitted_at?: string | null
          next_retry_at?: string | null
          page_type?: string
          record_id?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          indexed_at?: string | null
          last_response?: Json | null
          last_submitted_at?: string | null
          next_retry_at?: string | null
          page_type?: string
          record_id?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
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
          read: boolean
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
          read?: boolean
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
          read?: boolean
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
      institute_results: {
        Row: {
          college_name: string
          created_at: string
          description: string | null
          id: string
          institute_id: string
          students_selected: number | null
          year: number
        }
        Insert: {
          college_name: string
          created_at?: string
          description?: string | null
          id?: string
          institute_id: string
          students_selected?: number | null
          year: number
        }
        Update: {
          college_name?: string
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string
          students_selected?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "institute_results_institute_id_fkey"
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
          cluster_id: string | null
          content_hash: string | null
          content_score: number | null
          created_at: string
          description: string | null
          discount: string | null
          email: string | null
          featured: boolean | null
          features: string[] | null
          fees_lakhs: number | null
          funnel_stage: string | null
          h1_tag: string | null
          id: string
          keywords: string[] | null
          last_seo_refresh: string | null
          last_updated_by: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          meta_description: string | null
          meta_title: string | null
          mode: string | null
          name: string
          offer: string | null
          phone: string | null
          primary_keyword: string | null
          rating: number | null
          slug: string
          source: string | null
          specializations: string[] | null
          state: string | null
          students_count: number | null
          submitted_by_user_id: string | null
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
          cluster_id?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          description?: string | null
          discount?: string | null
          email?: string | null
          featured?: boolean | null
          features?: string[] | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          name: string
          offer?: string | null
          phone?: string | null
          primary_keyword?: string | null
          rating?: number | null
          slug: string
          source?: string | null
          specializations?: string[] | null
          state?: string | null
          students_count?: number | null
          submitted_by_user_id?: string | null
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
          cluster_id?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          description?: string | null
          discount?: string | null
          email?: string | null
          featured?: boolean | null
          features?: string[] | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          name?: string
          offer?: string | null
          phone?: string | null
          primary_keyword?: string | null
          rating?: number | null
          slug?: string
          source?: string | null
          specializations?: string[] | null
          state?: string | null
          students_count?: number | null
          submitted_by_user_id?: string | null
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
          {
            foreignKeyName: "institutes_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "topic_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      mega_menu_items: {
        Row: {
          active: boolean | null
          column_sort_order: number | null
          column_title: string
          created_at: string | null
          id: string
          link_label: string
          link_sort_order: number | null
          link_url: string
          menu_type: string
          tab_label: string
          tab_sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          column_sort_order?: number | null
          column_title: string
          created_at?: string | null
          id?: string
          link_label: string
          link_sort_order?: number | null
          link_url: string
          menu_type?: string
          tab_label: string
          tab_sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          column_sort_order?: number | null
          column_title?: string
          created_at?: string | null
          id?: string
          link_label?: string
          link_sort_order?: number | null
          link_url?: string
          menu_type?: string
          tab_label?: string
          tab_sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code: string
          phone: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      profile_analyses: {
        Row: {
          category: string
          created_at: string
          current_city: string | null
          current_employer_type: string[] | null
          email: string | null
          expected_salary_lakhs: number | null
          extracurriculars: string[] | null
          fee_budget_lakhs: number | null
          gap_year_reason: string | null
          gender: string | null
          graduation_score: number
          graduation_stream: string
          graduation_year: number | null
          has_certifications: string[] | null
          has_gap_years: boolean | null
          id: string
          is_pursuing_graduation: boolean | null
          leadership_roles: string | null
          name: string | null
          phone: string | null
          preferred_specialization: string | null
          preparation_months_remaining: number | null
          profile_score: number | null
          report_unlocked: boolean | null
          target_colleges: string[] | null
          target_exam: string
          target_exams: string[] | null
          target_states: string[] | null
          tenth_score: number
          twelfth_score: number
          updated_at: string
          user_id: string | null
          work_experience_months: number
        }
        Insert: {
          category?: string
          created_at?: string
          current_city?: string | null
          current_employer_type?: string[] | null
          email?: string | null
          expected_salary_lakhs?: number | null
          extracurriculars?: string[] | null
          fee_budget_lakhs?: number | null
          gap_year_reason?: string | null
          gender?: string | null
          graduation_score: number
          graduation_stream: string
          graduation_year?: number | null
          has_certifications?: string[] | null
          has_gap_years?: boolean | null
          id?: string
          is_pursuing_graduation?: boolean | null
          leadership_roles?: string | null
          name?: string | null
          phone?: string | null
          preferred_specialization?: string | null
          preparation_months_remaining?: number | null
          profile_score?: number | null
          report_unlocked?: boolean | null
          target_colleges?: string[] | null
          target_exam: string
          target_exams?: string[] | null
          target_states?: string[] | null
          tenth_score: number
          twelfth_score: number
          updated_at?: string
          user_id?: string | null
          work_experience_months?: number
        }
        Update: {
          category?: string
          created_at?: string
          current_city?: string | null
          current_employer_type?: string[] | null
          email?: string | null
          expected_salary_lakhs?: number | null
          extracurriculars?: string[] | null
          fee_budget_lakhs?: number | null
          gap_year_reason?: string | null
          gender?: string | null
          graduation_score?: number
          graduation_stream?: string
          graduation_year?: number | null
          has_certifications?: string[] | null
          has_gap_years?: boolean | null
          id?: string
          is_pursuing_graduation?: boolean | null
          leadership_roles?: string | null
          name?: string | null
          phone?: string | null
          preferred_specialization?: string | null
          preparation_months_remaining?: number | null
          profile_score?: number | null
          report_unlocked?: boolean | null
          target_colleges?: string[] | null
          target_exam?: string
          target_exams?: string[] | null
          target_states?: string[] | null
          tenth_score?: number
          twelfth_score?: number
          updated_at?: string
          user_id?: string | null
          work_experience_months?: number
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
          onboarding_completed: boolean | null
          phone: string | null
          signup_page_name: string | null
          signup_page_url: string | null
          target_exam: string | null
          target_exams: string[] | null
          updated_at: string
          user_id: string
          work_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          signup_page_name?: string | null
          signup_page_url?: string | null
          target_exam?: string | null
          target_exams?: string[] | null
          updated_at?: string
          user_id: string
          work_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          signup_page_name?: string | null
          signup_page_url?: string | null
          target_exam?: string | null
          target_exams?: string[] | null
          updated_at?: string
          user_id?: string
          work_experience?: string | null
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
      roi_analyses: {
        Row: {
          ai_insights: Json | null
          budget_lakhs: number
          college_recommendations: Json | null
          created_at: string
          current_salary_lakhs: number
          email: string | null
          expected_salary_lakhs: number | null
          expected_tier: string
          graduation_stream: string
          id: string
          name: string | null
          payback_years: number | null
          phone: string | null
          preferred_location: string | null
          preferred_specialization: string | null
          report_unlocked: boolean | null
          roi_category: string | null
          roi_score: number | null
          target_exams: string[]
          target_states: string[] | null
          total_investment_lakhs: number | null
          updated_at: string
          user_id: string | null
          work_experience_years: number
        }
        Insert: {
          ai_insights?: Json | null
          budget_lakhs?: number
          college_recommendations?: Json | null
          created_at?: string
          current_salary_lakhs?: number
          email?: string | null
          expected_salary_lakhs?: number | null
          expected_tier?: string
          graduation_stream: string
          id?: string
          name?: string | null
          payback_years?: number | null
          phone?: string | null
          preferred_location?: string | null
          preferred_specialization?: string | null
          report_unlocked?: boolean | null
          roi_category?: string | null
          roi_score?: number | null
          target_exams?: string[]
          target_states?: string[] | null
          total_investment_lakhs?: number | null
          updated_at?: string
          user_id?: string | null
          work_experience_years?: number
        }
        Update: {
          ai_insights?: Json | null
          budget_lakhs?: number
          college_recommendations?: Json | null
          created_at?: string
          current_salary_lakhs?: number
          email?: string | null
          expected_salary_lakhs?: number | null
          expected_tier?: string
          graduation_stream?: string
          id?: string
          name?: string | null
          payback_years?: number | null
          phone?: string | null
          preferred_location?: string | null
          preferred_specialization?: string | null
          report_unlocked?: boolean | null
          roi_category?: string | null
          roi_score?: number | null
          target_exams?: string[]
          target_states?: string[] | null
          total_investment_lakhs?: number | null
          updated_at?: string
          user_id?: string | null
          work_experience_years?: number
        }
        Relationships: []
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
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      specializations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          active: boolean | null
          content: string | null
          created_at: string
          designation: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          institute: string | null
          institute_id: string | null
          name: string
          rating: number | null
          sort_order: number | null
          type: string
          video_url: string | null
        }
        Insert: {
          active?: boolean | null
          content?: string | null
          created_at?: string
          designation?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          institute?: string | null
          institute_id?: string | null
          name: string
          rating?: number | null
          sort_order?: number | null
          type?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean | null
          content?: string | null
          created_at?: string
          designation?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          institute?: string | null
          institute_id?: string | null
          name?: string
          rating?: number | null
          sort_order?: number | null
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_clusters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          pillar_page_type: string | null
          pillar_record_id: string | null
          primary_keyword: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pillar_page_type?: string | null
          pillar_record_id?: string | null
          primary_keyword?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pillar_page_type?: string | null
          pillar_record_id?: string | null
          primary_keyword?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_listing_pocs: {
        Row: {
          city: string | null
          created_at: string
          designation: string | null
          email: string | null
          email_is_generic: boolean | null
          full_name: string
          id: string
          mobile: string | null
          mobile_otp_verified: boolean | null
          organization: string | null
          state: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          email_is_generic?: boolean | null
          full_name: string
          id?: string
          mobile?: string | null
          mobile_otp_verified?: boolean | null
          organization?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          email_is_generic?: boolean | null
          full_name?: string
          id?: string
          mobile?: string | null
          mobile_otp_verified?: boolean | null
          organization?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_listings: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_record_id: string | null
          created_at: string
          id: string
          listing_type: string
          payload: Json
          poc: Json | null
          poc_verified: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          sections: Json
          status: string
          submitted_at: string | null
          target_record_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_record_id?: string | null
          created_at?: string
          id?: string
          listing_type: string
          payload?: Json
          poc?: Json | null
          poc_verified?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections?: Json
          status?: string
          submitted_at?: string | null
          target_record_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_record_id?: string | null
          created_at?: string
          id?: string
          listing_type?: string
          payload?: Json
          poc?: Json | null
          poc_verified?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections?: Json
          status?: string
          submitted_at?: string | null
          target_record_id?: string | null
          updated_at?: string
          user_id?: string
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
      assign_admin_by_email: { Args: { _email: string }; Returns: string }
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

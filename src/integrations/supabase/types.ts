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
      ai_mock_generations: {
        Row: {
          ai_model: string | null
          category: string
          created_at: string
          created_by: string | null
          error_message: string | null
          exam_code: string
          finished_at: string | null
          id: string
          level: string
          request: Json
          result_summary: Json
          status: string
          test_id: string | null
          total_generated: number
          total_rejected_duplicate: number
          total_rejected_web_match: number
          total_requested: number
        }
        Insert: {
          ai_model?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          exam_code: string
          finished_at?: string | null
          id?: string
          level: string
          request?: Json
          result_summary?: Json
          status?: string
          test_id?: string | null
          total_generated?: number
          total_rejected_duplicate?: number
          total_rejected_web_match?: number
          total_requested?: number
        }
        Update: {
          ai_model?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          exam_code?: string
          finished_at?: string | null
          id?: string
          level?: string
          request?: Json
          result_summary?: Json
          status?: string
          test_id?: string | null
          total_generated?: number
          total_rejected_duplicate?: number
          total_rejected_web_match?: number
          total_requested?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_mock_generations_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          feature: string
          id: string
          latency_ms: number | null
          model: string | null
          prompt_tokens: number | null
          provider: string | null
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
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
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
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
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
      audit_runs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          fixes_applied: number
          id: string
          issues_found: number
          mode: string
          overall_score: number | null
          pages_scanned: number
          pending_issues: number
          report: Json
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          fixes_applied?: number
          id?: string
          issues_found?: number
          mode?: string
          overall_score?: number | null
          pages_scanned?: number
          pending_issues?: number
          report?: Json
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          fixes_applied?: number
          id?: string
          issues_found?: number
          mode?: string
          overall_score?: number | null
          pages_scanned?: number
          pending_issues?: number
          report?: Json
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      audit_step_logs: {
        Row: {
          created_at: string
          details: Json
          duration_ms: number | null
          id: string
          pages_affected: number
          run_id: string
          status: string
          step_key: string
          step_label: string
          step_number: number
          summary: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          pages_affected?: number
          run_id: string
          status?: string
          step_key: string
          step_label: string
          step_number: number
          summary?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          pages_affected?: number
          run_id?: string
          status?: string
          step_key?: string
          step_label?: string
          step_number?: number
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_step_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
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
      bulk_college_jobs: {
        Row: {
          ai_provider: string
          completed: number
          concurrency: number
          created_at: string
          created_by: string | null
          current_activity: string | null
          duplicates_skipped: number
          error_message: string | null
          failed: number
          finished_at: string | null
          id: string
          paused: boolean
          request_inputs: Json
          rows: Json
          started_at: string | null
          status: string
          succeeded: number
          telemetry: Json
          total_rows: number
          updated_at: string
          worker_id: string | null
          worker_lock_until: string | null
        }
        Insert: {
          ai_provider?: string
          completed?: number
          concurrency?: number
          created_at?: string
          created_by?: string | null
          current_activity?: string | null
          duplicates_skipped?: number
          error_message?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          paused?: boolean
          request_inputs?: Json
          rows?: Json
          started_at?: string | null
          status?: string
          succeeded?: number
          telemetry?: Json
          total_rows?: number
          updated_at?: string
          worker_id?: string | null
          worker_lock_until?: string | null
        }
        Update: {
          ai_provider?: string
          completed?: number
          concurrency?: number
          created_at?: string
          created_by?: string | null
          current_activity?: string | null
          duplicates_skipped?: number
          error_message?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          paused?: boolean
          request_inputs?: Json
          rows?: Json
          started_at?: string | null
          status?: string
          succeeded?: number
          telemetry?: Json
          total_rows?: number
          updated_at?: string
          worker_id?: string | null
          worker_lock_until?: string | null
        }
        Relationships: []
      }
      bulk_section_jobs: {
        Row: {
          ai_provider: string
          concurrency: number
          created_at: string
          created_by: string | null
          current_activity: string | null
          error_message: string | null
          failed: number
          finished_at: string | null
          id: string
          not_found: number
          paused: boolean
          rows: Json
          started_at: string | null
          status: string
          steps_done: number
          succeeded: number
          telemetry: Json
          total_rows: number
          total_steps: number
          updated_at: string
          worker_id: string | null
          worker_lock_until: string | null
        }
        Insert: {
          ai_provider?: string
          concurrency?: number
          created_at?: string
          created_by?: string | null
          current_activity?: string | null
          error_message?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          not_found?: number
          paused?: boolean
          rows?: Json
          started_at?: string | null
          status?: string
          steps_done?: number
          succeeded?: number
          telemetry?: Json
          total_rows?: number
          total_steps?: number
          updated_at?: string
          worker_id?: string | null
          worker_lock_until?: string | null
        }
        Update: {
          ai_provider?: string
          concurrency?: number
          created_at?: string
          created_by?: string | null
          current_activity?: string | null
          error_message?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          not_found?: number
          paused?: boolean
          rows?: Json
          started_at?: string | null
          status?: string
          steps_done?: number
          succeeded?: number
          telemetry?: Json
          total_rows?: number
          total_steps?: number
          updated_at?: string
          worker_id?: string | null
          worker_lock_until?: string | null
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
          is_active: boolean
          parent_section_id: string | null
          section_type: string
          sort_order: number | null
          source: string
          title: string | null
          updated_at: string
          version: string
        }
        Insert: {
          college_id: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean
          parent_section_id?: string | null
          section_type: string
          sort_order?: number | null
          source?: string
          title?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          college_id?: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean
          parent_section_id?: string | null
          section_type?: string
          sort_order?: number | null
          source?: string
          title?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_sections_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "college_sections"
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
      content_refreshes: {
        Row: {
          ai_model: string | null
          ai_notes: string | null
          created_at: string
          current_snapshot: Json
          diff: Json
          entity_id: string
          entity_name: string | null
          entity_slug: string | null
          entity_type: string
          error_message: string | null
          id: string
          proposed_snapshot: Json
          published_at: string | null
          refresh_mode: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_notes?: string | null
          created_at?: string
          current_snapshot?: Json
          diff?: Json
          entity_id: string
          entity_name?: string | null
          entity_slug?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          proposed_snapshot?: Json
          published_at?: string | null
          refresh_mode?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_notes?: string | null
          created_at?: string
          current_snapshot?: Json
          diff?: Json
          entity_id?: string
          entity_name?: string | null
          entity_slug?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          proposed_snapshot?: Json
          published_at?: string | null
          refresh_mode?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
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
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mba_compass_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "course_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      course_orders: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          currency: string
          id: string
          notes: Json | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: Json | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: Json | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mba_compass_courses"
            referencedColumns: ["id"]
          },
        ]
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
      daily_test_assignments: {
        Row: {
          assigned_date: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          test_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          assigned_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          test_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          test_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
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
      iim_waitlist_applications: {
        Row: {
          admitted: number | null
          applications_received: number | null
          batch_size: number | null
          called_for_pi: number | null
          college_name: string
          college_short: string | null
          college_type: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          offers_made: number | null
          shortlisted: number | null
          sort_order: number
          updated_at: string
          waitlisted: number | null
          year: number
        }
        Insert: {
          admitted?: number | null
          applications_received?: number | null
          batch_size?: number | null
          called_for_pi?: number | null
          college_name: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          offers_made?: number | null
          shortlisted?: number | null
          sort_order?: number
          updated_at?: string
          waitlisted?: number | null
          year?: number
        }
        Update: {
          admitted?: number | null
          applications_received?: number | null
          batch_size?: number | null
          called_for_pi?: number | null
          college_name?: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          offers_made?: number | null
          shortlisted?: number | null
          sort_order?: number
          updated_at?: string
          waitlisted?: number | null
          year?: number
        }
        Relationships: []
      }
      iim_waitlist_leads: {
        Row: {
          admin_notes: string | null
          cat_percentile: number | null
          category: string | null
          created_at: string
          current_status: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string
          source: string | null
          status: string
          target_iims: string[] | null
          updated_at: string
          year: number | null
        }
        Insert: {
          admin_notes?: string | null
          cat_percentile?: number | null
          category?: string | null
          created_at?: string
          current_status?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone: string
          source?: string | null
          status?: string
          target_iims?: string[] | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          admin_notes?: string | null
          cat_percentile?: number | null
          category?: string | null
          created_at?: string
          current_status?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          source?: string | null
          status?: string
          target_iims?: string[] | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      iim_waitlist_movement: {
        Row: {
          category: string
          college_name: string
          college_short: string | null
          college_type: string
          created_at: string
          five_yr_avg: number | null
          id: string
          is_active: boolean
          sort_order: number
          trend: string | null
          updated_at: string
          wl_2021: number | null
          wl_2022: number | null
          wl_2023: number | null
          wl_2024: number | null
          wl_2025: number | null
          wl_2026_est: number | null
        }
        Insert: {
          category?: string
          college_name: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          five_yr_avg?: number | null
          id?: string
          is_active?: boolean
          sort_order?: number
          trend?: string | null
          updated_at?: string
          wl_2021?: number | null
          wl_2022?: number | null
          wl_2023?: number | null
          wl_2024?: number | null
          wl_2025?: number | null
          wl_2026_est?: number | null
        }
        Update: {
          category?: string
          college_name?: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          five_yr_avg?: number | null
          id?: string
          is_active?: boolean
          sort_order?: number
          trend?: string | null
          updated_at?: string
          wl_2021?: number | null
          wl_2022?: number | null
          wl_2023?: number | null
          wl_2024?: number | null
          wl_2025?: number | null
          wl_2026_est?: number | null
        }
        Relationships: []
      }
      iim_waitlist_results: {
        Row: {
          college_name: string
          college_short: string | null
          college_type: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          result_date: string | null
          result_date_label: string | null
          result_url: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          college_name: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          result_date?: string | null
          result_date_label?: string | null
          result_url?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          college_name?: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          result_date?: string | null
          result_date_label?: string | null
          result_url?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      iim_waitlist_rti: {
        Row: {
          college_name: string
          college_short: string | null
          college_type: string
          created_at: string
          id: string
          insights: Json
          is_active: boolean
          rti_year: number
          sort_order: number
          source_url: string | null
          updated_at: string
        }
        Insert: {
          college_name: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          id?: string
          insights?: Json
          is_active?: boolean
          rti_year?: number
          sort_order?: number
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          college_name?: string
          college_short?: string | null
          college_type?: string
          created_at?: string
          id?: string
          insights?: Json
          is_active?: boolean
          rti_year?: number
          sort_order?: number
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
      listing_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          diff: Json
          id: string
          listing_type: string
          new_payload: Json
          old_payload: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          target_record_id: string
          target_table: string
          updated_at: string
          user_id: string
          user_listing_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          diff?: Json
          id?: string
          listing_type: string
          new_payload?: Json
          old_payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          target_record_id: string
          target_table: string
          updated_at?: string
          user_id: string
          user_listing_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          diff?: Json
          id?: string
          listing_type?: string
          new_payload?: Json
          old_payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          target_record_id?: string
          target_table?: string
          updated_at?: string
          user_id?: string
          user_listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_change_requests_user_listing_id_fkey"
            columns: ["user_listing_id"]
            isOneToOne: false
            referencedRelation: "user_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      mba_compass_courses: {
        Row: {
          banner_url: string | null
          brochure_url: string | null
          created_at: string
          curriculum: Json | null
          description: string | null
          discount_percent: number | null
          duration_weeks: number | null
          enroll_url: string | null
          exam_focus: string[] | null
          faqs: Json | null
          features: Json | null
          full_mocks_count: number | null
          gallery_images: Json | null
          has_ai_study_planner: boolean | null
          has_ai_tools: boolean | null
          has_cat_planner: boolean | null
          has_certificate: boolean | null
          has_daily_test: boolean | null
          has_doubt_resolution: boolean | null
          has_gd_pi_prep: boolean | null
          has_leaderboard_access: boolean | null
          has_lifetime_access: boolean | null
          has_live_classes: boolean | null
          has_mentorship_1on1: boolean | null
          has_mock_analysis: boolean | null
          has_percentile_predictor: boolean | null
          has_performance_analytics: boolean | null
          has_recorded_lectures: boolean | null
          has_sectional_tests: boolean | null
          has_study_material: boolean | null
          has_topic_tests: boolean | null
          highlights: Json | null
          id: string
          instructors: Json | null
          is_active: boolean
          is_featured: boolean
          language: string | null
          level: string | null
          live_classes_count: number | null
          mode: string | null
          original_price: number | null
          price: number | null
          rating: number | null
          reviews_count: number | null
          sectional_mocks_count: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          subtitle: string | null
          thumbnail_url: string | null
          title: string
          topic_tests_count: number | null
          total_practice_questions: number | null
          total_students_enrolled: number | null
          total_video_hours: number | null
          updated_at: string
          validity_months: number | null
          what_youll_learn: Json | null
        }
        Insert: {
          banner_url?: string | null
          brochure_url?: string | null
          created_at?: string
          curriculum?: Json | null
          description?: string | null
          discount_percent?: number | null
          duration_weeks?: number | null
          enroll_url?: string | null
          exam_focus?: string[] | null
          faqs?: Json | null
          features?: Json | null
          full_mocks_count?: number | null
          gallery_images?: Json | null
          has_ai_study_planner?: boolean | null
          has_ai_tools?: boolean | null
          has_cat_planner?: boolean | null
          has_certificate?: boolean | null
          has_daily_test?: boolean | null
          has_doubt_resolution?: boolean | null
          has_gd_pi_prep?: boolean | null
          has_leaderboard_access?: boolean | null
          has_lifetime_access?: boolean | null
          has_live_classes?: boolean | null
          has_mentorship_1on1?: boolean | null
          has_mock_analysis?: boolean | null
          has_percentile_predictor?: boolean | null
          has_performance_analytics?: boolean | null
          has_recorded_lectures?: boolean | null
          has_sectional_tests?: boolean | null
          has_study_material?: boolean | null
          has_topic_tests?: boolean | null
          highlights?: Json | null
          id?: string
          instructors?: Json | null
          is_active?: boolean
          is_featured?: boolean
          language?: string | null
          level?: string | null
          live_classes_count?: number | null
          mode?: string | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          sectional_mocks_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
          topic_tests_count?: number | null
          total_practice_questions?: number | null
          total_students_enrolled?: number | null
          total_video_hours?: number | null
          updated_at?: string
          validity_months?: number | null
          what_youll_learn?: Json | null
        }
        Update: {
          banner_url?: string | null
          brochure_url?: string | null
          created_at?: string
          curriculum?: Json | null
          description?: string | null
          discount_percent?: number | null
          duration_weeks?: number | null
          enroll_url?: string | null
          exam_focus?: string[] | null
          faqs?: Json | null
          features?: Json | null
          full_mocks_count?: number | null
          gallery_images?: Json | null
          has_ai_study_planner?: boolean | null
          has_ai_tools?: boolean | null
          has_cat_planner?: boolean | null
          has_certificate?: boolean | null
          has_daily_test?: boolean | null
          has_doubt_resolution?: boolean | null
          has_gd_pi_prep?: boolean | null
          has_leaderboard_access?: boolean | null
          has_lifetime_access?: boolean | null
          has_live_classes?: boolean | null
          has_mentorship_1on1?: boolean | null
          has_mock_analysis?: boolean | null
          has_percentile_predictor?: boolean | null
          has_performance_analytics?: boolean | null
          has_recorded_lectures?: boolean | null
          has_sectional_tests?: boolean | null
          has_study_material?: boolean | null
          has_topic_tests?: boolean | null
          highlights?: Json | null
          id?: string
          instructors?: Json | null
          is_active?: boolean
          is_featured?: boolean
          language?: string | null
          level?: string | null
          live_classes_count?: number | null
          mode?: string | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          sectional_mocks_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
          topic_tests_count?: number | null
          total_practice_questions?: number | null
          total_students_enrolled?: number | null
          total_video_hours?: number | null
          updated_at?: string
          validity_months?: number | null
          what_youll_learn?: Json | null
        }
        Relationships: []
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
      mock_ai_deep_analyses: {
        Row: {
          ai_model: string | null
          attempt_id: string
          created_at: string
          id: string
          mistake_patterns: Json
          next_steps: Json
          recommendations: Json
          summary: string | null
          test_id: string | null
          time_insights: Json
          topic_focus: Json
          user_id: string
          why_lost_marks: Json
        }
        Insert: {
          ai_model?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          mistake_patterns?: Json
          next_steps?: Json
          recommendations?: Json
          summary?: string | null
          test_id?: string | null
          time_insights?: Json
          topic_focus?: Json
          user_id: string
          why_lost_marks?: Json
        }
        Update: {
          ai_model?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          mistake_patterns?: Json
          next_steps?: Json
          recommendations?: Json
          summary?: string | null
          test_id?: string | null
          time_insights?: Json
          topic_focus?: Json
          user_id?: string
          why_lost_marks?: Json
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
          accuracy: number | null
          all_india_rank: number | null
          auto_submitted_reason: string | null
          created_at: string
          current_section_id: string | null
          fullscreen_exits: number
          id: string
          max_score: number | null
          overall_deadline: string | null
          percentile: number | null
          section_deadlines: Json
          sectional_scores: Json | null
          started_at: string
          status: Database["public"]["Enums"]["mock_attempt_status"]
          submitted_at: string | null
          tab_switch_count: number
          test_id: string
          topic_breakdown: Json | null
          total_attempted: number | null
          total_correct: number | null
          total_incorrect: number | null
          total_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          all_india_rank?: number | null
          auto_submitted_reason?: string | null
          created_at?: string
          current_section_id?: string | null
          fullscreen_exits?: number
          id?: string
          max_score?: number | null
          overall_deadline?: string | null
          percentile?: number | null
          section_deadlines?: Json
          sectional_scores?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["mock_attempt_status"]
          submitted_at?: string | null
          tab_switch_count?: number
          test_id: string
          topic_breakdown?: Json | null
          total_attempted?: number | null
          total_correct?: number | null
          total_incorrect?: number | null
          total_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          all_india_rank?: number | null
          auto_submitted_reason?: string | null
          created_at?: string
          current_section_id?: string | null
          fullscreen_exits?: number
          id?: string
          max_score?: number | null
          overall_deadline?: string | null
          percentile?: number | null
          section_deadlines?: Json
          sectional_scores?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["mock_attempt_status"]
          submitted_at?: string | null
          tab_switch_count?: number
          test_id?: string
          topic_breakdown?: Json | null
          total_attempted?: number | null
          total_correct?: number | null
          total_incorrect?: number | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_current_section_id_fkey"
            columns: ["current_section_id"]
            isOneToOne: false
            referencedRelation: "mock_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_bookmarks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          current_uses: number
          discount_flat_inr: number | null
          discount_percent: number | null
          id: string
          max_uses: number | null
          test_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          current_uses?: number
          discount_flat_inr?: number | null
          discount_percent?: number | null
          id?: string
          max_uses?: number | null
          test_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          current_uses?: number
          discount_flat_inr?: number | null
          discount_percent?: number | null
          id?: string
          max_uses?: number | null
          test_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_coupons_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_enrollments: {
        Row: {
          admin_notes: string | null
          assigned_by: string | null
          coupon_code: string | null
          enrolled_at: string
          expires_at: string | null
          id: string
          source: string
          test_id: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_by?: string | null
          coupon_code?: string | null
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          test_id: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_by?: string | null
          coupon_code?: string | null
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_enrollments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          order_id: string
          quantity: number
          test_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          order_id: string
          quantity?: number
          test_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          order_id?: string
          quantity?: number
          test_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mock_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          discount_amount: number
          final_amount: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_passages: {
        Row: {
          content_html: string
          created_at: string
          id: string
          image_urls: string[] | null
          section_id: string
          sort_order: number
          title: string | null
        }
        Insert: {
          content_html: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          section_id: string
          sort_order?: number
          title?: string | null
        }
        Update: {
          content_html?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          section_id?: string
          sort_order?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_passages_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mock_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_payments: {
        Row: {
          amount_inr: number
          coupon_code: string | null
          created_at: string
          currency: string
          discount_inr: number | null
          id: string
          status: Database["public"]["Enums"]["mock_payment_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_inr?: number | null
          id?: string
          status?: Database["public"]["Enums"]["mock_payment_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_inr?: number | null
          id?: string
          status?: Database["public"]["Enums"]["mock_payment_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_payments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_question_options: {
        Row: {
          id: string
          is_correct: boolean
          option_html: string
          option_label: string
          question_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_html: string
          option_label: string
          question_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_html?: string
          option_label?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_questions: {
        Row: {
          content_hash: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["mock_difficulty"]
          explanation_html: string | null
          id: string
          image_urls: string[] | null
          negative_marks: number
          passage_id: string | null
          past_year_reference: string | null
          positive_marks: number
          question_html: string
          question_number: number
          question_type: Database["public"]["Enums"]["mock_question_type"]
          section_id: string
          solution_video_url: string | null
          subtopic: string | null
          tita_correct_answers: string[] | null
          tita_numeric_tolerance: number | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["mock_difficulty"]
          explanation_html?: string | null
          id?: string
          image_urls?: string[] | null
          negative_marks?: number
          passage_id?: string | null
          past_year_reference?: string | null
          positive_marks?: number
          question_html: string
          question_number: number
          question_type?: Database["public"]["Enums"]["mock_question_type"]
          section_id: string
          solution_video_url?: string | null
          subtopic?: string | null
          tita_correct_answers?: string[] | null
          tita_numeric_tolerance?: number | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["mock_difficulty"]
          explanation_html?: string | null
          id?: string
          image_urls?: string[] | null
          negative_marks?: number
          passage_id?: string | null
          past_year_reference?: string | null
          positive_marks?: number
          question_html?: string
          question_number?: number
          question_type?: Database["public"]["Enums"]["mock_question_type"]
          section_id?: string
          solution_video_url?: string | null
          subtopic?: string | null
          tita_correct_answers?: string[] | null
          tita_numeric_tolerance?: number | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "mock_passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mock_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_responses: {
        Row: {
          attempt_id: string
          first_visited_at: string | null
          id: string
          is_correct: boolean | null
          last_updated_at: string
          marks_awarded: number | null
          question_id: string
          section_id: string
          selected_option_id: string | null
          status: Database["public"]["Enums"]["mock_response_status"]
          time_spent_seconds: number
          tita_answer: string | null
          visit_count: number
        }
        Insert: {
          attempt_id: string
          first_visited_at?: string | null
          id?: string
          is_correct?: boolean | null
          last_updated_at?: string
          marks_awarded?: number | null
          question_id: string
          section_id: string
          selected_option_id?: string | null
          status?: Database["public"]["Enums"]["mock_response_status"]
          time_spent_seconds?: number
          tita_answer?: string | null
          visit_count?: number
        }
        Update: {
          attempt_id?: string
          first_visited_at?: string | null
          id?: string
          is_correct?: boolean | null
          last_updated_at?: string
          marks_awarded?: number | null
          question_id?: string
          section_id?: string
          selected_option_id?: string | null
          status?: Database["public"]["Enums"]["mock_response_status"]
          time_spent_seconds?: number
          tita_answer?: string | null
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_leaderboard"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "mock_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_responses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mock_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "mock_question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_sections: {
        Row: {
          code: Database["public"]["Enums"]["mock_section_code"]
          created_at: string
          duration_minutes: number
          id: string
          name: string
          sort_order: number
          test_id: string
          total_questions: number
        }
        Insert: {
          code: Database["public"]["Enums"]["mock_section_code"]
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          sort_order?: number
          test_id: string
          total_questions?: number
        }
        Update: {
          code?: Database["public"]["Enums"]["mock_section_code"]
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          sort_order?: number
          test_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          access_validity_days: number
          banner_url: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["mock_difficulty"]
          exam_code: string
          generated_by_ai: boolean
          generation_meta: Json
          id: string
          is_live: boolean
          is_published: boolean
          keywords: string[] | null
          launch_date: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price_inr: number
          pricing_type: Database["public"]["Enums"]["mock_pricing_type"]
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          slug: string
          stripe_price_id: string | null
          test_type: Database["public"]["Enums"]["mock_test_type"]
          total_attempts: number
          total_duration_minutes: number
          total_takers: number
          updated_at: string
        }
        Insert: {
          access_validity_days?: number
          banner_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["mock_difficulty"]
          exam_code?: string
          generated_by_ai?: boolean
          generation_meta?: Json
          id?: string
          is_live?: boolean
          is_published?: boolean
          keywords?: string[] | null
          launch_date?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price_inr?: number
          pricing_type?: Database["public"]["Enums"]["mock_pricing_type"]
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          slug: string
          stripe_price_id?: string | null
          test_type?: Database["public"]["Enums"]["mock_test_type"]
          total_attempts?: number
          total_duration_minutes?: number
          total_takers?: number
          updated_at?: string
        }
        Update: {
          access_validity_days?: number
          banner_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["mock_difficulty"]
          exam_code?: string
          generated_by_ai?: boolean
          generation_meta?: Json
          id?: string
          is_live?: boolean
          is_published?: boolean
          keywords?: string[] | null
          launch_date?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price_inr?: number
          pricing_type?: Database["public"]["Enums"]["mock_pricing_type"]
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          slug?: string
          stripe_price_id?: string | null
          test_type?: Database["public"]["Enums"]["mock_test_type"]
          total_attempts?: number
          total_duration_minutes?: number
          total_takers?: number
          updated_at?: string
        }
        Relationships: []
      }
      mocks_landing_settings: {
        Row: {
          ai_report_subtitle: string | null
          ai_report_title: string | null
          auto_testimonials: Json | null
          benefits: Json
          bundle_subtitle: string | null
          bundle_title: string | null
          comparison: Json
          created_at: string
          cta_target_test_id: string | null
          expert_feedback: Json | null
          faqs: Json
          hero_cta_label: string | null
          hero_eyebrow: string | null
          hero_headline: string | null
          hero_image_url: string | null
          hero_subheadline: string | null
          id: string
          meta_description: string | null
          meta_pixel_id: string | null
          meta_title: string | null
          offer_ends_at: string | null
          offer_urgency: string | null
          platform_features: Json | null
          price_current: number | null
          price_discount_label: string | null
          price_original: number | null
          singleton: boolean
          student_analyses: Json | null
          student_feedback_images: Json | null
          student_feedback_text: Json | null
          testimonials: Json
          trust_avg_improvement: string | null
          trust_rating: string | null
          trust_students: string | null
          updated_at: string
          whats_included: Json
          why_us_points: Json | null
          why_us_subtitle: string | null
          why_us_title: string | null
        }
        Insert: {
          ai_report_subtitle?: string | null
          ai_report_title?: string | null
          auto_testimonials?: Json | null
          benefits?: Json
          bundle_subtitle?: string | null
          bundle_title?: string | null
          comparison?: Json
          created_at?: string
          cta_target_test_id?: string | null
          expert_feedback?: Json | null
          faqs?: Json
          hero_cta_label?: string | null
          hero_eyebrow?: string | null
          hero_headline?: string | null
          hero_image_url?: string | null
          hero_subheadline?: string | null
          id?: string
          meta_description?: string | null
          meta_pixel_id?: string | null
          meta_title?: string | null
          offer_ends_at?: string | null
          offer_urgency?: string | null
          platform_features?: Json | null
          price_current?: number | null
          price_discount_label?: string | null
          price_original?: number | null
          singleton?: boolean
          student_analyses?: Json | null
          student_feedback_images?: Json | null
          student_feedback_text?: Json | null
          testimonials?: Json
          trust_avg_improvement?: string | null
          trust_rating?: string | null
          trust_students?: string | null
          updated_at?: string
          whats_included?: Json
          why_us_points?: Json | null
          why_us_subtitle?: string | null
          why_us_title?: string | null
        }
        Update: {
          ai_report_subtitle?: string | null
          ai_report_title?: string | null
          auto_testimonials?: Json | null
          benefits?: Json
          bundle_subtitle?: string | null
          bundle_title?: string | null
          comparison?: Json
          created_at?: string
          cta_target_test_id?: string | null
          expert_feedback?: Json | null
          faqs?: Json
          hero_cta_label?: string | null
          hero_eyebrow?: string | null
          hero_headline?: string | null
          hero_image_url?: string | null
          hero_subheadline?: string | null
          id?: string
          meta_description?: string | null
          meta_pixel_id?: string | null
          meta_title?: string | null
          offer_ends_at?: string | null
          offer_urgency?: string | null
          platform_features?: Json | null
          price_current?: number | null
          price_discount_label?: string | null
          price_original?: number | null
          singleton?: boolean
          student_analyses?: Json | null
          student_feedback_images?: Json | null
          student_feedback_text?: Json | null
          testimonials?: Json
          trust_avg_improvement?: string | null
          trust_rating?: string | null
          trust_students?: string | null
          updated_at?: string
          whats_included?: Json
          why_us_points?: Json | null
          why_us_subtitle?: string | null
          why_us_title?: string | null
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
      page_summary_cache: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          model: string | null
          page_id: string
          page_type: string
          summary: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          model?: string | null
          page_id: string
          page_type: string
          summary: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          model?: string | null
          page_id?: string
          page_type?: string
          summary?: string
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
      programme_courses: {
        Row: {
          accepts_cat: boolean | null
          accepts_cmat: boolean | null
          accepts_gmat: boolean | null
          accepts_gre: boolean | null
          accepts_iift: boolean | null
          accepts_nmat: boolean | null
          accepts_other_exams: string[] | null
          accepts_snap: boolean | null
          accepts_xat: boolean | null
          active: boolean | null
          cat_percentile_target: string | null
          college_id: string
          created_at: string
          duration: string | null
          duration_months: number | null
          evidence_snippet: string | null
          fees_breakdown: string | null
          fees_total_lakhs: number | null
          fees_year: string | null
          gmat_score_target: string | null
          highlights: string[] | null
          id: string
          intake_seats: number | null
          max_age: number | null
          max_work_ex_months: number | null
          min_age: number | null
          min_graduation_percent: number | null
          min_work_ex_months: number | null
          mode: string | null
          name: string
          programme_type: string
          short_name: string | null
          slug: string
          sort_order: number | null
          source_brochure_url: string | null
          source_url: string | null
          source_verified_at: string | null
          specializations: string[] | null
          updated_at: string
          xat_percentile_target: string | null
        }
        Insert: {
          accepts_cat?: boolean | null
          accepts_cmat?: boolean | null
          accepts_gmat?: boolean | null
          accepts_gre?: boolean | null
          accepts_iift?: boolean | null
          accepts_nmat?: boolean | null
          accepts_other_exams?: string[] | null
          accepts_snap?: boolean | null
          accepts_xat?: boolean | null
          active?: boolean | null
          cat_percentile_target?: string | null
          college_id: string
          created_at?: string
          duration?: string | null
          duration_months?: number | null
          evidence_snippet?: string | null
          fees_breakdown?: string | null
          fees_total_lakhs?: number | null
          fees_year?: string | null
          gmat_score_target?: string | null
          highlights?: string[] | null
          id?: string
          intake_seats?: number | null
          max_age?: number | null
          max_work_ex_months?: number | null
          min_age?: number | null
          min_graduation_percent?: number | null
          min_work_ex_months?: number | null
          mode?: string | null
          name: string
          programme_type?: string
          short_name?: string | null
          slug: string
          sort_order?: number | null
          source_brochure_url?: string | null
          source_url?: string | null
          source_verified_at?: string | null
          specializations?: string[] | null
          updated_at?: string
          xat_percentile_target?: string | null
        }
        Update: {
          accepts_cat?: boolean | null
          accepts_cmat?: boolean | null
          accepts_gmat?: boolean | null
          accepts_gre?: boolean | null
          accepts_iift?: boolean | null
          accepts_nmat?: boolean | null
          accepts_other_exams?: string[] | null
          accepts_snap?: boolean | null
          accepts_xat?: boolean | null
          active?: boolean | null
          cat_percentile_target?: string | null
          college_id?: string
          created_at?: string
          duration?: string | null
          duration_months?: number | null
          evidence_snippet?: string | null
          fees_breakdown?: string | null
          fees_total_lakhs?: number | null
          fees_year?: string | null
          gmat_score_target?: string | null
          highlights?: string[] | null
          id?: string
          intake_seats?: number | null
          max_age?: number | null
          max_work_ex_months?: number | null
          min_age?: number | null
          min_graduation_percent?: number | null
          min_work_ex_months?: number | null
          mode?: string | null
          name?: string
          programme_type?: string
          short_name?: string | null
          slug?: string
          sort_order?: number | null
          source_brochure_url?: string | null
          source_url?: string | null
          source_verified_at?: string | null
          specializations?: string[] | null
          updated_at?: string
          xat_percentile_target?: string | null
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
      safe_browsing_flagged_urls: {
        Row: {
          audited_at: string | null
          category: string
          created_at: string
          created_by: string | null
          flagged_reason: string | null
          id: string
          notes: string | null
          reported_at: string
          resolved_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          audited_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          flagged_reason?: string | null
          id?: string
          notes?: string | null
          reported_at?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          audited_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          flagged_reason?: string | null
          id?: string
          notes?: string | null
          reported_at?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          url?: string
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
      student_announcements: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          link_label: string | null
          link_url: string | null
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_badges: {
        Row: {
          badge_description: string | null
          badge_key: string
          badge_name: string
          earned_at: string
          icon: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_key: string
          badge_name: string
          earned_at?: string
          icon?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_key?: string
          badge_name?: string
          earned_at?: string
          icon?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_daily_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_completed: boolean
          section: string | null
          target_value: number | null
          task_date: string
          task_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean
          section?: string | null
          target_value?: number | null
          task_date?: string
          task_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean
          section?: string | null
          target_value?: number | null
          task_date?: string
          task_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      student_daily_test_progress: {
        Row: {
          assigned_date: string
          attempt_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_date: string
          attempt_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_date?: string
          attempt_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_goals: {
        Row: {
          created_at: string
          current_value: number | null
          due_date: string | null
          goal_type: string
          id: string
          is_completed: boolean
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          due_date?: string | null
          goal_type?: string
          id?: string
          is_completed?: boolean
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          due_date?: string | null
          goal_type?: string
          id?: string
          is_completed?: boolean
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_leaderboard_settings: {
        Row: {
          created_at: string
          display_handle: string | null
          is_public: boolean
          target_percentile: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_handle?: string | null
          is_public?: boolean
          target_percentile?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_handle?: string | null
          is_public?: boolean
          target_percentile?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      student_planner_tasks: {
        Row: {
          actual_minutes: number | null
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_minutes: number
          id: string
          notes: string | null
          priority: string
          scheduled_date: string
          scheduled_start_time: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          notes?: string | null
          priority?: string
          scheduled_date?: string
          scheduled_start_time?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          notes?: string | null
          priority?: string
          scheduled_date?: string
          scheduled_start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_rewards: {
        Row: {
          coins: number
          created_at: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          streak_days: number
          total_mocks_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          streak_days?: number
          total_mocks_completed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          streak_days?: number
          total_mocks_completed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      student_study_profile: {
        Row: {
          ai_generated_at: string | null
          ai_insights: Json | null
          ai_plan: Json | null
          attempt_year: number | null
          created_at: string
          current_level: string | null
          daily_hours: number | null
          id: string
          preferred_session: string | null
          strong_sections: string[] | null
          target_colleges: string[] | null
          target_percentile: number | null
          updated_at: string
          user_id: string
          weak_sections: string[] | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_insights?: Json | null
          ai_plan?: Json | null
          attempt_year?: number | null
          created_at?: string
          current_level?: string | null
          daily_hours?: number | null
          id?: string
          preferred_session?: string | null
          strong_sections?: string[] | null
          target_colleges?: string[] | null
          target_percentile?: number | null
          updated_at?: string
          user_id: string
          weak_sections?: string[] | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_insights?: Json | null
          ai_plan?: Json | null
          attempt_year?: number | null
          created_at?: string
          current_level?: string | null
          daily_hours?: number | null
          id?: string
          preferred_session?: string | null
          strong_sections?: string[] | null
          target_colleges?: string[] | null
          target_percentile?: number | null
          updated_at?: string
          user_id?: string
          weak_sections?: string[] | null
        }
        Relationships: []
      }
      student_weak_topics: {
        Row: {
          accuracy: number | null
          attempts: number | null
          created_at: string
          id: string
          last_seen_at: string | null
          level: string
          section: string
          topic: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          attempts?: number | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          level?: string
          section: string
          topic: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          attempts?: number | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          level?: string
          section?: string
          topic?: string
          user_id?: string
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
      mock_leaderboard: {
        Row: {
          all_india_rank: number | null
          attempt_id: string | null
          percentile: number | null
          rank: number | null
          submitted_at: string | null
          test_id: string | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_search_students: {
        Args: { _limit?: number; _query?: string }
        Returns: {
          display_name: string
          email: string
          enrolled_count: number
          phone: string
          user_id: string
        }[]
      }
      assign_admin_by_email: { Args: { _email: string }; Returns: string }
      award_student_rewards: {
        Args: {
          _activity_today?: boolean
          _coins: number
          _user_id: string
          _xp: number
        }
        Returns: {
          coins: number
          created_at: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          streak_days: number
          total_mocks_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "student_rewards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_global_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          coins: number
          display_handle: string
          is_self: boolean
          level: number
          rank: number
          streak_days: number
          total_mocks_completed: number
          user_id: string
          xp: number
        }[]
      }
      get_mock_leaderboard: {
        Args: { _limit?: number; _test_id: string }
        Returns: {
          accuracy: number
          attempt_id: string
          display_name: string
          is_self: boolean
          max_score: number
          percentile: number
          rank: number
          submitted_at: string
          total_attempted: number
          total_correct: number
          total_score: number
          user_id: string
        }[]
      }
      get_today_daily_test: {
        Args: never
        Returns: {
          assigned_date: string
          assignment_id: string
          completed_at: string
          duration: number
          exam_code: string
          my_attempt_id: string
          my_progress_id: string
          note: string
          test_id: string
          test_name: string
          test_slug: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_email: { Args: { _email: string }; Returns: boolean }
      recover_stale_bulk_jobs: {
        Args: { _threshold_minutes?: number }
        Returns: Json
      }
      refresh_bulk_college_job_metrics: {
        Args: { _job_id: string }
        Returns: undefined
      }
      refresh_bulk_section_job_metrics: {
        Args: { _job_id: string }
        Returns: undefined
      }
      user_has_mock_access: {
        Args: { _test_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_listing: {
        Args: { _target_id: string; _target_table: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      mock_attempt_status:
        | "in_progress"
        | "submitted"
        | "auto_submitted"
        | "abandoned"
      mock_difficulty: "easy" | "medium" | "hard"
      mock_payment_status: "pending" | "paid" | "failed" | "refunded"
      mock_pricing_type: "free" | "paid"
      mock_question_type: "mcq" | "tita"
      mock_response_status:
        | "not_visited"
        | "not_answered"
        | "answered"
        | "marked"
        | "answered_marked"
      mock_section_code: "VARC" | "DILR" | "QA"
      mock_test_type: "full_length" | "sectional" | "topic"
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
      mock_attempt_status: [
        "in_progress",
        "submitted",
        "auto_submitted",
        "abandoned",
      ],
      mock_difficulty: ["easy", "medium", "hard"],
      mock_payment_status: ["pending", "paid", "failed", "refunded"],
      mock_pricing_type: ["free", "paid"],
      mock_question_type: ["mcq", "tita"],
      mock_response_status: [
        "not_visited",
        "not_answered",
        "answered",
        "marked",
        "answered_marked",
      ],
      mock_section_code: ["VARC", "DILR", "QA"],
      mock_test_type: ["full_length", "sectional", "topic"],
    },
  },
} as const

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
      ad_campaigns: {
        Row: {
          ab_test: string | null
          ad_code: string
          ad_type: string
          alt_text: string | null
          body: string | null
          cap_per_day: number
          cap_per_session: number
          conversion_path: string | null
          created_at: string
          creative_variants: Json
          cta_text: string | null
          daily_impression_budget: number
          desktop_image_url: string | null
          destination_url: string
          devices: string
          end_at: string | null
          exclude_paths: string[]
          goal_end_at: string | null
          headline: string | null
          html_content: string | null
          id: string
          impression_budget: number
          include_paths: string[]
          is_exclusive: boolean
          is_fallback: boolean
          is_house: boolean
          keywords: string[]
          max_per_page: number
          min_paragraph_gap: number
          mobile_image_url: string | null
          name: string
          pacing: string
          page_types: string[]
          placements: string[]
          priority: number
          schedule_days: number[]
          schedule_end_hour: number | null
          schedule_start_hour: number | null
          smart_mode: boolean
          smart_plan: Json
          start_at: string | null
          status: string
          updated_at: string
          weight: number
        }
        Insert: {
          ab_test?: string | null
          ad_code?: string
          ad_type?: string
          alt_text?: string | null
          body?: string | null
          cap_per_day?: number
          cap_per_session?: number
          conversion_path?: string | null
          created_at?: string
          creative_variants?: Json
          cta_text?: string | null
          daily_impression_budget?: number
          desktop_image_url?: string | null
          destination_url: string
          devices?: string
          end_at?: string | null
          exclude_paths?: string[]
          goal_end_at?: string | null
          headline?: string | null
          html_content?: string | null
          id?: string
          impression_budget?: number
          include_paths?: string[]
          is_exclusive?: boolean
          is_fallback?: boolean
          is_house?: boolean
          keywords?: string[]
          max_per_page?: number
          min_paragraph_gap?: number
          mobile_image_url?: string | null
          name: string
          pacing?: string
          page_types?: string[]
          placements?: string[]
          priority?: number
          schedule_days?: number[]
          schedule_end_hour?: number | null
          schedule_start_hour?: number | null
          smart_mode?: boolean
          smart_plan?: Json
          start_at?: string | null
          status?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          ab_test?: string | null
          ad_code?: string
          ad_type?: string
          alt_text?: string | null
          body?: string | null
          cap_per_day?: number
          cap_per_session?: number
          conversion_path?: string | null
          created_at?: string
          creative_variants?: Json
          cta_text?: string | null
          daily_impression_budget?: number
          desktop_image_url?: string | null
          destination_url?: string
          devices?: string
          end_at?: string | null
          exclude_paths?: string[]
          goal_end_at?: string | null
          headline?: string | null
          html_content?: string | null
          id?: string
          impression_budget?: number
          include_paths?: string[]
          is_exclusive?: boolean
          is_fallback?: boolean
          is_house?: boolean
          keywords?: string[]
          max_per_page?: number
          min_paragraph_gap?: number
          mobile_image_url?: string | null
          name?: string
          pacing?: string
          page_types?: string[]
          placements?: string[]
          priority?: number
          schedule_days?: number[]
          schedule_end_hour?: number | null
          schedule_start_hour?: number | null
          smart_mode?: boolean
          smart_plan?: Json
          start_at?: string | null
          status?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          campaign_id: string
          created_at: string
          device: string | null
          event_type: string
          id: number
          page_path: string | null
          placement: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          device?: string | null
          event_type: string
          id?: number
          page_path?: string | null
          placement?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          device?: string | null
          event_type?: string
          id?: number
          page_path?: string | null
          placement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_settings: {
        Row: {
          ads_per_1000_words: number
          allow_popup: boolean
          enabled: boolean
          excluded_paths: string[]
          homepage_section_ads: number
          id: number
          label_text: string
          length_tiers: Json
          max_ads_per_page: number
          page_section_ads: number
          popup_delay_seconds: number
          popup_per_day: number
          popup_per_session: number
          sidebar_gap_px: number
          sidebar_stack_size: number
          sidebar_sticky: boolean
          updated_at: string
        }
        Insert: {
          ads_per_1000_words?: number
          allow_popup?: boolean
          enabled?: boolean
          excluded_paths?: string[]
          homepage_section_ads?: number
          id?: number
          label_text?: string
          length_tiers?: Json
          max_ads_per_page?: number
          page_section_ads?: number
          popup_delay_seconds?: number
          popup_per_day?: number
          popup_per_session?: number
          sidebar_gap_px?: number
          sidebar_stack_size?: number
          sidebar_sticky?: boolean
          updated_at?: string
        }
        Update: {
          ads_per_1000_words?: number
          allow_popup?: boolean
          enabled?: boolean
          excluded_paths?: string[]
          homepage_section_ads?: number
          id?: number
          label_text?: string
          length_tiers?: Json
          max_ads_per_page?: number
          page_section_ads?: number
          popup_delay_seconds?: number
          popup_per_day?: number
          popup_per_session?: number
          sidebar_gap_px?: number
          sidebar_stack_size?: number
          sidebar_sticky?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ad_slot_requests: {
        Row: {
          created_at: string
          device: string | null
          filled: boolean
          id: number
          page_path: string | null
          placement: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          filled: boolean
          id?: number
          page_path?: string | null
          placement: string
        }
        Update: {
          created_at?: string
          device?: string | null
          filled?: boolean
          id?: number
          page_path?: string | null
          placement?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          allowed_sections: string[]
          created_at: string
          display_name: string
          email: string
          id: string
          is_full_access: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_sections?: string[]
          created_at?: string
          display_name: string
          email: string
          id?: string
          is_full_access?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_sections?: string[]
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_full_access?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_blog_generation_jobs: {
        Row: {
          article_id: string | null
          brief: Json
          created_at: string
          current_step: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          progress: number
          started_at: string | null
          stats: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          brief?: Json
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          started_at?: string | null
          stats?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          brief?: Json
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          started_at?: string | null
          stats?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_blog_generation_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
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
      api_credential_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          key_name: string
          new_value_masked: string | null
          old_value_masked: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          key_name: string
          new_value_masked?: string | null
          old_value_masked?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          key_name?: string
          new_value_masked?: string | null
          old_value_masked?: string | null
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key_name: string
          key_value: string
          last_used_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key_name: string
          key_value?: string
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key_name?: string
          key_value?: string
          last_used_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      application_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json
          student_email: string | null
          student_name: string | null
          tracker_id: string | null
          tracker_name: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json
          student_email?: string | null
          student_name?: string | null
          tracker_id?: string | null
          tracker_name?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          student_email?: string | null
          student_name?: string | null
          tracker_id?: string | null
          tracker_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_activity_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "application_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      application_filter_prefs: {
        Row: {
          category: string | null
          created_at: string
          deadline_filter: string | null
          exam: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deadline_filter?: string | null
          exam?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deadline_filter?: string | null
          exam?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_trackers: {
        Row: {
          accepted_exams: string[]
          application_deadline: string | null
          application_fee: number | null
          application_open_date: string | null
          apply_click_count: number
          apply_url: string | null
          average_package: number | null
          category: string
          college_website: string | null
          created_at: string
          cutoff_note: string | null
          deadline_tbd: boolean
          details_html: string | null
          display_order: number
          eligibility: string | null
          highest_package: number | null
          homepage_order: number
          id: string
          inside_info_notes: string | null
          inside_info_url: string | null
          is_active: boolean
          is_archived: boolean
          is_homepage_featured: boolean
          is_recommended: boolean
          location: string | null
          logo_url: string | null
          median_package: number | null
          name: string
          program: string | null
          program_fee: number | null
          programs: string[]
          recommendation_label: string | null
          recommendation_note: string | null
          recommendation_priority: number
          selection_process: string | null
          seo_description: string | null
          seo_faqs: Json
          seo_h1: string | null
          seo_image_alt: string | null
          seo_intro: string | null
          seo_keywords: string[]
          seo_title: string | null
          short_description: string | null
          short_name: string | null
          slug: string
          sort_order: number
          status: string
          tier: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          accepted_exams?: string[]
          application_deadline?: string | null
          application_fee?: number | null
          application_open_date?: string | null
          apply_click_count?: number
          apply_url?: string | null
          average_package?: number | null
          category?: string
          college_website?: string | null
          created_at?: string
          cutoff_note?: string | null
          deadline_tbd?: boolean
          details_html?: string | null
          display_order?: number
          eligibility?: string | null
          highest_package?: number | null
          homepage_order?: number
          id?: string
          inside_info_notes?: string | null
          inside_info_url?: string | null
          is_active?: boolean
          is_archived?: boolean
          is_homepage_featured?: boolean
          is_recommended?: boolean
          location?: string | null
          logo_url?: string | null
          median_package?: number | null
          name: string
          program?: string | null
          program_fee?: number | null
          programs?: string[]
          recommendation_label?: string | null
          recommendation_note?: string | null
          recommendation_priority?: number
          selection_process?: string | null
          seo_description?: string | null
          seo_faqs?: Json
          seo_h1?: string | null
          seo_image_alt?: string | null
          seo_intro?: string | null
          seo_keywords?: string[]
          seo_title?: string | null
          short_description?: string | null
          short_name?: string | null
          slug: string
          sort_order?: number
          status?: string
          tier?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          accepted_exams?: string[]
          application_deadline?: string | null
          application_fee?: number | null
          application_open_date?: string | null
          apply_click_count?: number
          apply_url?: string | null
          average_package?: number | null
          category?: string
          college_website?: string | null
          created_at?: string
          cutoff_note?: string | null
          deadline_tbd?: boolean
          details_html?: string | null
          display_order?: number
          eligibility?: string | null
          highest_package?: number | null
          homepage_order?: number
          id?: string
          inside_info_notes?: string | null
          inside_info_url?: string | null
          is_active?: boolean
          is_archived?: boolean
          is_homepage_featured?: boolean
          is_recommended?: boolean
          location?: string | null
          logo_url?: string | null
          median_package?: number | null
          name?: string
          program?: string | null
          program_fee?: number | null
          programs?: string[]
          recommendation_label?: string | null
          recommendation_note?: string | null
          recommendation_priority?: number
          selection_process?: string | null
          seo_description?: string | null
          seo_faqs?: Json
          seo_h1?: string | null
          seo_image_alt?: string | null
          seo_intro?: string | null
          seo_keywords?: string[]
          seo_title?: string | null
          short_description?: string | null
          short_name?: string | null
          slug?: string
          sort_order?: number
          status?: string
          tier?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      article_display_jobs: {
        Row: {
          article_id: string
          requested_at: string
          source_content: string
          token: string
        }
        Insert: {
          article_id: string
          requested_at?: string
          source_content?: string
          token?: string
        }
        Update: {
          article_id?: string
          requested_at?: string
          source_content?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_display_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
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
          content_chars: number | null
          content_hash: string | null
          content_score: number | null
          created_at: string
          excerpt: string | null
          faqs: Json | null
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
          mobile_banner_url: string | null
          prepared_display: Json | null
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
          content_chars?: number | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          excerpt?: string | null
          faqs?: Json | null
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
          mobile_banner_url?: string | null
          prepared_display?: Json | null
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
          content_chars?: number | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          excerpt?: string | null
          faqs?: Json | null
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
          mobile_banner_url?: string | null
          prepared_display?: Json | null
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
      bulk_course_items: {
        Row: {
          course_names: Json
          courses_failed: number
          courses_found: number
          courses_saved: number
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          institute_id: string
          institute_name: string
          job_id: string
          progress_step: string | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          course_names?: Json
          courses_failed?: number
          courses_found?: number
          courses_saved?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          institute_id: string
          institute_name: string
          job_id: string
          progress_step?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          course_names?: Json
          courses_failed?: number
          courses_found?: number
          courses_saved?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          institute_id?: string
          institute_name?: string
          job_id?: string
          progress_step?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_course_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_course_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_course_jobs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string | null
          options: Json
          status: string
          total_institutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          options?: Json
          status?: string
          total_institutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          options?: Json
          status?: string
          total_institutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      bulk_mock_request_items: {
        Row: {
          category: string
          created_at: string
          error_message: string | null
          exam_code: string
          finished_at: string | null
          generation_id: string | null
          id: string
          level: string
          paused: boolean
          questions_per_set: number
          request_id: string
          retry_count: number
          section_code: string | null
          sets: number
          started_at: string | null
          status: string
          test_name_prefix: string | null
          topic: string | null
          total_generated: number
          total_requested: number
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          category: string
          created_at?: string
          error_message?: string | null
          exam_code: string
          finished_at?: string | null
          generation_id?: string | null
          id?: string
          level?: string
          paused?: boolean
          questions_per_set?: number
          request_id: string
          retry_count?: number
          section_code?: string | null
          sets?: number
          started_at?: string | null
          status?: string
          test_name_prefix?: string | null
          topic?: string | null
          total_generated?: number
          total_requested?: number
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          error_message?: string | null
          exam_code?: string
          finished_at?: string | null
          generation_id?: string | null
          id?: string
          level?: string
          paused?: boolean
          questions_per_set?: number
          request_id?: string
          retry_count?: number
          section_code?: string | null
          sets?: number
          started_at?: string | null
          status?: string
          test_name_prefix?: string | null
          topic?: string | null
          total_generated?: number
          total_requested?: number
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_mock_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bulk_mock_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_mock_requests: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string | null
          status: string
          total_items: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          status?: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          status?: string
          total_items?: number
          updated_at?: string
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
      bulk_seo_items: {
        Row: {
          cost_credits: number | null
          created_at: string
          error_message: string | null
          fields_filled: number | null
          finished_at: string | null
          id: string
          job_id: string
          progress_step: string | null
          retry_count: number
          seo_score: number | null
          started_at: string | null
          status: string
          target_id: string
          target_name: string | null
          target_type: string
          tokens_used: number | null
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          fields_filled?: number | null
          finished_at?: string | null
          id?: string
          job_id: string
          progress_step?: string | null
          retry_count?: number
          seo_score?: number | null
          started_at?: string | null
          status?: string
          target_id: string
          target_name?: string | null
          target_type: string
          tokens_used?: number | null
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          fields_filled?: number | null
          finished_at?: string | null
          id?: string
          job_id?: string
          progress_step?: string | null
          retry_count?: number
          seo_score?: number | null
          started_at?: string | null
          status?: string
          target_id?: string
          target_name?: string | null
          target_type?: string
          tokens_used?: number | null
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_seo_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_seo_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_seo_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          options: Json
          status: string
          target_type: string
          total_items: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          options?: Json
          status?: string
          target_type: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          options?: Json
          status?: string
          target_type?: string
          total_items?: number
          updated_at?: string
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          faqs: Json | null
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
          faqs?: Json | null
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
          faqs?: Json | null
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
          faqs: Json | null
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
          faqs?: Json | null
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
          faqs?: Json | null
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
            foreignKeyName: "college_sections_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges_listing_cache"
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
          description_short: string | null
          established: number | null
          exams_accepted: string[] | null
          faqs: Json | null
          fees: string | null
          fees_lakhs: number | null
          funnel_stage: string | null
          h1_tag: string | null
          highlights: Json | null
          id: string
          keywords: string[] | null
          last_seo_refresh: string | null
          last_updated_by: string | null
          listing_sort_order: number | null
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
          description_short?: string | null
          established?: number | null
          exams_accepted?: string[] | null
          faqs?: Json | null
          fees?: string | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          highlights?: Json | null
          id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          listing_sort_order?: number | null
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
          description_short?: string | null
          established?: number | null
          exams_accepted?: string[] | null
          faqs?: Json | null
          fees?: string | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          highlights?: Json | null
          id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          listing_sort_order?: number | null
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
      content_magic_links: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          entity_id: string
          entity_slug: string | null
          entity_title: string | null
          entity_type: string
          expires_at: string | null
          id: string
          last_opened_at: string | null
          last_saved_at: string | null
          note: string | null
          opened_count: number
          saved_count: number
          token: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_slug?: string | null
          entity_title?: string | null
          entity_type: string
          expires_at?: string | null
          id?: string
          last_opened_at?: string | null
          last_saved_at?: string | null
          note?: string | null
          opened_count?: number
          saved_count?: number
          token?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_slug?: string | null
          entity_title?: string | null
          entity_type?: string
          expires_at?: string | null
          id?: string
          last_opened_at?: string | null
          last_saved_at?: string | null
          note?: string | null
          opened_count?: number
          saved_count?: number
          token?: string
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
      course_bundles: {
        Row: {
          bundle_id: string
          course_id: string
          created_at: string
          sort_order: number
        }
        Insert: {
          bundle_id: string
          course_id: string
          created_at?: string
          sort_order?: number
        }
        Update: {
          bundle_id?: string
          course_id?: string
          created_at?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_bundles_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "mock_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bundles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mba_compass_courses"
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
          canonical_url: string | null
          course_category_id: string | null
          created_at: string
          curriculum: string[] | null
          demo_video_url: string | null
          description: string | null
          discount_text: string | null
          duration: string | null
          eligibility: string | null
          enrolled_count: number | null
          faqs: Json | null
          fees: number | null
          h1_tag: string | null
          highlights: string[] | null
          id: string
          institute_id: string
          keywords: string[] | null
          last_seo_refresh: string | null
          long_tail_keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          mode: string | null
          name: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          primary_keyword: string | null
          rating: number | null
          schema_jsonld: Json | null
          seo_score: number | null
          slug: string | null
          start_date: string | null
          syllabus_url: string | null
          total_seats: number | null
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
        }
        Insert: {
          batch_info?: string | null
          brochure_url?: string | null
          canonical_url?: string | null
          course_category_id?: string | null
          created_at?: string
          curriculum?: string[] | null
          demo_video_url?: string | null
          description?: string | null
          discount_text?: string | null
          duration?: string | null
          eligibility?: string | null
          enrolled_count?: number | null
          faqs?: Json | null
          fees?: number | null
          h1_tag?: string | null
          highlights?: string[] | null
          id?: string
          institute_id: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          long_tail_keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          name: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          primary_keyword?: string | null
          rating?: number | null
          schema_jsonld?: Json | null
          seo_score?: number | null
          slug?: string | null
          start_date?: string | null
          syllabus_url?: string | null
          total_seats?: number | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Update: {
          batch_info?: string | null
          brochure_url?: string | null
          canonical_url?: string | null
          course_category_id?: string | null
          created_at?: string
          curriculum?: string[] | null
          demo_video_url?: string | null
          description?: string | null
          discount_text?: string | null
          duration?: string | null
          eligibility?: string | null
          enrolled_count?: number | null
          faqs?: Json | null
          fees?: number | null
          h1_tag?: string | null
          highlights?: string[] | null
          id?: string
          institute_id?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          long_tail_keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          name?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          primary_keyword?: string | null
          rating?: number | null
          schema_jsonld?: Json | null
          seo_score?: number | null
          slug?: string | null
          start_date?: string | null
          syllabus_url?: string | null
          total_seats?: number | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
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
      cta_events: {
        Row: {
          context: Json | null
          created_at: string
          cta_key: string
          id: string
          outcome: string
          page_path: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          cta_key: string
          id?: string
          outcome: string
          page_path?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          cta_key?: string
          id?: string
          outcome?: string
          page_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cta_settings: {
        Row: {
          category: string
          created_at: string
          cta_key: string
          description: string | null
          id: string
          label: string
          location_hint: string | null
          requires_login: boolean
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          cta_key: string
          description?: string | null
          id?: string
          label: string
          location_hint?: string | null
          requires_login?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          cta_key?: string
          description?: string | null
          id?: string
          label?: string
          location_hint?: string | null
          requires_login?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ctr_optimizations: {
        Row: {
          action: string
          applied_at: string
          applied_by: string | null
          id: string
          new_description: string | null
          new_title: string | null
          old_description: string | null
          old_title: string | null
          page_type: string | null
          page_url: string
          payload: Json | null
          slug: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          applied_at?: string
          applied_by?: string | null
          id?: string
          new_description?: string | null
          new_title?: string | null
          old_description?: string | null
          old_title?: string | null
          page_type?: string | null
          page_url: string
          payload?: Json | null
          slug?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          applied_at?: string
          applied_by?: string | null
          id?: string
          new_description?: string | null
          new_title?: string | null
          old_description?: string | null
          old_title?: string | null
          page_type?: string | null
          page_url?: string
          payload?: Json | null
          slug?: string | null
          table_name?: string | null
        }
        Relationships: []
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
      decay_pages: {
        Row: {
          click_change_pct: number | null
          clicks_current: number
          clicks_previous: number
          created_at: string
          ctr_current: number
          ctr_previous: number
          days_since_update: number | null
          decay_state: string
          decay_type: string | null
          first_detected_at: string | null
          id: string
          impression_change_pct: number | null
          impressions_current: number
          impressions_previous: number
          monitoring: boolean
          page_name: string | null
          page_type: string | null
          path: string
          position_change: number | null
          position_current: number | null
          position_previous: number | null
          recovery_potential: number
          run_id: string | null
          severity: string
          source_field: string | null
          source_id: string | null
          source_table: string | null
          stale_signals: Json
          updated_at: string
        }
        Insert: {
          click_change_pct?: number | null
          clicks_current?: number
          clicks_previous?: number
          created_at?: string
          ctr_current?: number
          ctr_previous?: number
          days_since_update?: number | null
          decay_state?: string
          decay_type?: string | null
          first_detected_at?: string | null
          id?: string
          impression_change_pct?: number | null
          impressions_current?: number
          impressions_previous?: number
          monitoring?: boolean
          page_name?: string | null
          page_type?: string | null
          path: string
          position_change?: number | null
          position_current?: number | null
          position_previous?: number | null
          recovery_potential?: number
          run_id?: string | null
          severity?: string
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          stale_signals?: Json
          updated_at?: string
        }
        Update: {
          click_change_pct?: number | null
          clicks_current?: number
          clicks_previous?: number
          created_at?: string
          ctr_current?: number
          ctr_previous?: number
          days_since_update?: number | null
          decay_state?: string
          decay_type?: string | null
          first_detected_at?: string | null
          id?: string
          impression_change_pct?: number | null
          impressions_current?: number
          impressions_previous?: number
          monitoring?: boolean
          page_name?: string | null
          page_type?: string | null
          path?: string
          position_change?: number | null
          position_current?: number | null
          position_previous?: number | null
          recovery_potential?: number
          run_id?: string | null
          severity?: string
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          stale_signals?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decay_pages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "decay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      decay_recommendations: {
        Row: {
          action: string
          applied_at: string | null
          approved_at: string | null
          confidence: number | null
          created_at: string
          decay_page_id: string | null
          error: string | null
          expected_impact: string | null
          id: string
          keyword_gaps: Json
          outdated_facts: Json
          page_name: string | null
          path: string
          priority: string
          problem: string | null
          rationale: string | null
          refresh_brief: string | null
          refresh_id: string | null
          run_id: string | null
          score: number
          sections: Json
          seo_impact: string | null
          source_field: string | null
          source_id: string | null
          source_table: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action?: string
          applied_at?: string | null
          approved_at?: string | null
          confidence?: number | null
          created_at?: string
          decay_page_id?: string | null
          error?: string | null
          expected_impact?: string | null
          id?: string
          keyword_gaps?: Json
          outdated_facts?: Json
          page_name?: string | null
          path: string
          priority?: string
          problem?: string | null
          rationale?: string | null
          refresh_brief?: string | null
          refresh_id?: string | null
          run_id?: string | null
          score?: number
          sections?: Json
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          applied_at?: string | null
          approved_at?: string | null
          confidence?: number | null
          created_at?: string
          decay_page_id?: string | null
          error?: string | null
          expected_impact?: string | null
          id?: string
          keyword_gaps?: Json
          outdated_facts?: Json
          page_name?: string | null
          path?: string
          priority?: string
          problem?: string | null
          rationale?: string | null
          refresh_brief?: string | null
          refresh_id?: string | null
          run_id?: string | null
          score?: number
          sections?: Json
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decay_recommendations_decay_page_id_fkey"
            columns: ["decay_page_id"]
            isOneToOne: false
            referencedRelation: "decay_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decay_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "decay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      decay_runs: {
        Row: {
          approved: number
          created_at: string
          declining: number
          error: string | null
          finished_at: string | null
          id: string
          notes: Json
          pages_checked: number
          queued_refreshes: number
          recommendations: number
          stage: string | null
          started_at: string
          status: string
        }
        Insert: {
          approved?: number
          created_at?: string
          declining?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: Json
          pages_checked?: number
          queued_refreshes?: number
          recommendations?: number
          stage?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          approved?: number
          created_at?: string
          declining?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: Json
          pages_checked?: number
          queued_refreshes?: number
          recommendations?: number
          stage?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      demo_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          referrer: string | null
          source: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          click_count: number
          email: string
          error: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          is_test_inbox: boolean
          message_id: string
          name: string | null
          open_count: number
          payload: Json | null
          placement: string | null
          queued_at: string | null
          status: string
          tracking_token: string
        }
        Insert: {
          campaign_id: string
          click_count?: number
          email: string
          error?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          is_test_inbox?: boolean
          message_id: string
          name?: string | null
          open_count?: number
          payload?: Json | null
          placement?: string | null
          queued_at?: string | null
          status?: string
          tracking_token: string
        }
        Update: {
          campaign_id?: string
          click_count?: number
          email?: string
          error?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          is_test_inbox?: boolean
          message_id?: string
          name?: string | null
          open_count?: number
          payload?: Json | null
          placement?: string | null
          queued_at?: string | null
          status?: string
          tracking_token?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          audience: string
          batch_size: number
          body: string
          body_html: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ctas: Json
          failed_count: number
          from_name: string | null
          heading: string | null
          id: string
          interval_seconds: number
          last_error: string | null
          list_id: string | null
          list_name: string | null
          name: string | null
          next_send_at: string | null
          recipient_count: number
          sender_identity_id: string | null
          sender_label: string | null
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          template_id: string | null
          template_name: string | null
        }
        Insert: {
          audience: string
          batch_size?: number
          body: string
          body_html?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ctas?: Json
          failed_count?: number
          from_name?: string | null
          heading?: string | null
          id?: string
          interval_seconds?: number
          last_error?: string | null
          list_id?: string | null
          list_name?: string | null
          name?: string | null
          next_send_at?: string | null
          recipient_count?: number
          sender_identity_id?: string | null
          sender_label?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          template_name?: string | null
        }
        Update: {
          audience?: string
          batch_size?: number
          body?: string
          body_html?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ctas?: Json
          failed_count?: number
          from_name?: string | null
          heading?: string | null
          id?: string
          interval_seconds?: number
          last_error?: string | null
          list_id?: string | null
          list_name?: string | null
          name?: string | null
          next_send_at?: string | null
          recipient_count?: number
          sender_identity_id?: string | null
          sender_label?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_sender_identity_id_fkey"
            columns: ["sender_identity_id"]
            isOneToOne: false
            referencedRelation: "email_sender_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contact_lists: {
        Row: {
          consent_confirmed: boolean
          contact_count: number
          created_at: string
          created_by: string | null
          id: string
          is_test_inbox: boolean
          name: string
          variables: string[]
        }
        Insert: {
          consent_confirmed?: boolean
          contact_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_test_inbox?: boolean
          name: string
          variables?: string[]
        }
        Update: {
          consent_confirmed?: boolean
          contact_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_test_inbox?: boolean
          name?: string
          variables?: string[]
        }
        Relationships: []
      }
      email_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          list_id: string
          name: string | null
          vars: Json
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          list_id: string
          name?: string | null
          vars?: Json
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          list_id?: string
          name?: string | null
          vars?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          campaign_global_daily_cap: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          skip_unengaged_after: number
          transactional_email_ttl_minutes: number
          updated_at: string
          warmup_enabled: boolean
          warmup_start_cap: number
          warmup_started_on: string
          warmup_step_days: number
          warmup_step_pct: number
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          campaign_global_daily_cap?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          skip_unengaged_after?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
          warmup_enabled?: boolean
          warmup_start_cap?: number
          warmup_started_on?: string
          warmup_step_days?: number
          warmup_step_pct?: number
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          campaign_global_daily_cap?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          skip_unengaged_after?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
          warmup_enabled?: boolean
          warmup_start_cap?: number
          warmup_started_on?: string
          warmup_step_days?: number
          warmup_step_pct?: number
        }
        Relationships: []
      }
      email_sender_identities: {
        Row: {
          created_at: string
          daily_cap: number
          from_name: string
          id: string
          key: string
          label: string
          local_part: string
          match_keywords: string[]
          max_bounce_pct: number
          max_complaint_pct: number
          min_sample: number
          paused_at: string | null
          paused_reason: string | null
          purpose: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_cap?: number
          from_name: string
          id?: string
          key: string
          label: string
          local_part: string
          match_keywords?: string[]
          max_bounce_pct?: number
          max_complaint_pct?: number
          min_sample?: number
          paused_at?: string | null
          paused_reason?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_cap?: number
          from_name?: string
          id?: string
          key?: string
          label?: string
          local_part?: string
          match_keywords?: string[]
          max_bounce_pct?: number
          max_complaint_pct?: number
          min_sample?: number
          paused_at?: string | null
          paused_reason?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          ctas: Json
          from_name: string | null
          heading: string | null
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          ctas?: Json
          from_name?: string | null
          heading?: string | null
          id?: string
          name: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          ctas?: Json
          from_name?: string | null
          heading?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_tracking_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          recipient_id: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          recipient_id: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          recipient_id?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entity_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          path: string | null
          recommendation_id: string | null
          revert_payload: Json | null
          reverted_at: string | null
          run_id: string | null
          source_field: string | null
          source_id: string | null
          source_table: string | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          path?: string | null
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          path?: string | null
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
        }
        Relationships: []
      }
      entity_recommendations: {
        Row: {
          action: string
          applied_at: string | null
          auto_applied: boolean
          confidence: number | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          error: string | null
          expected_impact: string | null
          id: string
          page_name: string | null
          page_type: string | null
          path: string
          payload: Json
          priority: string
          problem: string | null
          rationale: string | null
          run_id: string | null
          score: number
          seo_impact: string | null
          source_field: string | null
          source_id: string | null
          source_table: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          applied_at?: string | null
          auto_applied?: boolean
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          error?: string | null
          expected_impact?: string | null
          id?: string
          page_name?: string | null
          page_type?: string | null
          path: string
          payload?: Json
          priority?: string
          problem?: string | null
          rationale?: string | null
          run_id?: string | null
          score?: number
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          applied_at?: string | null
          auto_applied?: boolean
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          error?: string | null
          expected_impact?: string | null
          id?: string
          page_name?: string | null
          page_type?: string | null
          path?: string
          payload?: Json
          priority?: string
          problem?: string | null
          rationale?: string | null
          run_id?: string | null
          score?: number
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_recommendations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "seo_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "entity_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_runs: {
        Row: {
          applied: number
          created_at: string
          entities_total: number
          error: string | null
          finished_at: string | null
          id: string
          notes: Json
          pages_scanned: number
          recommendations: number
          stage: string | null
          started_at: string
          status: string
        }
        Insert: {
          applied?: number
          created_at?: string
          entities_total?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: Json
          pages_scanned?: number
          recommendations?: number
          stage?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          applied?: number
          created_at?: string
          entities_total?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: Json
          pages_scanned?: number
          recommendations?: number
          stage?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      exam_backfill_items: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          exam_id: string | null
          exam_name: string
          exam_slug: string | null
          exam_year: number | null
          fields_filled: number
          finished_at: string | null
          gaps: Json
          gaps_after: number
          gaps_before: number
          id: string
          job_id: string
          log: Json
          official_website: string | null
          passes: number
          research: Json | null
          started_at: string | null
          status: string
          step: string | null
          tokens_used: number
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          exam_id?: string | null
          exam_name: string
          exam_slug?: string | null
          exam_year?: number | null
          fields_filled?: number
          finished_at?: string | null
          gaps?: Json
          gaps_after?: number
          gaps_before?: number
          id?: string
          job_id: string
          log?: Json
          official_website?: string | null
          passes?: number
          research?: Json | null
          started_at?: string | null
          status?: string
          step?: string | null
          tokens_used?: number
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          exam_id?: string | null
          exam_name?: string
          exam_slug?: string | null
          exam_year?: number | null
          fields_filled?: number
          finished_at?: string | null
          gaps?: Json
          gaps_after?: number
          gaps_before?: number
          id?: string
          job_id?: string
          log?: Json
          official_website?: string | null
          passes?: number
          research?: Json | null
          started_at?: string | null
          status?: string
          step?: string | null
          tokens_used?: number
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_backfill_items_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_backfill_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "exam_backfill_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_backfill_jobs: {
        Row: {
          completed: number
          created_at: string
          created_by: string | null
          failed: number
          fields_filled: number
          finished_at: string | null
          id: string
          label: string | null
          status: string
          tokens_used: number
          total: number
          updated_at: string
        }
        Insert: {
          completed?: number
          created_at?: string
          created_by?: string | null
          failed?: number
          fields_filled?: number
          finished_at?: string | null
          id?: string
          label?: string | null
          status?: string
          tokens_used?: number
          total?: number
          updated_at?: string
        }
        Update: {
          completed?: number
          created_at?: string
          created_by?: string | null
          failed?: number
          fields_filled?: number
          finished_at?: string | null
          id?: string
          label?: string | null
          status?: string
          tokens_used?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      exam_generation_jobs: {
        Row: {
          attempts: number
          auto_publish: boolean
          batch_id: string | null
          batch_label: string | null
          created_at: string
          created_by: string | null
          draft_id: string | null
          error: string | null
          exam_category: string | null
          exam_id: string | null
          exam_name: string
          exam_year: number | null
          finished_at: string | null
          id: string
          log: Json
          mode: string
          notes: string | null
          official_website: string | null
          published_slug: string | null
          result: Json | null
          review_status: string
          reviewed_at: string | null
          sort_order: number | null
          sources: Json | null
          status: string
          step: string | null
          steps_done: number
          steps_total: number
          tokens_used: number
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          attempts?: number
          auto_publish?: boolean
          batch_id?: string | null
          batch_label?: string | null
          created_at?: string
          created_by?: string | null
          draft_id?: string | null
          error?: string | null
          exam_category?: string | null
          exam_id?: string | null
          exam_name: string
          exam_year?: number | null
          finished_at?: string | null
          id?: string
          log?: Json
          mode?: string
          notes?: string | null
          official_website?: string | null
          published_slug?: string | null
          result?: Json | null
          review_status?: string
          reviewed_at?: string | null
          sort_order?: number | null
          sources?: Json | null
          status?: string
          step?: string | null
          steps_done?: number
          steps_total?: number
          tokens_used?: number
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          attempts?: number
          auto_publish?: boolean
          batch_id?: string | null
          batch_label?: string | null
          created_at?: string
          created_by?: string | null
          draft_id?: string | null
          error?: string | null
          exam_category?: string | null
          exam_id?: string | null
          exam_name?: string
          exam_year?: number | null
          finished_at?: string | null
          id?: string
          log?: Json
          mode?: string
          notes?: string | null
          official_website?: string | null
          published_slug?: string | null
          result?: Json | null
          review_status?: string
          reviewed_at?: string | null
          sort_order?: number | null
          sources?: Json | null
          status?: string
          step?: string | null
          steps_done?: number
          steps_total?: number
          tokens_used?: number
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: []
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
          duration: string | null
          eligibility: string | null
          exam_category: string | null
          exam_date: string | null
          exam_level: string | null
          exam_mode: string | null
          exam_status: string | null
          exam_year: number | null
          faqs: Json | null
          frequency: string | null
          full_name: string | null
          funnel_stage: string | null
          h1_tag: string | null
          id: string
          important_dates: Json | null
          keywords: string[] | null
          last_seo_refresh: string | null
          listing_sort_order: number | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          official_website: string | null
          pattern: Json | null
          primary_keyword: string | null
          registration_deadline: string | null
          registration_status: string | null
          reviewed_by: string | null
          sections: Json | null
          slug: string
          sources: Json | null
          syllabus: string[] | null
          updated_at: string | null
        }
        Insert: {
          cluster_id?: string | null
          conducting_body?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          cutoffs?: Json | null
          description?: string | null
          duration?: string | null
          eligibility?: string | null
          exam_category?: string | null
          exam_date?: string | null
          exam_level?: string | null
          exam_mode?: string | null
          exam_status?: string | null
          exam_year?: number | null
          faqs?: Json | null
          frequency?: string | null
          full_name?: string | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          important_dates?: Json | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          listing_sort_order?: number | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          official_website?: string | null
          pattern?: Json | null
          primary_keyword?: string | null
          registration_deadline?: string | null
          registration_status?: string | null
          reviewed_by?: string | null
          sections?: Json | null
          slug: string
          sources?: Json | null
          syllabus?: string[] | null
          updated_at?: string | null
        }
        Update: {
          cluster_id?: string | null
          conducting_body?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          cutoffs?: Json | null
          description?: string | null
          duration?: string | null
          eligibility?: string | null
          exam_category?: string | null
          exam_date?: string | null
          exam_level?: string | null
          exam_mode?: string | null
          exam_status?: string | null
          exam_year?: number | null
          faqs?: Json | null
          frequency?: string | null
          full_name?: string | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          important_dates?: Json | null
          keywords?: string[] | null
          last_seo_refresh?: string | null
          listing_sort_order?: number | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          official_website?: string | null
          pattern?: Json | null
          primary_keyword?: string | null
          registration_deadline?: string | null
          registration_status?: string | null
          reviewed_by?: string | null
          sections?: Json | null
          slug?: string
          sources?: Json | null
          syllabus?: string[] | null
          updated_at?: string | null
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
      freebie_downloads: {
        Row: {
          created_at: string
          email: string | null
          freebie_id: string
          id: string
          name: string | null
          phone: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          freebie_id: string
          id?: string
          name?: string | null
          phone?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          freebie_id?: string
          id?: string
          name?: string | null
          phone?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freebie_downloads_freebie_id_fkey"
            columns: ["freebie_id"]
            isOneToOne: false
            referencedRelation: "freebies"
            referencedColumns: ["id"]
          },
        ]
      }
      freebies: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          download_count: number
          featured_order: number
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_featured: boolean
          is_published: boolean
          sort_order: number
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          featured_order?: number
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          sort_order?: number
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          featured_order?: number
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          sort_order?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gsc_ingest_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          notes: Json
          pages_ingested: number
          queries_ingested: number
          site_url: string | null
          stage: string | null
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: Json
          pages_ingested?: number
          queries_ingested?: number
          site_url?: string | null
          stage?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: Json
          pages_ingested?: number
          queries_ingested?: number
          site_url?: string | null
          stage?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      gsc_page_metrics: {
        Row: {
          avg_position: number | null
          captured_at: string
          clicks: number
          created_at: string
          ctr: number
          end_date: string | null
          id: string
          impressions: number
          path: string
          start_date: string | null
          updated_at: string
          window_label: string
        }
        Insert: {
          avg_position?: number | null
          captured_at?: string
          clicks?: number
          created_at?: string
          ctr?: number
          end_date?: string | null
          id?: string
          impressions?: number
          path: string
          start_date?: string | null
          updated_at?: string
          window_label: string
        }
        Update: {
          avg_position?: number | null
          captured_at?: string
          clicks?: number
          created_at?: string
          ctr?: number
          end_date?: string | null
          id?: string
          impressions?: number
          path?: string
          start_date?: string | null
          updated_at?: string
          window_label?: string
        }
        Relationships: []
      }
      gsc_query_metrics: {
        Row: {
          avg_position: number | null
          captured_at: string
          clicks: number
          created_at: string
          ctr: number
          id: string
          impressions: number
          path: string
          query: string
          window_label: string
        }
        Insert: {
          avg_position?: number | null
          captured_at?: string
          clicks?: number
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          path: string
          query: string
          window_label?: string
        }
        Update: {
          avg_position?: number | null
          captured_at?: string
          clicks?: number
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          path?: string
          query?: string
          window_label?: string
        }
        Relationships: []
      }
      guidance_request_notes: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          note: string
          request_id: string
          stage_at_note: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          note: string
          request_id: string
          stage_at_note?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          note?: string
          request_id?: string
          stage_at_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guidance_request_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "guidance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      guidance_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          exam: string | null
          graduation_year: string | null
          help_topics: string[]
          id: string
          last_contacted_at: string | null
          lead_stage: string
          name: string
          phone: string
          query: string | null
          score: string | null
          source: string
          specialisation: string | null
          status: string
          user_id: string | null
          work_experience: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          exam?: string | null
          graduation_year?: string | null
          help_topics?: string[]
          id?: string
          last_contacted_at?: string | null
          lead_stage?: string
          name: string
          phone: string
          query?: string | null
          score?: string | null
          source?: string
          specialisation?: string | null
          status?: string
          user_id?: string | null
          work_experience?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          exam?: string | null
          graduation_year?: string | null
          help_topics?: string[]
          id?: string
          last_contacted_at?: string | null
          lead_stage?: string
          name?: string
          phone?: string
          query?: string | null
          score?: string | null
          source?: string
          specialisation?: string | null
          status?: string
          user_id?: string | null
          work_experience?: string | null
        }
        Relationships: []
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
      image_assets: {
        Row: {
          alt: string | null
          bytes: number | null
          caption: string | null
          content_hash: string | null
          created_at: string
          format: string | null
          height: number | null
          id: string
          issues: Json
          last_audited_at: string | null
          last_optimized_at: string | null
          lcp_candidate: boolean
          page_context: Json
          seo_filename: string | null
          source_url: string
          status: string
          status_reason: string | null
          title: string | null
          updated_at: string
          variants: Json
          width: number | null
        }
        Insert: {
          alt?: string | null
          bytes?: number | null
          caption?: string | null
          content_hash?: string | null
          created_at?: string
          format?: string | null
          height?: number | null
          id?: string
          issues?: Json
          last_audited_at?: string | null
          last_optimized_at?: string | null
          lcp_candidate?: boolean
          page_context?: Json
          seo_filename?: string | null
          source_url: string
          status?: string
          status_reason?: string | null
          title?: string | null
          updated_at?: string
          variants?: Json
          width?: number | null
        }
        Update: {
          alt?: string | null
          bytes?: number | null
          caption?: string | null
          content_hash?: string | null
          created_at?: string
          format?: string | null
          height?: number | null
          id?: string
          issues?: Json
          last_audited_at?: string | null
          last_optimized_at?: string | null
          lcp_candidate?: boolean
          page_context?: Json
          seo_filename?: string | null
          source_url?: string
          status?: string
          status_reason?: string | null
          title?: string | null
          updated_at?: string
          variants?: Json
          width?: number | null
        }
        Relationships: []
      }
      image_optimization_jobs: {
        Row: {
          asset_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          source_url: string
          started_at: string | null
          status: string
          steps: Json
          trigger_source: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          source_url: string
          started_at?: string | null
          status?: string
          steps?: Json
          trigger_source?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          source_url?: string
          started_at?: string | null
          status?: string
          steps?: Json
          trigger_source?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_optimization_jobs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "image_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_students: {
        Row: {
          course: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          imported_by: string | null
          matched_user_id: string | null
          mobile: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          imported_by?: string | null
          matched_user_id?: string | null
          mobile?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          course?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          imported_by?: string | null
          matched_user_id?: string | null
          mobile?: string | null
          notes?: string | null
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
      information_audit_events: {
        Row: {
          actor_id: string | null
          after_snapshot: Json | null
          before_snapshot: Json | null
          canonical_record_id: string | null
          created_at: string
          details: Json
          draft_id: string | null
          entity_type: string
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          canonical_record_id?: string | null
          created_at?: string
          details?: Json
          draft_id?: string | null
          entity_type: string
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          canonical_record_id?: string | null
          created_at?: string
          details?: Json
          draft_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_audit_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "information_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      information_drafts: {
        Row: {
          approved_payload: Json
          batch_id: string | null
          canonical_record_id: string | null
          city: string | null
          conflict_count: number
          created_at: string
          created_by: string
          entity_type: string
          error_message: string | null
          existing_snapshot: Json
          id: string
          identity_candidates: Json
          last_verified_at: string | null
          missing_required_fields: string[]
          normalized_name: string
          official_domain: string | null
          operation: string
          proposed_name: string | null
          proposed_payload: Json
          proposed_slug: string | null
          published_at: string | null
          requested_context: Json
          requested_name: string
          research_stage: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          total_field_count: number
          updated_at: string
          verified_field_count: number
        }
        Insert: {
          approved_payload?: Json
          batch_id?: string | null
          canonical_record_id?: string | null
          city?: string | null
          conflict_count?: number
          created_at?: string
          created_by: string
          entity_type: string
          error_message?: string | null
          existing_snapshot?: Json
          id?: string
          identity_candidates?: Json
          last_verified_at?: string | null
          missing_required_fields?: string[]
          normalized_name: string
          official_domain?: string | null
          operation?: string
          proposed_name?: string | null
          proposed_payload?: Json
          proposed_slug?: string | null
          published_at?: string | null
          requested_context?: Json
          requested_name: string
          research_stage?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          total_field_count?: number
          updated_at?: string
          verified_field_count?: number
        }
        Update: {
          approved_payload?: Json
          batch_id?: string | null
          canonical_record_id?: string | null
          city?: string | null
          conflict_count?: number
          created_at?: string
          created_by?: string
          entity_type?: string
          error_message?: string | null
          existing_snapshot?: Json
          id?: string
          identity_candidates?: Json
          last_verified_at?: string | null
          missing_required_fields?: string[]
          normalized_name?: string
          official_domain?: string | null
          operation?: string
          proposed_name?: string | null
          proposed_payload?: Json
          proposed_slug?: string | null
          published_at?: string | null
          requested_context?: Json
          requested_name?: string
          research_stage?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          total_field_count?: number
          updated_at?: string
          verified_field_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "information_drafts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "information_research_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      information_evidence: {
        Row: {
          created_at: string
          excerpt: string
          field_value_id: string
          id: string
          locator: string | null
          source_id: string
          supports_value: boolean
        }
        Insert: {
          created_at?: string
          excerpt: string
          field_value_id: string
          id?: string
          locator?: string | null
          source_id: string
          supports_value?: boolean
        }
        Update: {
          created_at?: string
          excerpt?: string
          field_value_id?: string
          id?: string
          locator?: string | null
          source_id?: string
          supports_value?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "information_evidence_field_value_id_fkey"
            columns: ["field_value_id"]
            isOneToOne: false
            referencedRelation: "information_field_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_evidence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "information_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      information_field_definitions: {
        Row: {
          allowed_source_classes: string[]
          canonical_field: string | null
          created_at: string
          display_order: number
          entity_type: string
          field_key: string
          id: string
          is_active: boolean
          is_repeatable: boolean
          is_required: boolean
          is_time_sensitive: boolean
          label: string
          minimum_verification: string
          section_key: string
          updated_at: string
          validation_rules: Json
          value_type: string
          verification_interval_days: number | null
        }
        Insert: {
          allowed_source_classes?: string[]
          canonical_field?: string | null
          created_at?: string
          display_order?: number
          entity_type: string
          field_key: string
          id?: string
          is_active?: boolean
          is_repeatable?: boolean
          is_required?: boolean
          is_time_sensitive?: boolean
          label: string
          minimum_verification?: string
          section_key: string
          updated_at?: string
          validation_rules?: Json
          value_type?: string
          verification_interval_days?: number | null
        }
        Update: {
          allowed_source_classes?: string[]
          canonical_field?: string | null
          created_at?: string
          display_order?: number
          entity_type?: string
          field_key?: string
          id?: string
          is_active?: boolean
          is_repeatable?: boolean
          is_required?: boolean
          is_time_sensitive?: boolean
          label?: string
          minimum_verification?: string
          section_key?: string
          updated_at?: string
          validation_rules?: Json
          value_type?: string
          verification_interval_days?: number | null
        }
        Relationships: []
      }
      information_field_values: {
        Row: {
          change_type: string
          confidence: number | null
          created_at: string
          current_value: Json | null
          draft_id: string
          edited_value: Json | null
          field_definition_id: string | null
          field_key: string
          id: string
          is_required: boolean
          last_verified_at: string | null
          proposed_value: Json | null
          review_decision: string
          section_key: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          change_type?: string
          confidence?: number | null
          created_at?: string
          current_value?: Json | null
          draft_id: string
          edited_value?: Json | null
          field_definition_id?: string | null
          field_key: string
          id?: string
          is_required?: boolean
          last_verified_at?: string | null
          proposed_value?: Json | null
          review_decision?: string
          section_key: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          change_type?: string
          confidence?: number | null
          created_at?: string
          current_value?: Json | null
          draft_id?: string
          edited_value?: Json | null
          field_definition_id?: string | null
          field_key?: string
          id?: string
          is_required?: boolean
          last_verified_at?: string | null
          proposed_value?: Json | null
          review_decision?: string
          section_key?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_field_values_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "information_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_field_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "information_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      information_research_batches: {
        Row: {
          completed_items: number
          created_at: string
          created_by: string
          entity_type: string
          error_message: string | null
          failed_items: number
          id: string
          label: string
          status: string
          total_items: number
          updated_at: string
        }
        Insert: {
          completed_items?: number
          created_at?: string
          created_by: string
          entity_type: string
          error_message?: string | null
          failed_items?: number
          id?: string
          label: string
          status?: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          completed_items?: number
          created_at?: string
          created_by?: string
          entity_type?: string
          error_message?: string | null
          failed_items?: number
          id?: string
          label?: string
          status?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: []
      }
      information_sources: {
        Row: {
          content_hash: string | null
          created_at: string
          document_type: string | null
          domain: string | null
          draft_id: string
          final_url: string | null
          http_status: number | null
          id: string
          is_official: boolean
          last_verified_at: string | null
          link_status: string
          metadata: Json
          source_class: string
          source_published_at: string | null
          title: string | null
          url: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          document_type?: string | null
          domain?: string | null
          draft_id: string
          final_url?: string | null
          http_status?: number | null
          id?: string
          is_official?: boolean
          last_verified_at?: string | null
          link_status?: string
          metadata?: Json
          source_class: string
          source_published_at?: string | null
          title?: string | null
          url: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          document_type?: string | null
          domain?: string | null
          draft_id?: string
          final_url?: string | null
          http_status?: number | null
          id?: string
          is_official?: boolean
          last_verified_at?: string | null
          link_status?: string
          metadata?: Json
          source_class?: string
          source_published_at?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_sources_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "information_drafts"
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
      institute_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          institute_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          institute_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          institute_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "institute_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institute_courses_institute_id_fkey"
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
          canonical_url: string | null
          category_id: string | null
          city: string | null
          cluster_id: string | null
          content_hash: string | null
          content_score: number | null
          created_at: string
          description: string | null
          discount: string | null
          email: string | null
          faqs: Json | null
          featured: boolean | null
          features: string[] | null
          fees_lakhs: number | null
          funnel_stage: string | null
          h1_tag: string | null
          id: string
          institute_type: string
          keywords: string[] | null
          last_seo_refresh: string | null
          last_updated_by: string | null
          latitude: number | null
          listing_sort_order: number | null
          logo_url: string | null
          long_tail_keywords: string[] | null
          longitude: number | null
          meta_description: string | null
          meta_title: string | null
          mode: string | null
          name: string
          offer: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          phone: string | null
          primary_keyword: string | null
          rating: number | null
          schema_jsonld: Json | null
          sections: Json
          seo_score: number | null
          slug: string
          source: string | null
          specializations: string[] | null
          state: string | null
          students_count: number | null
          submitted_by_user_id: string | null
          success_rate: number | null
          total_reviews: number | null
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          canonical_url?: string | null
          category_id?: string | null
          city?: string | null
          cluster_id?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          description?: string | null
          discount?: string | null
          email?: string | null
          faqs?: Json | null
          featured?: boolean | null
          features?: string[] | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          institute_type?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          latitude?: number | null
          listing_sort_order?: number | null
          logo_url?: string | null
          long_tail_keywords?: string[] | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          name: string
          offer?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          phone?: string | null
          primary_keyword?: string | null
          rating?: number | null
          schema_jsonld?: Json | null
          sections?: Json
          seo_score?: number | null
          slug: string
          source?: string | null
          specializations?: string[] | null
          state?: string | null
          students_count?: number | null
          submitted_by_user_id?: string | null
          success_rate?: number | null
          total_reviews?: number | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          canonical_url?: string | null
          category_id?: string | null
          city?: string | null
          cluster_id?: string | null
          content_hash?: string | null
          content_score?: number | null
          created_at?: string
          description?: string | null
          discount?: string | null
          email?: string | null
          faqs?: Json | null
          featured?: boolean | null
          features?: string[] | null
          fees_lakhs?: number | null
          funnel_stage?: string | null
          h1_tag?: string | null
          id?: string
          institute_type?: string
          keywords?: string[] | null
          last_seo_refresh?: string | null
          last_updated_by?: string | null
          latitude?: number | null
          listing_sort_order?: number | null
          logo_url?: string | null
          long_tail_keywords?: string[] | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          name?: string
          offer?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          phone?: string | null
          primary_keyword?: string | null
          rating?: number | null
          schema_jsonld?: Json | null
          sections?: Json
          seo_score?: number | null
          slug?: string
          source?: string | null
          specializations?: string[] | null
          state?: string | null
          students_count?: number | null
          submitted_by_user_id?: string | null
          success_rate?: number | null
          total_reviews?: number | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
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
      intent_actions: {
        Row: {
          action: string
          created_at: string
          from_path: string | null
          id: string
          notes: string | null
          recommendation_id: string | null
          revert_payload: Json | null
          reverted_at: string | null
          run_id: string | null
          source_field: string | null
          source_id: string | null
          source_table: string | null
          status: string
          to_path: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_path?: string | null
          id?: string
          notes?: string | null
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          to_path?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_path?: string | null
          id?: string
          notes?: string | null
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          to_path?: string | null
        }
        Relationships: []
      }
      intent_clusters: {
        Row: {
          ai_summary: string | null
          best_position: number | null
          cluster_key: string
          competing_paths: Json
          created_at: string
          id: string
          intent_type: string
          is_cannibalized: boolean
          keywords: Json
          needs_new_page: boolean
          page_count: number
          primary_keyword: string
          run_id: string | null
          severity: string
          sub_intents: Json
          total_clicks: number
          total_impressions: number
          updated_at: string
          winner_path: string | null
          winner_reason: string | null
        }
        Insert: {
          ai_summary?: string | null
          best_position?: number | null
          cluster_key: string
          competing_paths?: Json
          created_at?: string
          id?: string
          intent_type?: string
          is_cannibalized?: boolean
          keywords?: Json
          needs_new_page?: boolean
          page_count?: number
          primary_keyword: string
          run_id?: string | null
          severity?: string
          sub_intents?: Json
          total_clicks?: number
          total_impressions?: number
          updated_at?: string
          winner_path?: string | null
          winner_reason?: string | null
        }
        Update: {
          ai_summary?: string | null
          best_position?: number | null
          cluster_key?: string
          competing_paths?: Json
          created_at?: string
          id?: string
          intent_type?: string
          is_cannibalized?: boolean
          keywords?: Json
          needs_new_page?: boolean
          page_count?: number
          primary_keyword?: string
          run_id?: string | null
          severity?: string
          sub_intents?: Json
          total_clicks?: number
          total_impressions?: number
          updated_at?: string
          winner_path?: string | null
          winner_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_clusters_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "intent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_recommendations: {
        Row: {
          action: string
          anchor_text: string | null
          applied_at: string | null
          auto_applied: boolean
          brief: Json | null
          cluster_id: string | null
          confidence: number | null
          created_at: string
          error: string | null
          expected_impact: string | null
          id: string
          intent_type: string | null
          keyword: string | null
          priority: string
          problem: string | null
          rationale: string | null
          run_id: string | null
          score: number
          seo_impact: string | null
          source_field: string | null
          source_id: string | null
          source_path: string | null
          source_table: string | null
          status: string
          target_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          action: string
          anchor_text?: string | null
          applied_at?: string | null
          auto_applied?: boolean
          brief?: Json | null
          cluster_id?: string | null
          confidence?: number | null
          created_at?: string
          error?: string | null
          expected_impact?: string | null
          id?: string
          intent_type?: string | null
          keyword?: string | null
          priority?: string
          problem?: string | null
          rationale?: string | null
          run_id?: string | null
          score?: number
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_path?: string | null
          source_table?: string | null
          status?: string
          target_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          anchor_text?: string | null
          applied_at?: string | null
          auto_applied?: boolean
          brief?: Json | null
          cluster_id?: string | null
          confidence?: number | null
          created_at?: string
          error?: string | null
          expected_impact?: string | null
          id?: string
          intent_type?: string | null
          keyword?: string | null
          priority?: string
          problem?: string | null
          rationale?: string | null
          run_id?: string | null
          score?: number
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_path?: string | null
          source_table?: string | null
          status?: string
          target_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_recommendations_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "intent_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "intent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_runs: {
        Row: {
          applied: number
          clusters_found: number
          conflicts_found: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          keywords_analyzed: number
          notes: Json
          recommendations: number
          stage: string | null
          started_at: string
          status: string
        }
        Insert: {
          applied?: number
          clusters_found?: number
          conflicts_found?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          keywords_analyzed?: number
          notes?: Json
          recommendations?: number
          stage?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          applied?: number
          clusters_found?: number
          conflicts_found?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          keywords_analyzed?: number
          notes?: Json
          recommendations?: number
          stage?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      keyword_metrics_cache: {
        Row: {
          competition: number | null
          cpc: number | null
          created_at: string
          difficulty: number | null
          difficulty_source: string | null
          fetched_at: string
          gsc_clicks: number | null
          gsc_ctr: number | null
          gsc_fetched_at: string | null
          gsc_impressions: number | null
          gsc_position: number | null
          id: string
          intent: string | null
          keyword: string
          locale: string
          monthly_trend: Json | null
          raw: Json | null
          results_count: number | null
          search_volume: number | null
          updated_at: string
          volume_source: string | null
        }
        Insert: {
          competition?: number | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          difficulty_source?: string | null
          fetched_at?: string
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_fetched_at?: string | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          id?: string
          intent?: string | null
          keyword: string
          locale?: string
          monthly_trend?: Json | null
          raw?: Json | null
          results_count?: number | null
          search_volume?: number | null
          updated_at?: string
          volume_source?: string | null
        }
        Update: {
          competition?: number | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          difficulty_source?: string | null
          fetched_at?: string
          gsc_clicks?: number | null
          gsc_ctr?: number | null
          gsc_fetched_at?: string | null
          gsc_impressions?: number | null
          gsc_position?: number | null
          id?: string
          intent?: string | null
          keyword?: string
          locale?: string
          monthly_trend?: Json | null
          raw?: Json | null
          results_count?: number | null
          search_volume?: number | null
          updated_at?: string
          volume_source?: string | null
        }
        Relationships: []
      }
      landscape_colleges: {
        Row: {
          average_package: string | null
          category: string
          city: string | null
          created_at: string
          cutoff: string | null
          fees: string | null
          highest_package: string | null
          highlight: string | null
          id: string
          is_active: boolean
          name: string
          rank: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          average_package?: string | null
          category: string
          city?: string | null
          created_at?: string
          cutoff?: string | null
          fees?: string | null
          highest_package?: string | null
          highlight?: string | null
          id?: string
          is_active?: boolean
          name: string
          rank?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          average_package?: string | null
          category?: string
          city?: string | null
          created_at?: string
          cutoff?: string | null
          fees?: string | null
          highest_package?: string | null
          highlight?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rank?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      magic_link_edits: {
        Row: {
          changed_fields: Json
          created_at: string
          entity_id: string
          entity_slug: string | null
          entity_title: string | null
          entity_type: string
          field_count: number
          id: string
          link_id: string | null
          notified: boolean
          source: string
        }
        Insert: {
          changed_fields?: Json
          created_at?: string
          entity_id: string
          entity_slug?: string | null
          entity_title?: string | null
          entity_type: string
          field_count?: number
          id?: string
          link_id?: string | null
          notified?: boolean
          source?: string
        }
        Update: {
          changed_fields?: Json
          created_at?: string
          entity_id?: string
          entity_slug?: string | null
          entity_title?: string | null
          entity_type?: string
          field_count?: number
          id?: string
          link_id?: string | null
          notified?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_link_edits_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "content_magic_links"
            referencedColumns: ["id"]
          },
        ]
      }
      master_refresh_items: {
        Row: {
          attempts: number
          changed_fields: number | null
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          error: string | null
          finished_at: string | null
          id: string
          job_id: string
          started_at: string | null
          status: string
          total_fields: number | null
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          attempts?: number
          changed_fields?: number | null
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          started_at?: string | null
          status?: string
          total_fields?: number | null
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          attempts?: number
          changed_fields?: number | null
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          started_at?: string | null
          status?: string
          total_fields?: number | null
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_refresh_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "master_refresh_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      master_refresh_jobs: {
        Row: {
          concurrency: number
          created_at: string
          created_by: string | null
          entity_types: string[]
          failed: number
          finished_at: string | null
          freshness: string
          id: string
          in_progress: number
          last_activity: string | null
          mode: string
          model: string
          paused: boolean
          started_at: string | null
          status: string
          succeeded: number
          total: number
          updated_at: string
        }
        Insert: {
          concurrency?: number
          created_at?: string
          created_by?: string | null
          entity_types?: string[]
          failed?: number
          finished_at?: string | null
          freshness?: string
          id?: string
          in_progress?: number
          last_activity?: string | null
          mode?: string
          model?: string
          paused?: boolean
          started_at?: string | null
          status?: string
          succeeded?: number
          total?: number
          updated_at?: string
        }
        Update: {
          concurrency?: number
          created_at?: string
          created_by?: string | null
          entity_types?: string[]
          failed?: number
          finished_at?: string | null
          freshness?: string
          id?: string
          in_progress?: number
          last_activity?: string | null
          mode?: string
          model?: string
          paused?: boolean
          started_at?: string | null
          status?: string
          succeeded?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      mba_compass_courses: {
        Row: {
          banner_url: string | null
          brochure_url: string | null
          cluster_id: string | null
          content_hash: string | null
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
          funnel_stage: string | null
          gallery_images: Json | null
          h1_tag: string | null
          has_ai_insights: boolean | null
          has_ai_study_planner: boolean | null
          has_ai_tools: boolean | null
          has_cat_planner: boolean | null
          has_certificate: boolean | null
          has_daily_mocks: boolean | null
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
          has_personalized_hub: boolean | null
          has_previous_year_papers: boolean | null
          has_recorded_lectures: boolean | null
          has_sectional_tests: boolean | null
          has_study_material: boolean | null
          has_topic_tests: boolean | null
          highlights: Json | null
          id: string
          instructors: Json | null
          is_active: boolean
          is_featured: boolean
          keywords: string[] | null
          language: string | null
          last_seo_refresh: string | null
          level: string | null
          live_classes_count: number | null
          meta_description: string | null
          meta_title: string | null
          mode: string | null
          original_price: number | null
          price: number | null
          primary_keyword: string | null
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
          cluster_id?: string | null
          content_hash?: string | null
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
          funnel_stage?: string | null
          gallery_images?: Json | null
          h1_tag?: string | null
          has_ai_insights?: boolean | null
          has_ai_study_planner?: boolean | null
          has_ai_tools?: boolean | null
          has_cat_planner?: boolean | null
          has_certificate?: boolean | null
          has_daily_mocks?: boolean | null
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
          has_personalized_hub?: boolean | null
          has_previous_year_papers?: boolean | null
          has_recorded_lectures?: boolean | null
          has_sectional_tests?: boolean | null
          has_study_material?: boolean | null
          has_topic_tests?: boolean | null
          highlights?: Json | null
          id?: string
          instructors?: Json | null
          is_active?: boolean
          is_featured?: boolean
          keywords?: string[] | null
          language?: string | null
          last_seo_refresh?: string | null
          level?: string | null
          live_classes_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          original_price?: number | null
          price?: number | null
          primary_keyword?: string | null
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
          cluster_id?: string | null
          content_hash?: string | null
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
          funnel_stage?: string | null
          gallery_images?: Json | null
          h1_tag?: string | null
          has_ai_insights?: boolean | null
          has_ai_study_planner?: boolean | null
          has_ai_tools?: boolean | null
          has_cat_planner?: boolean | null
          has_certificate?: boolean | null
          has_daily_mocks?: boolean | null
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
          has_personalized_hub?: boolean | null
          has_previous_year_papers?: boolean | null
          has_recorded_lectures?: boolean | null
          has_sectional_tests?: boolean | null
          has_study_material?: boolean | null
          has_topic_tests?: boolean | null
          highlights?: Json | null
          id?: string
          instructors?: Json | null
          is_active?: boolean
          is_featured?: boolean
          keywords?: string[] | null
          language?: string | null
          last_seo_refresh?: string | null
          level?: string | null
          live_classes_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          mode?: string | null
          original_price?: number | null
          price?: number | null
          primary_keyword?: string | null
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
      meritto_lead_logs: {
        Row: {
          campaign: string | null
          campus: string | null
          city: string | null
          course: string | null
          created_at: string
          email: string | null
          error: string | null
          http_status: number | null
          id: string
          last_attempt_at: string | null
          medium: string | null
          mobile: string | null
          name: string | null
          payload: Json
          response: Json | null
          retry_count: number
          source: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          campus?: string | null
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string | null
          medium?: string | null
          mobile?: string | null
          name?: string | null
          payload: Json
          response?: Json | null
          retry_count?: number
          source: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          campus?: string | null
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string | null
          medium?: string | null
          mobile?: string | null
          name?: string | null
          payload?: Json
          response?: Json | null
          retry_count?: number
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
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
      mock_bundle_enrollments: {
        Row: {
          bundle_id: string
          enrolled_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          bundle_id: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          bundle_id?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_bundle_enrollments_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "mock_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_bundle_enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mock_bundle_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          sort_order: number
          test_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          sort_order?: number
          test_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "mock_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_bundle_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_bundle_orders: {
        Row: {
          amount: number
          bundle_id: string | null
          created_at: string
          currency: string
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bundle_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bundle_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_bundle_orders_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "mock_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_bundles: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          exam_code: string | null
          features: Json
          filter_exams: string[]
          filter_types: string[]
          highlight_on_mocks: boolean
          highlights: Json
          id: string
          included_categories: string[]
          is_published: boolean
          name: string
          original_price_inr: number | null
          price_inr: number
          slug: string
          sort_order: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_code?: string | null
          features?: Json
          filter_exams?: string[]
          filter_types?: string[]
          highlight_on_mocks?: boolean
          highlights?: Json
          id?: string
          included_categories?: string[]
          is_published?: boolean
          name: string
          original_price_inr?: number | null
          price_inr?: number
          slug: string
          sort_order?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_code?: string | null
          features?: Json
          filter_exams?: string[]
          filter_types?: string[]
          highlight_on_mocks?: boolean
          highlights?: Json
          id?: string
          included_categories?: string[]
          is_published?: boolean
          name?: string
          original_price_inr?: number | null
          price_inr?: number
          slug?: string
          sort_order?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: []
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
      mock_projected_ranks: {
        Row: {
          air_bucket: string
          attempt_id: string
          computed_at: string
          difficulty: string
          pool_size: number
          projected_air: number
          projected_percentile: number
          real_pool_size: number
          sectional: Json
          students_ahead: number
          students_behind: number
          test_id: string
          topper_score: number
          user_id: string
        }
        Insert: {
          air_bucket: string
          attempt_id: string
          computed_at?: string
          difficulty: string
          pool_size: number
          projected_air: number
          projected_percentile: number
          real_pool_size: number
          sectional?: Json
          students_ahead: number
          students_behind: number
          test_id: string
          topper_score: number
          user_id: string
        }
        Update: {
          air_bucket?: string
          attempt_id?: string
          computed_at?: string
          difficulty?: string
          pool_size?: number
          projected_air?: number
          projected_percentile?: number
          real_pool_size?: number
          sectional?: Json
          students_ahead?: number
          students_behind?: number
          test_id?: string
          topper_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_projected_ranks_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "mock_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_projected_ranks_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "mock_leaderboard"
            referencedColumns: ["attempt_id"]
          },
        ]
      }
      mock_purchase_orders: {
        Row: {
          account_created: boolean
          amount: number
          bundle: boolean
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          notes: Json | null
          product_name: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          test_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_created?: boolean
          amount: number
          bundle?: boolean
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          notes?: Json | null
          product_name?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_created?: boolean
          amount?: number
          bundle?: boolean
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          notes?: Json | null
          product_name?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_purchase_orders_test_id_fkey"
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
      mock_question_upgrade_reviews: {
        Row: {
          created_at: string
          created_by: string
          id: string
          proposed_question: Json
          question_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_snapshot: Json
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          proposed_question: Json
          question_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_snapshot: Json
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          proposed_question?: Json
          question_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_snapshot?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_question_upgrade_reviews_question_id_fkey"
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
          explanation_html_original: string | null
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
          explanation_html_original?: string | null
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
          explanation_html_original?: string | null
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
      mock_section_jobs: {
        Row: {
          attempts: number
          category: string
          created_at: string
          created_by: string | null
          current_step: string | null
          dup_db_conflict: number
          dup_hash: number
          dup_paraphrase: number
          dup_similarity: number
          duplicates_rejected: number
          error_message: string | null
          exam_code: string
          final_reason: string | null
          generation_id: string | null
          id: string
          level: string
          mcq_count: number
          negative_marks: number
          positive_marks: number
          questions_done: number
          questions_per_set: number
          rejected_invalid: number
          section_code: string
          section_id: string
          section_name: string
          sets: number
          status: string
          strict_topic: string | null
          test_id: string
          tita_count: number
          topic: string | null
          total_questions: number
          updated_at: string
          verify_internet: boolean
          worker_lock_until: string | null
        }
        Insert: {
          attempts?: number
          category: string
          created_at?: string
          created_by?: string | null
          current_step?: string | null
          dup_db_conflict?: number
          dup_hash?: number
          dup_paraphrase?: number
          dup_similarity?: number
          duplicates_rejected?: number
          error_message?: string | null
          exam_code: string
          final_reason?: string | null
          generation_id?: string | null
          id?: string
          level?: string
          mcq_count?: number
          negative_marks?: number
          positive_marks?: number
          questions_done?: number
          questions_per_set?: number
          rejected_invalid?: number
          section_code: string
          section_id: string
          section_name: string
          sets?: number
          status?: string
          strict_topic?: string | null
          test_id: string
          tita_count?: number
          topic?: string | null
          total_questions?: number
          updated_at?: string
          verify_internet?: boolean
          worker_lock_until?: string | null
        }
        Update: {
          attempts?: number
          category?: string
          created_at?: string
          created_by?: string | null
          current_step?: string | null
          dup_db_conflict?: number
          dup_hash?: number
          dup_paraphrase?: number
          dup_similarity?: number
          duplicates_rejected?: number
          error_message?: string | null
          exam_code?: string
          final_reason?: string | null
          generation_id?: string | null
          id?: string
          level?: string
          mcq_count?: number
          negative_marks?: number
          positive_marks?: number
          questions_done?: number
          questions_per_set?: number
          rejected_invalid?: number
          section_code?: string
          section_id?: string
          section_name?: string
          sets?: number
          status?: string
          strict_topic?: string | null
          test_id?: string
          tita_count?: number
          topic?: string | null
          total_questions?: number
          updated_at?: string
          verify_internet?: boolean
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_section_jobs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "ai_mock_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_section_jobs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mock_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_section_jobs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
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
          readiness_status: string
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          slug: string
          sort_order: number
          stripe_price_id: string | null
          test_type: Database["public"]["Enums"]["mock_test_type"]
          topic: string | null
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
          readiness_status?: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          test_type?: Database["public"]["Enums"]["mock_test_type"]
          topic?: string | null
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
          readiness_status?: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          test_type?: Database["public"]["Enums"]["mock_test_type"]
          topic?: string | null
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
          courses_cta_block: Json
          created_at: string
          cta_target_test_id: string | null
          day_planner_block: Json
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
          courses_cta_block?: Json
          created_at?: string
          cta_target_test_id?: string | null
          day_planner_block?: Json
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
          courses_cta_block?: Json
          created_at?: string
          cta_target_test_id?: string | null
          day_planner_block?: Json
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
      news_articles: {
        Row: {
          ai_generated: boolean
          category: string
          created_at: string
          detailed_summary: string | null
          exam_relevance: Json
          gdpi_points: Json
          headline: string
          id: string
          importance: string
          key_facts: Json
          news_date: string
          one_liner: string | null
          published_at: string
          reading_seconds: number
          short_summary: string | null
          short_summary_hi: string | null
          short_summary_hinglish: string | null
          source_name: string | null
          source_url: string | null
          tags: string[]
          vocabulary: Json
          wat_topics: Json
          why_matters: string | null
        }
        Insert: {
          ai_generated?: boolean
          category: string
          created_at?: string
          detailed_summary?: string | null
          exam_relevance?: Json
          gdpi_points?: Json
          headline: string
          id?: string
          importance?: string
          key_facts?: Json
          news_date?: string
          one_liner?: string | null
          published_at?: string
          reading_seconds?: number
          short_summary?: string | null
          short_summary_hi?: string | null
          short_summary_hinglish?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[]
          vocabulary?: Json
          wat_topics?: Json
          why_matters?: string | null
        }
        Update: {
          ai_generated?: boolean
          category?: string
          created_at?: string
          detailed_summary?: string | null
          exam_relevance?: Json
          gdpi_points?: Json
          headline?: string
          id?: string
          importance?: string
          key_facts?: Json
          news_date?: string
          one_liner?: string | null
          published_at?: string
          reading_seconds?: number
          short_summary?: string | null
          short_summary_hi?: string | null
          short_summary_hinglish?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[]
          vocabulary?: Json
          wat_topics?: Json
          why_matters?: string | null
        }
        Relationships: []
      }
      news_user_actions: {
        Row: {
          article_id: string
          is_liked: boolean
          is_read: boolean
          is_saved: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          is_liked?: boolean
          is_read?: boolean
          is_saved?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          is_liked?: boolean
          is_read?: boolean
          is_saved?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_user_actions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
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
      official_source_domains: {
        Row: {
          content_type: string
          created_at: string
          domain: string
          id: string
          is_active: boolean
          label: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      page_entities: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          in_faq: boolean
          in_meta: boolean
          in_schema: boolean
          mentions: number
          path: string
          prominence: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          in_faq?: boolean
          in_meta?: boolean
          in_schema?: boolean
          mentions?: number
          path: string
          prominence?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          in_faq?: boolean
          in_meta?: boolean
          in_schema?: boolean
          mentions?: number
          path?: string
          prominence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "seo_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      page_indexing_status: {
        Row: {
          checked_at: string
          coverage_state: string | null
          created_at: string
          error: string | null
          google_canonical: string | null
          id: string
          index_status: string | null
          indexing_state: string | null
          last_crawl_time: string | null
          page_fetch_state: string | null
          page_type: string | null
          priority: number
          raw: Json | null
          robots_txt_state: string | null
          site_url: string | null
          slug: string | null
          updated_at: string
          url: string
          user_canonical: string | null
          verdict: string | null
        }
        Insert: {
          checked_at?: string
          coverage_state?: string | null
          created_at?: string
          error?: string | null
          google_canonical?: string | null
          id?: string
          index_status?: string | null
          indexing_state?: string | null
          last_crawl_time?: string | null
          page_fetch_state?: string | null
          page_type?: string | null
          priority?: number
          raw?: Json | null
          robots_txt_state?: string | null
          site_url?: string | null
          slug?: string | null
          updated_at?: string
          url: string
          user_canonical?: string | null
          verdict?: string | null
        }
        Update: {
          checked_at?: string
          coverage_state?: string | null
          created_at?: string
          error?: string | null
          google_canonical?: string | null
          id?: string
          index_status?: string | null
          indexing_state?: string | null
          last_crawl_time?: string | null
          page_fetch_state?: string | null
          page_type?: string | null
          priority?: number
          raw?: Json | null
          robots_txt_state?: string | null
          site_url?: string | null
          slug?: string | null
          updated_at?: string
          url?: string
          user_canonical?: string | null
          verdict?: string | null
        }
        Relationships: []
      }
      page_seo_audits: {
        Row: {
          approved: boolean
          checklist: Json | null
          competitors: Json | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          keyword_gap: Json | null
          proposal: Json | null
          slug: string
          status: string
          steps: Json
          target_keyword: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          checklist?: Json | null
          competitors?: Json | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          keyword_gap?: Json | null
          proposal?: Json | null
          slug: string
          status?: string
          steps?: Json
          target_keyword: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          checklist?: Json | null
          competitors?: Json | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          keyword_gap?: Json | null
          proposal?: Json | null
          slug?: string
          status?: string
          steps?: Json
          target_keyword?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_seo_overrides: {
        Row: {
          applied_at: string
          applied_by: string | null
          body_html: string | null
          description: string | null
          faq: Json | null
          h1: string | null
          intro_html: string | null
          json_ld: Json | null
          keyword_density: Json | null
          keywords: string[] | null
          last_reoptimized_at: string | null
          long_tail_keywords: Json | null
          og_image: string | null
          primary_keyword: string | null
          related_queries: Json | null
          reoptimization_run_id: string | null
          search_intent: string | null
          secondary_keyword: string | null
          slug: string
          source_audit_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          body_html?: string | null
          description?: string | null
          faq?: Json | null
          h1?: string | null
          intro_html?: string | null
          json_ld?: Json | null
          keyword_density?: Json | null
          keywords?: string[] | null
          last_reoptimized_at?: string | null
          long_tail_keywords?: Json | null
          og_image?: string | null
          primary_keyword?: string | null
          related_queries?: Json | null
          reoptimization_run_id?: string | null
          search_intent?: string | null
          secondary_keyword?: string | null
          slug: string
          source_audit_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          body_html?: string | null
          description?: string | null
          faq?: Json | null
          h1?: string | null
          intro_html?: string | null
          json_ld?: Json | null
          keyword_density?: Json | null
          keywords?: string[] | null
          last_reoptimized_at?: string | null
          long_tail_keywords?: Json | null
          og_image?: string | null
          primary_keyword?: string | null
          related_queries?: Json | null
          reoptimization_run_id?: string | null
          search_intent?: string | null
          secondary_keyword?: string | null
          slug?: string
          source_audit_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_seo_overrides_source_audit_id_fkey"
            columns: ["source_audit_id"]
            isOneToOne: false
            referencedRelation: "page_seo_audits"
            referencedColumns: ["id"]
          },
        ]
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
      personalized_bulk_items: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          current_step: string | null
          difficulty: string
          exam_code: string
          existing_count: number
          failed_count: number
          generated_count: number
          id: string
          job_id: string
          last_error: string | null
          requested_count: number
          section: string
          started_at: string | null
          status: string
          updated_at: string
          worker_lock_until: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          difficulty: string
          exam_code: string
          existing_count?: number
          failed_count?: number
          generated_count?: number
          id?: string
          job_id: string
          last_error?: string | null
          requested_count: number
          section: string
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_lock_until?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          difficulty?: string
          exam_code?: string
          existing_count?: number
          failed_count?: number
          generated_count?: number
          id?: string
          job_id?: string
          last_error?: string | null
          requested_count?: number
          section?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_lock_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personalized_bulk_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "personalized_bulk_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      personalized_bulk_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          note: string | null
          status: string
          total_failed: number
          total_generated: number
          total_requested: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          note?: string | null
          status?: string
          total_failed?: number
          total_generated?: number
          total_requested?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          note?: string | null
          status?: string
          total_failed?: number
          total_generated?: number
          total_requested?: number
          updated_at?: string
        }
        Relationships: []
      }
      personalized_hub_access: {
        Row: {
          created_at: string
          daily_quota: number
          expires_at: string | null
          granted_by: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_quota?: number
          expires_at?: string | null
          granted_by?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_quota?: number
          expires_at?: string | null
          granted_by?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personalized_mock_attempts: {
        Row: {
          accuracy: number | null
          answers: Json
          created_at: string
          difficulty: string
          duration_minutes: number
          exam_code: string
          id: string
          num_questions: number
          questions: Json
          score: number | null
          sections: string[]
          started_at: string
          status: string
          submitted_at: string | null
          time_taken_seconds: number | null
          total_correct: number | null
          total_unattempted: number | null
          total_wrong: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          answers?: Json
          created_at?: string
          difficulty: string
          duration_minutes: number
          exam_code: string
          id?: string
          num_questions: number
          questions: Json
          score?: number | null
          sections: string[]
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_unattempted?: number | null
          total_wrong?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          answers?: Json
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          exam_code?: string
          id?: string
          num_questions?: number
          questions?: Json
          score?: number | null
          sections?: string[]
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_unattempted?: number | null
          total_wrong?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personalized_question_seen: {
        Row: {
          question_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          question_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          question_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalized_question_seen_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "personalized_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      personalized_questions: {
        Row: {
          correct_index: number
          created_at: string
          created_by: string | null
          difficulty: string
          exam_code: string
          explanation: string | null
          id: string
          options: Json
          question_hash: string | null
          question_text: string
          section: string
          source: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          created_by?: string | null
          difficulty: string
          exam_code: string
          explanation?: string | null
          id?: string
          options: Json
          question_hash?: string | null
          question_text: string
          section: string
          source?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_code?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_hash?: string | null
          question_text?: string
          section?: string
          source?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      phone_lookup_audit: {
        Row: {
          created_at: string
          id: string
          ip: string
          phone_hash_prefix: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          phone_hash_prefix?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          phone_hash_prefix?: string | null
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
      pruning_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          error: string | null
          id: string
          recommendation_id: string | null
          revert_payload: Json | null
          reverted_at: string | null
          run_id: string | null
          status: string
          url: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          error?: string | null
          id?: string
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          status?: string
          url: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          error?: string | null
          id?: string
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pruning_actions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "pruning_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruning_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pruning_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pruning_duplicate_clusters: {
        Row: {
          cluster_type: string
          created_at: string
          id: string
          member_urls: string[]
          notes: string | null
          run_id: string | null
          signature: string | null
          similarity: number | null
          survivor_url: string | null
          updated_at: string
        }
        Insert: {
          cluster_type?: string
          created_at?: string
          id?: string
          member_urls?: string[]
          notes?: string | null
          run_id?: string | null
          signature?: string | null
          similarity?: number | null
          survivor_url?: string | null
          updated_at?: string
        }
        Update: {
          cluster_type?: string
          created_at?: string
          id?: string
          member_urls?: string[]
          notes?: string | null
          run_id?: string | null
          signature?: string | null
          similarity?: number | null
          survivor_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pruning_duplicate_clusters_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pruning_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pruning_pages: {
        Row: {
          analyzed_at: string | null
          author: string | null
          authority_score: number | null
          avg_position: number | null
          backlinks: number
          broken_links: number
          canonical_url: string | null
          city: string | null
          clicks: number
          clicks_prev: number
          content_hash: string | null
          content_score: number | null
          content_updated_at: string | null
          created_at: string
          ctr: number
          days_since_update: number | null
          duplicate_cluster_id: string | null
          engagement_rate: number | null
          faq_count: number
          freshness_score: number | null
          h1: string | null
          has_schema: boolean
          heading_count: number
          id: string
          impressions: number
          impressions_prev: number
          in_sitemap: boolean
          index_state: string | null
          internal_links_in: number
          internal_links_out: number
          is_orphan: boolean
          meta_description: string | null
          meta_title: string | null
          opportunity_score: number | null
          page_name: string | null
          page_type: string
          path: string
          primary_keyword: string | null
          psi_score: number | null
          published_at: string | null
          readability: number | null
          repetition_score: number | null
          robots: string | null
          run_id: string | null
          secondary_keyword: string | null
          seo_score: number | null
          sessions: number
          shingles: string[] | null
          signals: Json
          signals_at: string | null
          slug: string | null
          source_id: string | null
          source_table: string | null
          stale_facts: Json
          state: string | null
          thin_content: boolean
          updated_at: string
          url: string
          word_count: number
        }
        Insert: {
          analyzed_at?: string | null
          author?: string | null
          authority_score?: number | null
          avg_position?: number | null
          backlinks?: number
          broken_links?: number
          canonical_url?: string | null
          city?: string | null
          clicks?: number
          clicks_prev?: number
          content_hash?: string | null
          content_score?: number | null
          content_updated_at?: string | null
          created_at?: string
          ctr?: number
          days_since_update?: number | null
          duplicate_cluster_id?: string | null
          engagement_rate?: number | null
          faq_count?: number
          freshness_score?: number | null
          h1?: string | null
          has_schema?: boolean
          heading_count?: number
          id?: string
          impressions?: number
          impressions_prev?: number
          in_sitemap?: boolean
          index_state?: string | null
          internal_links_in?: number
          internal_links_out?: number
          is_orphan?: boolean
          meta_description?: string | null
          meta_title?: string | null
          opportunity_score?: number | null
          page_name?: string | null
          page_type?: string
          path: string
          primary_keyword?: string | null
          psi_score?: number | null
          published_at?: string | null
          readability?: number | null
          repetition_score?: number | null
          robots?: string | null
          run_id?: string | null
          secondary_keyword?: string | null
          seo_score?: number | null
          sessions?: number
          shingles?: string[] | null
          signals?: Json
          signals_at?: string | null
          slug?: string | null
          source_id?: string | null
          source_table?: string | null
          stale_facts?: Json
          state?: string | null
          thin_content?: boolean
          updated_at?: string
          url: string
          word_count?: number
        }
        Update: {
          analyzed_at?: string | null
          author?: string | null
          authority_score?: number | null
          avg_position?: number | null
          backlinks?: number
          broken_links?: number
          canonical_url?: string | null
          city?: string | null
          clicks?: number
          clicks_prev?: number
          content_hash?: string | null
          content_score?: number | null
          content_updated_at?: string | null
          created_at?: string
          ctr?: number
          days_since_update?: number | null
          duplicate_cluster_id?: string | null
          engagement_rate?: number | null
          faq_count?: number
          freshness_score?: number | null
          h1?: string | null
          has_schema?: boolean
          heading_count?: number
          id?: string
          impressions?: number
          impressions_prev?: number
          in_sitemap?: boolean
          index_state?: string | null
          internal_links_in?: number
          internal_links_out?: number
          is_orphan?: boolean
          meta_description?: string | null
          meta_title?: string | null
          opportunity_score?: number | null
          page_name?: string | null
          page_type?: string
          path?: string
          primary_keyword?: string | null
          psi_score?: number | null
          published_at?: string | null
          readability?: number | null
          repetition_score?: number | null
          robots?: string | null
          run_id?: string | null
          secondary_keyword?: string | null
          seo_score?: number | null
          sessions?: number
          shingles?: string[] | null
          signals?: Json
          signals_at?: string | null
          slug?: string | null
          source_id?: string | null
          source_table?: string | null
          stale_facts?: Json
          state?: string | null
          thin_content?: boolean
          updated_at?: string
          url?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "pruning_pages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pruning_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pruning_recommendations: {
        Row: {
          ai_summary: string | null
          approved_at: string | null
          approved_by: string | null
          competing_urls: string[]
          confidence: number | null
          created_at: string
          difficulty: string | null
          error: string | null
          executed_at: string | null
          expected_improvement: string | null
          id: string
          page_id: string | null
          page_type: string | null
          priority: string
          problem: string | null
          reason: string | null
          recommendation: string
          run_id: string | null
          sections: Json
          seo_impact: string | null
          solution: string | null
          status: string
          target_url: string | null
          updated_at: string
          url: string
        }
        Insert: {
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          competing_urls?: string[]
          confidence?: number | null
          created_at?: string
          difficulty?: string | null
          error?: string | null
          executed_at?: string | null
          expected_improvement?: string | null
          id?: string
          page_id?: string | null
          page_type?: string | null
          priority?: string
          problem?: string | null
          reason?: string | null
          recommendation: string
          run_id?: string | null
          sections?: Json
          seo_impact?: string | null
          solution?: string | null
          status?: string
          target_url?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          competing_urls?: string[]
          confidence?: number | null
          created_at?: string
          difficulty?: string | null
          error?: string | null
          executed_at?: string | null
          expected_improvement?: string | null
          id?: string
          page_id?: string | null
          page_type?: string | null
          priority?: string
          problem?: string | null
          reason?: string | null
          recommendation?: string
          run_id?: string | null
          sections?: Json
          seo_impact?: string | null
          solution?: string | null
          status?: string
          target_url?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pruning_recommendations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pruning_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruning_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pruning_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pruning_runs: {
        Row: {
          analyzed_count: number
          created_at: string
          error: string | null
          executed_count: number
          failed_count: number
          finished_at: string | null
          id: string
          impact_report: Json | null
          inventoried_count: number
          logs: Json
          phase: string
          scope: Json
          signals_count: number
          started_at: string | null
          status: string
          summary: Json
          total_pages: number
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          analyzed_count?: number
          created_at?: string
          error?: string | null
          executed_count?: number
          failed_count?: number
          finished_at?: string | null
          id?: string
          impact_report?: Json | null
          inventoried_count?: number
          logs?: Json
          phase?: string
          scope?: Json
          signals_count?: number
          started_at?: string | null
          status?: string
          summary?: Json
          total_pages?: number
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          analyzed_count?: number
          created_at?: string
          error?: string | null
          executed_count?: number
          failed_count?: number
          finished_at?: string | null
          id?: string
          impact_report?: Json | null
          inventoried_count?: number
          logs?: Json
          phase?: string
          scope?: Json
          signals_count?: number
          started_at?: string | null
          status?: string
          summary?: Json
          total_pages?: number
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_broadcasts: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          error_text: string | null
          failed_count: number
          id: string
          image_url: string | null
          link_url: string | null
          sent_count: number
          status: string
          title: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          error_text?: string | null
          failed_count?: number
          id?: string
          image_url?: string | null
          link_url?: string | null
          sent_count?: number
          status?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          error_text?: string | null
          failed_count?: number
          id?: string
          image_url?: string | null
          link_url?: string | null
          sent_count?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      push_subscribers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          page_path: string | null
          token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          page_path?: string | null
          token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          page_path?: string | null
          token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quant_formula_progress: {
        Row: {
          accuracy_pct: number | null
          bookmarked: boolean
          formula_id: string
          last_revised_at: string | null
          next_review_at: string | null
          status: Database["public"]["Enums"]["quant_progress_status"]
          times_attempted: number
          times_correct: number
          times_revised: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_pct?: number | null
          bookmarked?: boolean
          formula_id: string
          last_revised_at?: string | null
          next_review_at?: string | null
          status?: Database["public"]["Enums"]["quant_progress_status"]
          times_attempted?: number
          times_correct?: number
          times_revised?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_pct?: number | null
          bookmarked?: boolean
          formula_id?: string
          last_revised_at?: string | null
          next_review_at?: string | null
          status?: Database["public"]["Enums"]["quant_progress_status"]
          times_attempted?: number
          times_correct?: number
          times_revised?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quant_formula_progress_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "quant_formulas"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_formulas: {
        Row: {
          common_mistakes: string[]
          created_at: string
          derivation: string | null
          difficulty: Database["public"]["Enums"]["quant_difficulty"]
          exam_tags: string[]
          examples: Json
          explanation: string
          expression: string
          expression_latex: string | null
          faqs: Json
          frequency_score: number
          id: string
          importance: number
          is_high_weightage: boolean
          is_shortcut: boolean
          name: string
          notes: string | null
          published: boolean
          related_slugs: string[]
          seo_description: string | null
          seo_keywords: string[]
          seo_title: string | null
          shortcuts: string[]
          slug: string
          topic_slug: string
          updated_at: string
        }
        Insert: {
          common_mistakes?: string[]
          created_at?: string
          derivation?: string | null
          difficulty?: Database["public"]["Enums"]["quant_difficulty"]
          exam_tags?: string[]
          examples?: Json
          explanation?: string
          expression: string
          expression_latex?: string | null
          faqs?: Json
          frequency_score?: number
          id?: string
          importance?: number
          is_high_weightage?: boolean
          is_shortcut?: boolean
          name: string
          notes?: string | null
          published?: boolean
          related_slugs?: string[]
          seo_description?: string | null
          seo_keywords?: string[]
          seo_title?: string | null
          shortcuts?: string[]
          slug: string
          topic_slug: string
          updated_at?: string
        }
        Update: {
          common_mistakes?: string[]
          created_at?: string
          derivation?: string | null
          difficulty?: Database["public"]["Enums"]["quant_difficulty"]
          exam_tags?: string[]
          examples?: Json
          explanation?: string
          expression?: string
          expression_latex?: string | null
          faqs?: Json
          frequency_score?: number
          id?: string
          importance?: number
          is_high_weightage?: boolean
          is_shortcut?: boolean
          name?: string
          notes?: string | null
          published?: boolean
          related_slugs?: string[]
          seo_description?: string | null
          seo_keywords?: string[]
          seo_title?: string | null
          shortcuts?: string[]
          slug?: string
          topic_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      quant_practice_attempts: {
        Row: {
          ai_explanation: string | null
          correct_index: number
          created_at: string
          difficulty: Database["public"]["Enums"]["quant_difficulty"]
          formula_id: string
          id: string
          is_correct: boolean | null
          options: Json
          question_text: string
          user_answer_index: number | null
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          correct_index: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quant_difficulty"]
          formula_id: string
          id?: string
          is_correct?: boolean | null
          options: Json
          question_text: string
          user_answer_index?: number | null
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quant_difficulty"]
          formula_id?: string
          id?: string
          is_correct?: boolean | null
          options?: Json
          question_text?: string
          user_answer_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quant_practice_attempts_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "quant_formulas"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_revision_sessions: {
        Row: {
          completed_ids: string[]
          created_at: string
          duration_seconds: number
          formula_ids: string[]
          id: string
          session_date: string
          streak_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_ids?: string[]
          created_at?: string
          duration_seconds?: number
          formula_ids?: string[]
          id?: string
          session_date?: string
          streak_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_ids?: string[]
          created_at?: string
          duration_seconds?: number
          formula_ids?: string[]
          id?: string
          session_date?: string
          streak_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quant_streaks: {
        Row: {
          current_streak: number
          daily_target_formulas: number
          last_active_date: string | null
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          daily_target_formulas?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          daily_target_formulas?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quant_topics: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_slug: string | null
          slug: string
          sort_order: number
          updated_at: string
          weightage: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_slug?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          weightage?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_slug?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          weightage?: number
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
      seo_audit_findings: {
        Row: {
          auto_fixed: boolean
          category: string
          created_at: string
          fix_action: string | null
          fix_suggestion: string | null
          id: string
          issue_code: string
          message: string
          meta: Json
          page_type: string | null
          record_id: string | null
          run_id: string
          severity: string
          url: string | null
        }
        Insert: {
          auto_fixed?: boolean
          category: string
          created_at?: string
          fix_action?: string | null
          fix_suggestion?: string | null
          id?: string
          issue_code: string
          message: string
          meta?: Json
          page_type?: string | null
          record_id?: string | null
          run_id: string
          severity?: string
          url?: string | null
        }
        Update: {
          auto_fixed?: boolean
          category?: string
          created_at?: string
          fix_action?: string | null
          fix_suggestion?: string | null
          id?: string
          issue_code?: string
          message?: string
          meta?: Json
          page_type?: string | null
          record_id?: string | null
          run_id?: string
          severity?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_runs: {
        Row: {
          created_at: string
          critical_issues: number
          error: string | null
          finished_at: string | null
          id: string
          info_issues: number
          scope: string
          started_at: string
          started_by: string | null
          status: string
          summary: Json
          total_issues: number
          total_urls: number
          warning_issues: number
        }
        Insert: {
          created_at?: string
          critical_issues?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          info_issues?: number
          scope?: string
          started_at?: string
          started_by?: string | null
          status?: string
          summary?: Json
          total_issues?: number
          total_urls?: number
          warning_issues?: number
        }
        Update: {
          created_at?: string
          critical_issues?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          info_issues?: number
          scope?: string
          started_at?: string
          started_by?: string | null
          status?: string
          summary?: Json
          total_issues?: number
          total_urls?: number
          warning_issues?: number
        }
        Relationships: []
      }
      seo_engine_settings: {
        Row: {
          auto_apply_safe_actions: boolean
          cannibalization_min_overlap: number
          created_at: string
          decay_click_drop_pct: number
          decay_enabled: boolean
          decay_min_impressions: number
          entity_enabled: boolean
          gsc_site_url: string | null
          id: boolean
          intent_enabled: boolean
          max_actions_per_run: number
          postpublish_enabled: boolean
          updated_at: string
        }
        Insert: {
          auto_apply_safe_actions?: boolean
          cannibalization_min_overlap?: number
          created_at?: string
          decay_click_drop_pct?: number
          decay_enabled?: boolean
          decay_min_impressions?: number
          entity_enabled?: boolean
          gsc_site_url?: string | null
          id?: boolean
          intent_enabled?: boolean
          max_actions_per_run?: number
          postpublish_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auto_apply_safe_actions?: boolean
          cannibalization_min_overlap?: number
          created_at?: string
          decay_click_drop_pct?: number
          decay_enabled?: boolean
          decay_min_impressions?: number
          entity_enabled?: boolean
          gsc_site_url?: string | null
          id?: boolean
          intent_enabled?: boolean
          max_actions_per_run?: number
          postpublish_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      seo_entities: {
        Row: {
          aliases: Json
          created_at: string
          description: string | null
          entity_type: string
          id: string
          importance: number
          name: string
          normalized_name: string
          official_url: string | null
          page_count: number
          same_as: Json
          updated_at: string
        }
        Insert: {
          aliases?: Json
          created_at?: string
          description?: string | null
          entity_type?: string
          id?: string
          importance?: number
          name: string
          normalized_name: string
          official_url?: string | null
          page_count?: number
          same_as?: Json
          updated_at?: string
        }
        Update: {
          aliases?: Json
          created_at?: string
          description?: string | null
          entity_type?: string
          id?: string
          importance?: number
          name?: string
          normalized_name?: string
          official_url?: string | null
          page_count?: number
          same_as?: Json
          updated_at?: string
        }
        Relationships: []
      }
      seo_gsc_daily: {
        Row: {
          avg_position: number | null
          captured_on: string
          clicks: number
          ctr: number | null
          impressions: number
          synced_at: string
        }
        Insert: {
          avg_position?: number | null
          captured_on: string
          clicks?: number
          ctr?: number | null
          impressions?: number
          synced_at?: string
        }
        Update: {
          avg_position?: number | null
          captured_on?: string
          clicks?: number
          ctr?: number | null
          impressions?: number
          synced_at?: string
        }
        Relationships: []
      }
      seo_health_page_results: {
        Row: {
          canonical_url: string | null
          checked_at: string
          description: string | null
          description_length: number | null
          h1_count: number | null
          has_canonical: boolean | null
          html_kb: number | null
          http_status: number | null
          id: string
          images_missing_alt: number | null
          is_indexable: boolean | null
          issues: Json
          page_type: string
          response_ms: number | null
          robots_meta: string | null
          run_id: string
          seo_score: number | null
          slug: string | null
          speed_score: number | null
          status: string
          title: string | null
          title_length: number | null
          url: string
          x_robots_tag: string | null
        }
        Insert: {
          canonical_url?: string | null
          checked_at?: string
          description?: string | null
          description_length?: number | null
          h1_count?: number | null
          has_canonical?: boolean | null
          html_kb?: number | null
          http_status?: number | null
          id?: string
          images_missing_alt?: number | null
          is_indexable?: boolean | null
          issues?: Json
          page_type: string
          response_ms?: number | null
          robots_meta?: string | null
          run_id: string
          seo_score?: number | null
          slug?: string | null
          speed_score?: number | null
          status?: string
          title?: string | null
          title_length?: number | null
          url: string
          x_robots_tag?: string | null
        }
        Update: {
          canonical_url?: string | null
          checked_at?: string
          description?: string | null
          description_length?: number | null
          h1_count?: number | null
          has_canonical?: boolean | null
          html_kb?: number | null
          http_status?: number | null
          id?: string
          images_missing_alt?: number | null
          is_indexable?: boolean | null
          issues?: Json
          page_type?: string
          response_ms?: number | null
          robots_meta?: string | null
          run_id?: string
          seo_score?: number | null
          slug?: string | null
          speed_score?: number | null
          status?: string
          title?: string | null
          title_length?: number | null
          url?: string
          x_robots_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_health_page_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_health_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_health_runs: {
        Row: {
          avg_html_kb: number | null
          avg_response_ms: number | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          pages_checked: number
          pages_failing: number
          pages_passing: number
          pages_total: number
          pages_warning: number
          scope: string
          started_at: string
          status: string
          summary: Json
          triggered_by: string | null
        }
        Insert: {
          avg_html_kb?: number | null
          avg_response_ms?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          pages_checked?: number
          pages_failing?: number
          pages_passing?: number
          pages_total?: number
          pages_warning?: number
          scope?: string
          started_at?: string
          status?: string
          summary?: Json
          triggered_by?: string | null
        }
        Update: {
          avg_html_kb?: number | null
          avg_response_ms?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          pages_checked?: number
          pages_failing?: number
          pages_passing?: number
          pages_total?: number
          pages_warning?: number
          scope?: string
          started_at?: string
          status?: string
          summary?: Json
          triggered_by?: string | null
        }
        Relationships: []
      }
      seo_intel_activity: {
        Row: {
          created_at: string
          data_source: string | null
          detail: string | null
          event: string
          id: string
          job_id: string | null
          job_type: string | null
          level: string
          meta: Json
          records: number | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          detail?: string | null
          event: string
          id?: string
          job_id?: string | null
          job_type?: string | null
          level?: string
          meta?: Json
          records?: number | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          detail?: string | null
          event?: string
          id?: string
          job_id?: string | null
          job_type?: string | null
          level?: string
          meta?: Json
          records?: number | null
        }
        Relationships: []
      }
      seo_intel_anomalies: {
        Row: {
          classification: string | null
          confidence: string
          created_at: string
          detected_on: string
          deviation_sigma: number | null
          evidence: Json
          expected: number | null
          id: string
          keyword: string | null
          metric: string
          observed: number | null
          path: string | null
          scope: string
          severity: string
        }
        Insert: {
          classification?: string | null
          confidence?: string
          created_at?: string
          detected_on?: string
          deviation_sigma?: number | null
          evidence?: Json
          expected?: number | null
          id?: string
          keyword?: string | null
          metric: string
          observed?: number | null
          path?: string | null
          scope?: string
          severity?: string
        }
        Update: {
          classification?: string | null
          confidence?: string
          created_at?: string
          detected_on?: string
          deviation_sigma?: number | null
          evidence?: Json
          expected?: number | null
          id?: string
          keyword?: string | null
          metric?: string
          observed?: number | null
          path?: string | null
          scope?: string
          severity?: string
        }
        Relationships: []
      }
      seo_intel_audit: {
        Row: {
          action: string
          actor: string | null
          actor_label: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          data_source: string | null
          entity: string | null
          entity_id: string | null
          id: string
          path: string | null
          recommendation_id: string | null
          verification_result: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_label?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          data_source?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          path?: string | null
          recommendation_id?: string | null
          verification_result?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_label?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          data_source?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          path?: string | null
          recommendation_id?: string | null
          verification_result?: string | null
        }
        Relationships: []
      }
      seo_intel_cannibalization: {
        Row: {
          cluster_key: string
          computed_at: string
          confidence: string
          evidence: Json
          id: string
          keyword: string | null
          locale: string
          overlap_score: number | null
          paths: string[]
          recommendation: string | null
          recommended_action: string | null
          shared_keywords: string[] | null
          status: string
          stronger_path: string | null
          weaker_paths: string[] | null
        }
        Insert: {
          cluster_key: string
          computed_at?: string
          confidence?: string
          evidence?: Json
          id?: string
          keyword?: string | null
          locale?: string
          overlap_score?: number | null
          paths?: string[]
          recommendation?: string | null
          recommended_action?: string | null
          shared_keywords?: string[] | null
          status?: string
          stronger_path?: string | null
          weaker_paths?: string[] | null
        }
        Update: {
          cluster_key?: string
          computed_at?: string
          confidence?: string
          evidence?: Json
          id?: string
          keyword?: string | null
          locale?: string
          overlap_score?: number | null
          paths?: string[]
          recommendation?: string | null
          recommended_action?: string | null
          shared_keywords?: string[] | null
          status?: string
          stronger_path?: string | null
          weaker_paths?: string[] | null
        }
        Relationships: []
      }
      seo_intel_competitor_history: {
        Row: {
          captured_on: string
          created_at: string
          data_source: string | null
          domain: string
          id: string
          keyword: string | null
          our_position: number | null
          position: number | null
        }
        Insert: {
          captured_on?: string
          created_at?: string
          data_source?: string | null
          domain: string
          id?: string
          keyword?: string | null
          our_position?: number | null
          position?: number | null
        }
        Update: {
          captured_on?: string
          created_at?: string
          data_source?: string | null
          domain?: string
          id?: string
          keyword?: string | null
          our_position?: number | null
          position?: number | null
        }
        Relationships: []
      }
      seo_intel_competitors: {
        Row: {
          content_gaps: Json | null
          created_at: string
          data_source: string | null
          domain: string
          faq_count: number | null
          headings: Json | null
          id: string
          keyword: string | null
          last_checked_at: string | null
          last_updated_on: string | null
          meta_description: string | null
          our_path: string | null
          our_position: number | null
          schema_types: string[] | null
          serp_features: string[] | null
          their_position: number | null
          their_url: string | null
          title: string | null
          updated_at: string
          what_to_change: string | null
          why_outranking: string | null
          word_count: number | null
        }
        Insert: {
          content_gaps?: Json | null
          created_at?: string
          data_source?: string | null
          domain: string
          faq_count?: number | null
          headings?: Json | null
          id?: string
          keyword?: string | null
          last_checked_at?: string | null
          last_updated_on?: string | null
          meta_description?: string | null
          our_path?: string | null
          our_position?: number | null
          schema_types?: string[] | null
          serp_features?: string[] | null
          their_position?: number | null
          their_url?: string | null
          title?: string | null
          updated_at?: string
          what_to_change?: string | null
          why_outranking?: string | null
          word_count?: number | null
        }
        Update: {
          content_gaps?: Json | null
          created_at?: string
          data_source?: string | null
          domain?: string
          faq_count?: number | null
          headings?: Json | null
          id?: string
          keyword?: string | null
          last_checked_at?: string | null
          last_updated_on?: string | null
          meta_description?: string | null
          our_path?: string | null
          our_position?: number | null
          schema_types?: string[] | null
          serp_features?: string[] | null
          their_position?: number | null
          their_url?: string | null
          title?: string | null
          updated_at?: string
          what_to_change?: string | null
          why_outranking?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      seo_intel_console_tasks: {
        Row: {
          action: string
          coverage_state: string | null
          created_at: string
          id: string
          inspection: Json | null
          last_inspected_at: string | null
          reason: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          url: string
          verified_at: string | null
        }
        Insert: {
          action?: string
          coverage_state?: string | null
          created_at?: string
          id?: string
          inspection?: Json | null
          last_inspected_at?: string | null
          reason?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          url: string
          verified_at?: string | null
        }
        Update: {
          action?: string
          coverage_state?: string | null
          created_at?: string
          id?: string
          inspection?: Json | null
          last_inspected_at?: string | null
          reason?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          url?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      seo_intel_content_gaps: {
        Row: {
          competitor_domain: string | null
          competitor_url: string | null
          computed_at: string
          confidence: string
          description: string | null
          evidence: Json
          gap_type: string
          id: string
          keyword: string | null
          path: string | null
          priority: string
          status: string
          title: string
          value_score: number | null
        }
        Insert: {
          competitor_domain?: string | null
          competitor_url?: string | null
          computed_at?: string
          confidence?: string
          description?: string | null
          evidence?: Json
          gap_type: string
          id?: string
          keyword?: string | null
          path?: string | null
          priority?: string
          status?: string
          title: string
          value_score?: number | null
        }
        Update: {
          competitor_domain?: string | null
          competitor_url?: string | null
          computed_at?: string
          confidence?: string
          description?: string | null
          evidence?: Json
          gap_type?: string
          id?: string
          keyword?: string | null
          path?: string | null
          priority?: string
          status?: string
          title?: string
          value_score?: number | null
        }
        Relationships: []
      }
      seo_intel_ctr_intel: {
        Row: {
          benchmark_ctr: number | null
          benchmark_source: string | null
          computed_at: string
          confidence: string
          country: string | null
          ctr: number | null
          ctr_delta_pct: number | null
          detail: string | null
          device: string | null
          diagnosis: string | null
          evidence: Json
          id: string
          impressions: number | null
          path: string | null
          position: number | null
          query: string | null
        }
        Insert: {
          benchmark_ctr?: number | null
          benchmark_source?: string | null
          computed_at?: string
          confidence?: string
          country?: string | null
          ctr?: number | null
          ctr_delta_pct?: number | null
          detail?: string | null
          device?: string | null
          diagnosis?: string | null
          evidence?: Json
          id?: string
          impressions?: number | null
          path?: string | null
          position?: number | null
          query?: string | null
        }
        Update: {
          benchmark_ctr?: number | null
          benchmark_source?: string | null
          computed_at?: string
          confidence?: string
          country?: string | null
          ctr?: number | null
          ctr_delta_pct?: number | null
          detail?: string | null
          device?: string | null
          diagnosis?: string | null
          evidence?: Json
          id?: string
          impressions?: number | null
          path?: string | null
          position?: number | null
          query?: string | null
        }
        Relationships: []
      }
      seo_intel_daily_snapshots: {
        Row: {
          applied_changes: number | null
          avg_health: number | null
          avg_lcp_ms: number | null
          avg_position: number | null
          avg_psi_perf: number | null
          captured_on: string
          clicks: number | null
          coverage: Json
          created_at: string
          ctr: number | null
          data_sources: Json
          gains: number | null
          id: string
          impressions: number | null
          indexed_pages: number | null
          losses: number | null
          not_indexed_pages: number | null
          open_recommendations: number | null
          pages_tracked: number | null
          rank_1: number | null
          rank_2: number | null
          rank_3: number | null
          ranking_keywords: number | null
          top_10: number | null
          top_20: number | null
          top_5: number | null
        }
        Insert: {
          applied_changes?: number | null
          avg_health?: number | null
          avg_lcp_ms?: number | null
          avg_position?: number | null
          avg_psi_perf?: number | null
          captured_on: string
          clicks?: number | null
          coverage?: Json
          created_at?: string
          ctr?: number | null
          data_sources?: Json
          gains?: number | null
          id?: string
          impressions?: number | null
          indexed_pages?: number | null
          losses?: number | null
          not_indexed_pages?: number | null
          open_recommendations?: number | null
          pages_tracked?: number | null
          rank_1?: number | null
          rank_2?: number | null
          rank_3?: number | null
          ranking_keywords?: number | null
          top_10?: number | null
          top_20?: number | null
          top_5?: number | null
        }
        Update: {
          applied_changes?: number | null
          avg_health?: number | null
          avg_lcp_ms?: number | null
          avg_position?: number | null
          avg_psi_perf?: number | null
          captured_on?: string
          clicks?: number | null
          coverage?: Json
          created_at?: string
          ctr?: number | null
          data_sources?: Json
          gains?: number | null
          id?: string
          impressions?: number | null
          indexed_pages?: number | null
          losses?: number | null
          not_indexed_pages?: number | null
          open_recommendations?: number | null
          pages_tracked?: number | null
          rank_1?: number | null
          rank_2?: number | null
          rank_3?: number | null
          ranking_keywords?: number | null
          top_10?: number | null
          top_20?: number | null
          top_5?: number | null
        }
        Relationships: []
      }
      seo_intel_demand: {
        Row: {
          acceleration_30d: number | null
          computed_at: string
          discrepancy: Json | null
          emerging: boolean
          evidence: Json
          final_volume: number | null
          final_volume_source: string | null
          historical: Json | null
          id: string
          impressions_change_pct: number | null
          keyword: string
          locale: string
          seasonality: Json | null
          sources: Json
          trend_direction: string | null
          verdict: string | null
          volume_confidence: string
        }
        Insert: {
          acceleration_30d?: number | null
          computed_at?: string
          discrepancy?: Json | null
          emerging?: boolean
          evidence?: Json
          final_volume?: number | null
          final_volume_source?: string | null
          historical?: Json | null
          id?: string
          impressions_change_pct?: number | null
          keyword: string
          locale?: string
          seasonality?: Json | null
          sources?: Json
          trend_direction?: string | null
          verdict?: string | null
          volume_confidence?: string
        }
        Update: {
          acceleration_30d?: number | null
          computed_at?: string
          discrepancy?: Json | null
          emerging?: boolean
          evidence?: Json
          final_volume?: number | null
          final_volume_source?: string | null
          historical?: Json | null
          id?: string
          impressions_change_pct?: number | null
          keyword?: string
          locale?: string
          seasonality?: Json | null
          sources?: Json
          trend_direction?: string | null
          verdict?: string | null
          volume_confidence?: string
        }
        Relationships: []
      }
      seo_intel_entities: {
        Row: {
          clicks: number | null
          cluster: string | null
          computed_at: string
          coverage_state: string
          entity: string
          entity_type: string | null
          evidence: Json
          id: string
          impressions: number | null
          keyword_count: number
          page_count: number
          pages: string[] | null
          recommendation: string | null
          score: number | null
        }
        Insert: {
          clicks?: number | null
          cluster?: string | null
          computed_at?: string
          coverage_state?: string
          entity: string
          entity_type?: string | null
          evidence?: Json
          id?: string
          impressions?: number | null
          keyword_count?: number
          page_count?: number
          pages?: string[] | null
          recommendation?: string | null
          score?: number | null
        }
        Update: {
          clicks?: number | null
          cluster?: string | null
          computed_at?: string
          coverage_state?: string
          entity?: string
          entity_type?: string | null
          evidence?: Json
          id?: string
          impressions?: number | null
          keyword_count?: number
          page_count?: number
          pages?: string[] | null
          recommendation?: string | null
          score?: number | null
        }
        Relationships: []
      }
      seo_intel_experiments: {
        Row: {
          after_value: string | null
          ai_analysis: string | null
          attribution: Json | null
          baseline_captured_on: string | null
          baseline_clicks: number | null
          baseline_impressions: number | null
          baseline_position: number | null
          before_value: string | null
          change_summary: string | null
          change_type: string | null
          changed_on: string
          clicks_delta: number | null
          created_at: string
          data_source: string | null
          id: string
          impact_confidence: string | null
          keyword: string | null
          measure_after: string | null
          outcome: string | null
          path: string | null
          position_delta: number | null
          recommendation_id: string | null
          result_captured_on: string | null
          result_clicks: number | null
          result_impressions: number | null
          result_position: number | null
          updated_at: string
        }
        Insert: {
          after_value?: string | null
          ai_analysis?: string | null
          attribution?: Json | null
          baseline_captured_on?: string | null
          baseline_clicks?: number | null
          baseline_impressions?: number | null
          baseline_position?: number | null
          before_value?: string | null
          change_summary?: string | null
          change_type?: string | null
          changed_on?: string
          clicks_delta?: number | null
          created_at?: string
          data_source?: string | null
          id?: string
          impact_confidence?: string | null
          keyword?: string | null
          measure_after?: string | null
          outcome?: string | null
          path?: string | null
          position_delta?: number | null
          recommendation_id?: string | null
          result_captured_on?: string | null
          result_clicks?: number | null
          result_impressions?: number | null
          result_position?: number | null
          updated_at?: string
        }
        Update: {
          after_value?: string | null
          ai_analysis?: string | null
          attribution?: Json | null
          baseline_captured_on?: string | null
          baseline_clicks?: number | null
          baseline_impressions?: number | null
          baseline_position?: number | null
          before_value?: string | null
          change_summary?: string | null
          change_type?: string | null
          changed_on?: string
          clicks_delta?: number | null
          created_at?: string
          data_source?: string | null
          id?: string
          impact_confidence?: string | null
          keyword?: string | null
          measure_after?: string | null
          outcome?: string | null
          path?: string | null
          position_delta?: number | null
          recommendation_id?: string | null
          result_captured_on?: string | null
          result_clicks?: number | null
          result_impressions?: number | null
          result_position?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_intel_forecasts: {
        Row: {
          competition: number | null
          computed_at: string
          confidence: string
          current_position: number | null
          demand_direction: string | null
          factors: Json
          forecast_direction: string | null
          horizon_days: number
          id: string
          keyword: string
          locale: string
          momentum_30d: number | null
          opportunity: string | null
          path: string | null
          probability: number | null
          risk: string | null
          target_threshold: string | null
        }
        Insert: {
          competition?: number | null
          computed_at?: string
          confidence?: string
          current_position?: number | null
          demand_direction?: string | null
          factors?: Json
          forecast_direction?: string | null
          horizon_days?: number
          id?: string
          keyword: string
          locale?: string
          momentum_30d?: number | null
          opportunity?: string | null
          path?: string | null
          probability?: number | null
          risk?: string | null
          target_threshold?: string | null
        }
        Update: {
          competition?: number | null
          computed_at?: string
          confidence?: string
          current_position?: number | null
          demand_direction?: string | null
          factors?: Json
          forecast_direction?: string | null
          horizon_days?: number
          id?: string
          keyword?: string
          locale?: string
          momentum_30d?: number | null
          opportunity?: string | null
          path?: string | null
          probability?: number | null
          risk?: string | null
          target_threshold?: string | null
        }
        Relationships: []
      }
      seo_intel_graph_edges: {
        Row: {
          edge: string
          evidence: Json
          from_id: string
          from_type: string
          id: string
          to_id: string
          to_type: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          edge: string
          evidence?: Json
          from_id: string
          from_type: string
          id?: string
          to_id: string
          to_type: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          edge?: string
          evidence?: Json
          from_id?: string
          from_type?: string
          id?: string
          to_id?: string
          to_type?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      seo_intel_health_history: {
        Row: {
          applied_24h: number | null
          applied_total: number | null
          avg_aeo: number | null
          avg_health: number | null
          breakdown: Json
          captured_at: string
          delta_health: number | null
          id: string
          issues_open: number | null
          pages_below_70: number | null
          pages_scored: number | null
          pending_total: number | null
          reason: string | null
        }
        Insert: {
          applied_24h?: number | null
          applied_total?: number | null
          avg_aeo?: number | null
          avg_health?: number | null
          breakdown?: Json
          captured_at?: string
          delta_health?: number | null
          id?: string
          issues_open?: number | null
          pages_below_70?: number | null
          pages_scored?: number | null
          pending_total?: number | null
          reason?: string | null
        }
        Update: {
          applied_24h?: number | null
          applied_total?: number | null
          avg_aeo?: number | null
          avg_health?: number | null
          breakdown?: Json
          captured_at?: string
          delta_health?: number | null
          id?: string
          issues_open?: number | null
          pages_below_70?: number | null
          pages_scored?: number | null
          pending_total?: number | null
          reason?: string | null
        }
        Relationships: []
      }
      seo_intel_intent: {
        Row: {
          computed_at: string
          id: string
          intent: string | null
          intent_confidence: string
          keyword: string
          locale: string
          previous_intent: string | null
          recommended_target_path: string | null
          secondary_intents: string[] | null
          serp_intent: string | null
          shift_detected: boolean
          shift_evidence: Json | null
        }
        Insert: {
          computed_at?: string
          id?: string
          intent?: string | null
          intent_confidence?: string
          keyword: string
          locale?: string
          previous_intent?: string | null
          recommended_target_path?: string | null
          secondary_intents?: string[] | null
          serp_intent?: string | null
          shift_detected?: boolean
          shift_evidence?: Json | null
        }
        Update: {
          computed_at?: string
          id?: string
          intent?: string | null
          intent_confidence?: string
          keyword?: string
          locale?: string
          previous_intent?: string | null
          recommended_target_path?: string | null
          secondary_intents?: string[] | null
          serp_intent?: string | null
          shift_detected?: boolean
          shift_evidence?: Json | null
        }
        Relationships: []
      }
      seo_intel_jobs: {
        Row: {
          created_at: string
          data_source: string | null
          dedupe_key: string | null
          error: string | null
          errors: Json
          finished_at: string | null
          id: string
          job_type: string
          lease_until: string | null
          max_retries: number
          payload: Json
          priority: number
          progress: Json
          records_processed: number
          retry_count: number
          scheduled_for: string
          started_at: string | null
          status: string
          triggered_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          dedupe_key?: string | null
          error?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          job_type: string
          lease_until?: string | null
          max_retries?: number
          payload?: Json
          priority?: number
          progress?: Json
          records_processed?: number
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_source?: string | null
          dedupe_key?: string | null
          error?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          job_type?: string
          lease_until?: string | null
          max_retries?: number
          payload?: Json
          priority?: number
          progress?: Json
          records_processed?: number
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          triggered_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_intel_keywords: {
        Row: {
          ai_model: string | null
          best_position: number | null
          clicks: number | null
          competition: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          current_position: number | null
          difficulty: number | null
          difficulty_source: string | null
          discovered_from: string | null
          discovery_source: string | null
          first_seen_on: string | null
          id: string
          impressions: number | null
          injected_at: string | null
          intent: string | null
          is_tracked: boolean
          keyword: string
          keyword_kind: string | null
          last_checked_at: string | null
          locale: string
          monthly_trend: Json | null
          opportunity_score: number | null
          position_change: number | null
          position_source: string | null
          previous_position: number | null
          research_reason: string | null
          research_round: number | null
          research_source_path: string | null
          researched_at: string | null
          search_volume: number | null
          target_path: string | null
          top_competitor_domain: string | null
          updated_at: string
          volume_source: string | null
        }
        Insert: {
          ai_model?: string | null
          best_position?: number | null
          clicks?: number | null
          competition?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          current_position?: number | null
          difficulty?: number | null
          difficulty_source?: string | null
          discovered_from?: string | null
          discovery_source?: string | null
          first_seen_on?: string | null
          id?: string
          impressions?: number | null
          injected_at?: string | null
          intent?: string | null
          is_tracked?: boolean
          keyword: string
          keyword_kind?: string | null
          last_checked_at?: string | null
          locale?: string
          monthly_trend?: Json | null
          opportunity_score?: number | null
          position_change?: number | null
          position_source?: string | null
          previous_position?: number | null
          research_reason?: string | null
          research_round?: number | null
          research_source_path?: string | null
          researched_at?: string | null
          search_volume?: number | null
          target_path?: string | null
          top_competitor_domain?: string | null
          updated_at?: string
          volume_source?: string | null
        }
        Update: {
          ai_model?: string | null
          best_position?: number | null
          clicks?: number | null
          competition?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          current_position?: number | null
          difficulty?: number | null
          difficulty_source?: string | null
          discovered_from?: string | null
          discovery_source?: string | null
          first_seen_on?: string | null
          id?: string
          impressions?: number | null
          injected_at?: string | null
          intent?: string | null
          is_tracked?: boolean
          keyword?: string
          keyword_kind?: string | null
          last_checked_at?: string | null
          locale?: string
          monthly_trend?: Json | null
          opportunity_score?: number | null
          position_change?: number | null
          position_source?: string | null
          previous_position?: number | null
          research_reason?: string | null
          research_round?: number | null
          research_source_path?: string | null
          researched_at?: string | null
          search_volume?: number | null
          target_path?: string | null
          top_competitor_domain?: string | null
          updated_at?: string
          volume_source?: string | null
        }
        Relationships: []
      }
      seo_intel_kw_sources: {
        Row: {
          confidence: string | null
          created_at: string
          id: string
          keyword: string
          label: string | null
          locale: string
          metric: string
          observed_at: string
          raw: Json
          source: string
          value: number | null
          value_text: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          id?: string
          keyword: string
          label?: string | null
          locale?: string
          metric: string
          observed_at?: string
          raw?: Json
          source: string
          value?: number | null
          value_text?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          id?: string
          keyword?: string
          label?: string | null
          locale?: string
          metric?: string
          observed_at?: string
          raw?: Json
          source?: string
          value?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      seo_intel_link_opportunities: {
        Row: {
          anchor_suggestion: string | null
          computed_at: string
          confidence: string
          context_hint: string | null
          evidence: Json
          id: string
          relationship: string | null
          score: number | null
          source_path: string
          status: string
          target_importance: number | null
          target_path: string
        }
        Insert: {
          anchor_suggestion?: string | null
          computed_at?: string
          confidence?: string
          context_hint?: string | null
          evidence?: Json
          id?: string
          relationship?: string | null
          score?: number | null
          source_path: string
          status?: string
          target_importance?: number | null
          target_path: string
        }
        Update: {
          anchor_suggestion?: string | null
          computed_at?: string
          confidence?: string
          context_hint?: string | null
          evidence?: Json
          id?: string
          relationship?: string | null
          score?: number | null
          source_path?: string
          status?: string
          target_importance?: number | null
          target_path?: string
        }
        Relationships: []
      }
      seo_intel_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          keyword: string | null
          kind: string
          meta: Json
          path: string | null
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          keyword?: string | null
          kind: string
          meta?: Json
          path?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          keyword?: string | null
          kind?: string
          meta?: Json
          path?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      seo_intel_opportunities: {
        Row: {
          computed_at: string
          confidence: string
          factors: Json
          id: string
          keyword: string | null
          kind: string
          next_action: string | null
          path: string | null
          priority_rank: number | null
          rationale: string | null
          score: number | null
          status: string
          title: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          factors?: Json
          id?: string
          keyword?: string | null
          kind: string
          next_action?: string | null
          path?: string | null
          priority_rank?: number | null
          rationale?: string | null
          score?: number | null
          status?: string
          title: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          factors?: Json
          id?: string
          keyword?: string | null
          kind?: string
          next_action?: string | null
          path?: string | null
          priority_rank?: number | null
          rationale?: string | null
          score?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      seo_intel_page_history: {
        Row: {
          avg_position: number | null
          captured_on: string
          clicks: number | null
          created_at: string
          ctr: number | null
          data_source: string
          health_score: number | null
          id: string
          impressions: number | null
          indexed_status: string | null
          path: string
        }
        Insert: {
          avg_position?: number | null
          captured_on?: string
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data_source?: string
          health_score?: number | null
          id?: string
          impressions?: number | null
          indexed_status?: string | null
          path: string
        }
        Update: {
          avg_position?: number | null
          captured_on?: string
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data_source?: string
          health_score?: number | null
          id?: string
          impressions?: number | null
          indexed_status?: string | null
          path?: string
        }
        Relationships: []
      }
      seo_intel_page_profiles: {
        Row: {
          competitive_gap_score: number | null
          confidence: string
          gap_factors: Json
          id: string
          path: string
          profile: Json
          summary: string | null
          updated_at: string
        }
        Insert: {
          competitive_gap_score?: number | null
          confidence?: string
          gap_factors?: Json
          id?: string
          path: string
          profile?: Json
          summary?: string | null
          updated_at?: string
        }
        Update: {
          competitive_gap_score?: number | null
          confidence?: string
          gap_factors?: Json
          id?: string
          path?: string
          profile?: Json
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_intel_page_scores: {
        Row: {
          aeo_after: number | null
          aeo_before: number | null
          change_type: string | null
          created_at: string
          detail: string | null
          fixes_applied: number
          health_after: number | null
          health_before: number | null
          id: string
          issues_after: number | null
          issues_before: number | null
          measured_at: string | null
          path: string
          recommendation_id: string | null
          status: string
        }
        Insert: {
          aeo_after?: number | null
          aeo_before?: number | null
          change_type?: string | null
          created_at?: string
          detail?: string | null
          fixes_applied?: number
          health_after?: number | null
          health_before?: number | null
          id?: string
          issues_after?: number | null
          issues_before?: number | null
          measured_at?: string | null
          path: string
          recommendation_id?: string | null
          status?: string
        }
        Update: {
          aeo_after?: number | null
          aeo_before?: number | null
          change_type?: string | null
          created_at?: string
          detail?: string | null
          fixes_applied?: number
          health_after?: number | null
          health_before?: number | null
          id?: string
          issues_after?: number | null
          issues_before?: number | null
          measured_at?: string | null
          path?: string
          recommendation_id?: string | null
          status?: string
        }
        Relationships: []
      }
      seo_intel_pages: {
        Row: {
          aeo_checked_at: string | null
          aeo_failed: Json | null
          aeo_grade: string | null
          aeo_score: number | null
          analysis_round: number
          avg_position: number | null
          category: string | null
          clicks: number | null
          created_at: string
          ctr: number | null
          data_sources: Json
          discovered_by: string | null
          entity_name: string | null
          entity_slug: string | null
          first_seen_at: string
          h1: string | null
          has_schema: boolean | null
          heading_count: number | null
          health_issues: Json
          health_score: number | null
          id: string
          impressions: number | null
          indexed_checked_at: string | null
          indexed_status: string | null
          internal_links_in: number | null
          internal_links_out: number | null
          last_analyzed_at: string | null
          last_crawl_at: string | null
          live_crawl_at: string | null
          live_crawl_error: string | null
          meta_description: string | null
          page_type: string | null
          path: string
          perf_end_date: string | null
          perf_start_date: string | null
          perf_updated_at: string | null
          perf_window: string | null
          position_change: number | null
          prev_avg_position: number | null
          prev_clicks: number | null
          prev_impressions: number | null
          primary_keyword: string | null
          priority: string | null
          psi_checked_at: string | null
          psi_cls: number | null
          psi_fcp_ms: number | null
          psi_lcp_ms: number | null
          psi_opportunities: Json | null
          psi_perf_score: number | null
          psi_seo_score: number | null
          psi_strategy: string | null
          psi_tbt_ms: number | null
          rendered_h1: string | null
          rendered_has_schema: boolean | null
          rendered_links_out: number | null
          rendered_title: string | null
          rendered_word_count: number | null
          schema_types: string[] | null
          ssr_gap: boolean | null
          status: string | null
          target_keywords: string[] | null
          title: string | null
          top_competitor_domain: string | null
          top_competitor_position: number | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          aeo_checked_at?: string | null
          aeo_failed?: Json | null
          aeo_grade?: string | null
          aeo_score?: number | null
          analysis_round?: number
          avg_position?: number | null
          category?: string | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data_sources?: Json
          discovered_by?: string | null
          entity_name?: string | null
          entity_slug?: string | null
          first_seen_at?: string
          h1?: string | null
          has_schema?: boolean | null
          heading_count?: number | null
          health_issues?: Json
          health_score?: number | null
          id?: string
          impressions?: number | null
          indexed_checked_at?: string | null
          indexed_status?: string | null
          internal_links_in?: number | null
          internal_links_out?: number | null
          last_analyzed_at?: string | null
          last_crawl_at?: string | null
          live_crawl_at?: string | null
          live_crawl_error?: string | null
          meta_description?: string | null
          page_type?: string | null
          path: string
          perf_end_date?: string | null
          perf_start_date?: string | null
          perf_updated_at?: string | null
          perf_window?: string | null
          position_change?: number | null
          prev_avg_position?: number | null
          prev_clicks?: number | null
          prev_impressions?: number | null
          primary_keyword?: string | null
          priority?: string | null
          psi_checked_at?: string | null
          psi_cls?: number | null
          psi_fcp_ms?: number | null
          psi_lcp_ms?: number | null
          psi_opportunities?: Json | null
          psi_perf_score?: number | null
          psi_seo_score?: number | null
          psi_strategy?: string | null
          psi_tbt_ms?: number | null
          rendered_h1?: string | null
          rendered_has_schema?: boolean | null
          rendered_links_out?: number | null
          rendered_title?: string | null
          rendered_word_count?: number | null
          schema_types?: string[] | null
          ssr_gap?: boolean | null
          status?: string | null
          target_keywords?: string[] | null
          title?: string | null
          top_competitor_domain?: string | null
          top_competitor_position?: number | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          aeo_checked_at?: string | null
          aeo_failed?: Json | null
          aeo_grade?: string | null
          aeo_score?: number | null
          analysis_round?: number
          avg_position?: number | null
          category?: string | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data_sources?: Json
          discovered_by?: string | null
          entity_name?: string | null
          entity_slug?: string | null
          first_seen_at?: string
          h1?: string | null
          has_schema?: boolean | null
          heading_count?: number | null
          health_issues?: Json
          health_score?: number | null
          id?: string
          impressions?: number | null
          indexed_checked_at?: string | null
          indexed_status?: string | null
          internal_links_in?: number | null
          internal_links_out?: number | null
          last_analyzed_at?: string | null
          last_crawl_at?: string | null
          live_crawl_at?: string | null
          live_crawl_error?: string | null
          meta_description?: string | null
          page_type?: string | null
          path?: string
          perf_end_date?: string | null
          perf_start_date?: string | null
          perf_updated_at?: string | null
          perf_window?: string | null
          position_change?: number | null
          prev_avg_position?: number | null
          prev_clicks?: number | null
          prev_impressions?: number | null
          primary_keyword?: string | null
          priority?: string | null
          psi_checked_at?: string | null
          psi_cls?: number | null
          psi_fcp_ms?: number | null
          psi_lcp_ms?: number | null
          psi_opportunities?: Json | null
          psi_perf_score?: number | null
          psi_seo_score?: number | null
          psi_strategy?: string | null
          psi_tbt_ms?: number | null
          rendered_h1?: string | null
          rendered_has_schema?: boolean | null
          rendered_links_out?: number | null
          rendered_title?: string | null
          rendered_word_count?: number | null
          schema_types?: string[] | null
          ssr_gap?: boolean | null
          status?: string | null
          target_keywords?: string[] | null
          title?: string | null
          top_competitor_domain?: string | null
          top_competitor_position?: number | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      seo_intel_rank_history: {
        Row: {
          captured_on: string
          clicks: number | null
          created_at: string
          ctr: number | null
          data_source: string
          id: string
          impressions: number | null
          keyword: string
          locale: string
          path: string | null
          position: number | null
        }
        Insert: {
          captured_on?: string
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data_source?: string
          id?: string
          impressions?: number | null
          keyword: string
          locale?: string
          path?: string | null
          position?: number | null
        }
        Update: {
          captured_on?: string
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data_source?: string
          id?: string
          impressions?: number | null
          keyword?: string
          locale?: string
          path?: string | null
          position?: number | null
        }
        Relationships: []
      }
      seo_intel_rec_outcomes: {
        Row: {
          avg_ctr_delta: number | null
          avg_days_to_impact: number | null
          avg_position_delta: number | null
          category: string
          change_type: string
          failed: number
          id: string
          implemented: number
          inconclusive: number
          samples: Json
          succeeded: number
          updated_at: string
        }
        Insert: {
          avg_ctr_delta?: number | null
          avg_days_to_impact?: number | null
          avg_position_delta?: number | null
          category: string
          change_type?: string
          failed?: number
          id?: string
          implemented?: number
          inconclusive?: number
          samples?: Json
          succeeded?: number
          updated_at?: string
        }
        Update: {
          avg_ctr_delta?: number | null
          avg_days_to_impact?: number | null
          avg_position_delta?: number | null
          category?: string
          change_type?: string
          failed?: number
          id?: string
          implemented?: number
          inconclusive?: number
          samples?: Json
          succeeded?: number
          updated_at?: string
        }
        Relationships: []
      }
      seo_intel_recommendations: {
        Row: {
          after_value: string | null
          ai_model: string | null
          applied_at: string | null
          applied_by: string | null
          auto_appliable: boolean
          before_value: string | null
          category: string
          change_type: string | null
          confidence: number | null
          created_at: string
          data_source: string | null
          dedupe_hash: string | null
          evidence: Json
          evidence_score: number | null
          expected_impact: string | null
          id: string
          impact_confidence: string | null
          keyword: string | null
          last_seen_at: string | null
          occurrences: number
          opportunity_score: number | null
          page_type: string | null
          path: string | null
          priority: string
          problem: string
          recommended_change: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: string
          updated_at: string
          validation: Json | null
          verification: Json | null
          verified_at: string | null
          why_it_matters: string | null
        }
        Insert: {
          after_value?: string | null
          ai_model?: string | null
          applied_at?: string | null
          applied_by?: string | null
          auto_appliable?: boolean
          before_value?: string | null
          category?: string
          change_type?: string | null
          confidence?: number | null
          created_at?: string
          data_source?: string | null
          dedupe_hash?: string | null
          evidence?: Json
          evidence_score?: number | null
          expected_impact?: string | null
          id?: string
          impact_confidence?: string | null
          keyword?: string | null
          last_seen_at?: string | null
          occurrences?: number
          opportunity_score?: number | null
          page_type?: string | null
          path?: string | null
          priority?: string
          problem: string
          recommended_change?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string
          updated_at?: string
          validation?: Json | null
          verification?: Json | null
          verified_at?: string | null
          why_it_matters?: string | null
        }
        Update: {
          after_value?: string | null
          ai_model?: string | null
          applied_at?: string | null
          applied_by?: string | null
          auto_appliable?: boolean
          before_value?: string | null
          category?: string
          change_type?: string | null
          confidence?: number | null
          created_at?: string
          data_source?: string | null
          dedupe_hash?: string | null
          evidence?: Json
          evidence_score?: number | null
          expected_impact?: string | null
          id?: string
          impact_confidence?: string | null
          keyword?: string | null
          last_seen_at?: string | null
          occurrences?: number
          opportunity_score?: number | null
          page_type?: string | null
          path?: string | null
          priority?: string
          problem?: string
          recommended_change?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string
          updated_at?: string
          validation?: Json | null
          verification?: Json | null
          verified_at?: string | null
          why_it_matters?: string | null
        }
        Relationships: []
      }
      seo_intel_reports: {
        Row: {
          created_at: string
          data_sources: Json
          id: string
          payload: Json
          period_end: string | null
          period_start: string | null
          report_type: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          data_sources?: Json
          id?: string
          payload?: Json
          period_end?: string | null
          period_start?: string | null
          report_type: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          data_sources?: Json
          id?: string
          payload?: Json
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          summary?: string | null
        }
        Relationships: []
      }
      seo_intel_serp: {
        Row: {
          alignment: Json | null
          captured_on: string
          created_at: string
          data_source: string | null
          features: Json
          id: string
          keyword: string
          locale: string
          our_position: number | null
          our_url: string | null
          rewarded_format: string | null
          top_results: Json
        }
        Insert: {
          alignment?: Json | null
          captured_on?: string
          created_at?: string
          data_source?: string | null
          features?: Json
          id?: string
          keyword: string
          locale?: string
          our_position?: number | null
          our_url?: string | null
          rewarded_format?: string | null
          top_results?: Json
        }
        Update: {
          alignment?: Json | null
          captured_on?: string
          created_at?: string
          data_source?: string | null
          features?: Json
          id?: string
          keyword?: string
          locale?: string
          our_position?: number | null
          our_url?: string | null
          rewarded_format?: string | null
          top_results?: Json
        }
        Relationships: []
      }
      seo_intel_settings: {
        Row: {
          active_days: number[]
          auto_apply_safe: boolean
          autonomous_mode: boolean
          created_at: string
          cron_token: string
          engine_enabled: boolean
          freq_competitor_min: number
          freq_crawl_min: number
          freq_monitor_min: number
          freq_rank_min: number
          freq_report_min: number
          gsc_site_url: string | null
          id: boolean
          last_full_scan_at: string | null
          last_report_at: string | null
          max_pages_per_run: number
          paused_reason: string | null
          schedule_mode: string
          semrush_campaign_id: string | null
          semrush_database: string
          timezone: string
          updated_at: string
          updated_by: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          active_days?: number[]
          auto_apply_safe?: boolean
          autonomous_mode?: boolean
          created_at?: string
          cron_token?: string
          engine_enabled?: boolean
          freq_competitor_min?: number
          freq_crawl_min?: number
          freq_monitor_min?: number
          freq_rank_min?: number
          freq_report_min?: number
          gsc_site_url?: string | null
          id?: boolean
          last_full_scan_at?: string | null
          last_report_at?: string | null
          max_pages_per_run?: number
          paused_reason?: string | null
          schedule_mode?: string
          semrush_campaign_id?: string | null
          semrush_database?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          window_end?: string
          window_start?: string
        }
        Update: {
          active_days?: number[]
          auto_apply_safe?: boolean
          autonomous_mode?: boolean
          created_at?: string
          cron_token?: string
          engine_enabled?: boolean
          freq_competitor_min?: number
          freq_crawl_min?: number
          freq_monitor_min?: number
          freq_rank_min?: number
          freq_report_min?: number
          gsc_site_url?: string | null
          id?: boolean
          last_full_scan_at?: string | null
          last_report_at?: string | null
          max_pages_per_run?: number
          paused_reason?: string | null
          schedule_mode?: string
          semrush_campaign_id?: string | null
          semrush_database?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      seo_intel_sources: {
        Row: {
          configured: boolean
          created_at: string
          id: string
          kind: string
          label: string
          last_error: string | null
          last_sync_at: string | null
          last_tested_at: string | null
          next_sync_at: string | null
          notes: string | null
          source_key: string
          status: string
          updated_at: string
          usage: Json
        }
        Insert: {
          configured?: boolean
          created_at?: string
          id?: string
          kind?: string
          label: string
          last_error?: string | null
          last_sync_at?: string | null
          last_tested_at?: string | null
          next_sync_at?: string | null
          notes?: string | null
          source_key: string
          status?: string
          updated_at?: string
          usage?: Json
        }
        Update: {
          configured?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_tested_at?: string | null
          next_sync_at?: string | null
          notes?: string | null
          source_key?: string
          status?: string
          updated_at?: string
          usage?: Json
        }
        Relationships: []
      }
      seo_intel_speed_history: {
        Row: {
          captured_on: string
          cls: number | null
          created_at: string
          data_source: string | null
          fcp_ms: number | null
          id: string
          lcp_ms: number | null
          path: string
          perf_score: number | null
          seo_score: number | null
          strategy: string
          tbt_ms: number | null
        }
        Insert: {
          captured_on?: string
          cls?: number | null
          created_at?: string
          data_source?: string | null
          fcp_ms?: number | null
          id?: string
          lcp_ms?: number | null
          path: string
          perf_score?: number | null
          seo_score?: number | null
          strategy?: string
          tbt_ms?: number | null
        }
        Update: {
          captured_on?: string
          cls?: number | null
          created_at?: string
          data_source?: string | null
          fcp_ms?: number | null
          id?: string
          lcp_ms?: number | null
          path?: string
          perf_score?: number | null
          seo_score?: number | null
          strategy?: string
          tbt_ms?: number | null
        }
        Relationships: []
      }
      seo_intel_strategy: {
        Row: {
          confidence: string
          data_coverage: Json
          evidence: Json
          generated_at: string
          horizon: string
          id: string
          priorities: Json
          summary: string | null
        }
        Insert: {
          confidence?: string
          data_coverage?: Json
          evidence?: Json
          generated_at?: string
          horizon?: string
          id?: string
          priorities?: Json
          summary?: string | null
        }
        Update: {
          confidence?: string
          data_coverage?: Json
          evidence?: Json
          generated_at?: string
          horizon?: string
          id?: string
          priorities?: Json
          summary?: string | null
        }
        Relationships: []
      }
      seo_intel_tasks: {
        Row: {
          after_value: string | null
          assignee: string | null
          before_value: string | null
          created_at: string
          data_source: string | null
          due_date: string | null
          entity_name: string | null
          id: string
          issue: string
          keyword: string | null
          notes: string | null
          path: string | null
          priority: string
          recommendation: string | null
          recommendation_id: string | null
          requires_human: boolean
          status: string
          task_no: number
          task_type: string
          updated_at: string
          verification_result: string | null
        }
        Insert: {
          after_value?: string | null
          assignee?: string | null
          before_value?: string | null
          created_at?: string
          data_source?: string | null
          due_date?: string | null
          entity_name?: string | null
          id?: string
          issue: string
          keyword?: string | null
          notes?: string | null
          path?: string | null
          priority?: string
          recommendation?: string | null
          recommendation_id?: string | null
          requires_human?: boolean
          status?: string
          task_no?: number
          task_type?: string
          updated_at?: string
          verification_result?: string | null
        }
        Update: {
          after_value?: string | null
          assignee?: string | null
          before_value?: string | null
          created_at?: string
          data_source?: string | null
          due_date?: string | null
          entity_name?: string | null
          id?: string
          issue?: string
          keyword?: string | null
          notes?: string | null
          path?: string | null
          priority?: string
          recommendation?: string | null
          recommendation_id?: string | null
          requires_human?: boolean
          status?: string
          task_no?: number
          task_type?: string
          updated_at?: string
          verification_result?: string | null
        }
        Relationships: []
      }
      seo_intel_volatility: {
        Row: {
          avg_abs_change: number | null
          classification: string | null
          confidence: string
          created_at: string
          detected_on: string
          evidence: Json
          id: string
          keyword: string | null
          keywords_moved: number | null
          keywords_tracked: number | null
          path: string | null
          scope: string
          window_hours: number
        }
        Insert: {
          avg_abs_change?: number | null
          classification?: string | null
          confidence?: string
          created_at?: string
          detected_on?: string
          evidence?: Json
          id?: string
          keyword?: string | null
          keywords_moved?: number | null
          keywords_tracked?: number | null
          path?: string | null
          scope?: string
          window_hours?: number
        }
        Update: {
          avg_abs_change?: number | null
          classification?: string | null
          confidence?: string
          created_at?: string
          detected_on?: string
          evidence?: Json
          id?: string
          keyword?: string | null
          keywords_moved?: number | null
          keywords_tracked?: number | null
          path?: string | null
          scope?: string
          window_hours?: number
        }
        Relationships: []
      }
      seo_keyword_research: {
        Row: {
          content_type: string
          generated_at: string
          generated_by: string | null
          id: string
          keywords: Json
          mode: string | null
          primary_keyword: string | null
          record_id: string
          total_count: number
          updated_at: string
        }
        Insert: {
          content_type: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          keywords?: Json
          mode?: string | null
          primary_keyword?: string | null
          record_id: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          content_type?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          keywords?: Json
          mode?: string | null
          primary_keyword?: string | null
          record_id?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      seo_page_health: {
        Row: {
          avg_position: number | null
          clicks: number
          content_score: number
          created_at: string
          ctr: number
          decay_state: string
          detected_intent: string | null
          duplicate_of: string | null
          duplicate_similarity: number | null
          duplication_score: number
          entity_coverage: number | null
          entity_score: number
          health_score: number
          id: string
          impressions: number
          index_state: string | null
          intent_score: number
          issues: Json
          last_checked_at: string | null
          missing_entities: Json
          page_name: string | null
          page_type: string | null
          path: string
          primary_keyword: string | null
          schema_issues: Json
          schema_score: number
          schema_valid: boolean | null
          signals: Json
          source_id: string | null
          source_table: string | null
          updated_at: string
          url: string | null
          word_count: number
        }
        Insert: {
          avg_position?: number | null
          clicks?: number
          content_score?: number
          created_at?: string
          ctr?: number
          decay_state?: string
          detected_intent?: string | null
          duplicate_of?: string | null
          duplicate_similarity?: number | null
          duplication_score?: number
          entity_coverage?: number | null
          entity_score?: number
          health_score?: number
          id?: string
          impressions?: number
          index_state?: string | null
          intent_score?: number
          issues?: Json
          last_checked_at?: string | null
          missing_entities?: Json
          page_name?: string | null
          page_type?: string | null
          path: string
          primary_keyword?: string | null
          schema_issues?: Json
          schema_score?: number
          schema_valid?: boolean | null
          signals?: Json
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
          url?: string | null
          word_count?: number
        }
        Update: {
          avg_position?: number | null
          clicks?: number
          content_score?: number
          created_at?: string
          ctr?: number
          decay_state?: string
          detected_intent?: string | null
          duplicate_of?: string | null
          duplicate_similarity?: number | null
          duplication_score?: number
          entity_coverage?: number | null
          entity_score?: number
          health_score?: number
          id?: string
          impressions?: number
          index_state?: string | null
          intent_score?: number
          issues?: Json
          last_checked_at?: string | null
          missing_entities?: Json
          page_name?: string | null
          page_type?: string | null
          path?: string
          primary_keyword?: string | null
          schema_issues?: Json
          schema_score?: number
          schema_valid?: boolean | null
          signals?: Json
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
          url?: string | null
          word_count?: number
        }
        Relationships: []
      }
      seo_pipeline_queue: {
        Row: {
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          duplication_found: boolean | null
          error: string | null
          event: string
          health_score: number | null
          id: string
          page_name: string | null
          page_type: string | null
          path: string | null
          result: Json
          schema_valid: boolean | null
          source_id: string
          source_table: string
          stages_done: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          duplication_found?: boolean | null
          error?: string | null
          event?: string
          health_score?: number | null
          id?: string
          page_name?: string | null
          page_type?: string | null
          path?: string | null
          result?: Json
          schema_valid?: boolean | null
          source_id: string
          source_table: string
          stages_done?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          duplication_found?: boolean | null
          error?: string | null
          event?: string
          health_score?: number | null
          id?: string
          page_name?: string | null
          page_type?: string | null
          path?: string | null
          result?: Json
          schema_valid?: boolean | null
          source_id?: string
          source_table?: string
          stages_done?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          created_by: string | null
          from_path: string
          hit_count: number
          id: string
          is_active: boolean
          reason: string | null
          source: string
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_path: string
          hit_count?: number
          id?: string
          is_active?: boolean
          reason?: string | null
          source?: string
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_path?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          reason?: string | null
          source?: string
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_reoptimization_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_snapshot: Json | null
          before_snapshot: Json | null
          changes: Json
          created_at: string
          id: string
          item_id: string | null
          notes: string | null
          page_name: string | null
          page_type: string | null
          primary_keyword: string | null
          run_id: string | null
          score_after: number | null
          score_before: number | null
          secondary_keyword: string | null
          slug: string | null
          url: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          changes?: Json
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          page_name?: string | null
          page_type?: string | null
          primary_keyword?: string | null
          run_id?: string | null
          score_after?: number | null
          score_before?: number | null
          secondary_keyword?: string | null
          slug?: string | null
          url: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          changes?: Json
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          page_name?: string | null
          page_type?: string | null
          primary_keyword?: string | null
          run_id?: string | null
          score_after?: number | null
          score_before?: number | null
          secondary_keyword?: string | null
          slug?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_reoptimization_audit_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "seo_reoptimization_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_reoptimization_audit_log_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_reoptimization_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_reoptimization_items: {
        Row: {
          aeo_notes: string | null
          after_snapshot: Json | null
          applied: boolean
          applied_at: string | null
          attempts: number
          before_snapshot: Json | null
          competitors: Json | null
          content_word_count_after: number | null
          content_word_count_before: number | null
          created_at: string
          discarded: boolean
          discarded_at: string | null
          error: string | null
          finished_at: string | null
          full_content_after: string | null
          full_content_before: string | null
          geo_notes: string | null
          id: string
          keyword_density: Json | null
          locked_at: string | null
          long_tail_keywords: Json | null
          new_primary_keyword: string | null
          old_primary_keyword: string | null
          page_id: string | null
          page_name: string | null
          page_type: string
          readability_score: number | null
          related_queries: Json | null
          rewrite_applied: boolean | null
          run_id: string
          score_after: number | null
          score_before: number | null
          search_intent: string | null
          secondary_keyword: string | null
          slug: string
          stage: string | null
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          aeo_notes?: string | null
          after_snapshot?: Json | null
          applied?: boolean
          applied_at?: string | null
          attempts?: number
          before_snapshot?: Json | null
          competitors?: Json | null
          content_word_count_after?: number | null
          content_word_count_before?: number | null
          created_at?: string
          discarded?: boolean
          discarded_at?: string | null
          error?: string | null
          finished_at?: string | null
          full_content_after?: string | null
          full_content_before?: string | null
          geo_notes?: string | null
          id?: string
          keyword_density?: Json | null
          locked_at?: string | null
          long_tail_keywords?: Json | null
          new_primary_keyword?: string | null
          old_primary_keyword?: string | null
          page_id?: string | null
          page_name?: string | null
          page_type: string
          readability_score?: number | null
          related_queries?: Json | null
          rewrite_applied?: boolean | null
          run_id: string
          score_after?: number | null
          score_before?: number | null
          search_intent?: string | null
          secondary_keyword?: string | null
          slug: string
          stage?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          aeo_notes?: string | null
          after_snapshot?: Json | null
          applied?: boolean
          applied_at?: string | null
          attempts?: number
          before_snapshot?: Json | null
          competitors?: Json | null
          content_word_count_after?: number | null
          content_word_count_before?: number | null
          created_at?: string
          discarded?: boolean
          discarded_at?: string | null
          error?: string | null
          finished_at?: string | null
          full_content_after?: string | null
          full_content_before?: string | null
          geo_notes?: string | null
          id?: string
          keyword_density?: Json | null
          locked_at?: string | null
          long_tail_keywords?: Json | null
          new_primary_keyword?: string | null
          old_primary_keyword?: string | null
          page_id?: string | null
          page_name?: string | null
          page_type?: string
          readability_score?: number | null
          related_queries?: Json | null
          rewrite_applied?: boolean | null
          run_id?: string
          score_after?: number | null
          score_before?: number | null
          search_intent?: string | null
          secondary_keyword?: string | null
          slug?: string
          stage?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_reoptimization_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_reoptimization_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_reoptimization_runs: {
        Row: {
          cancel_requested: boolean
          created_at: string
          failed: number
          finished_at: string | null
          id: string
          label: string | null
          options: Json
          priority: number
          processed: number
          run_at: string | null
          scope: string
          started_at: string
          started_by: string | null
          status: string
          succeeded: number
          total_items: number
          updated_at: string
        }
        Insert: {
          cancel_requested?: boolean
          created_at?: string
          failed?: number
          finished_at?: string | null
          id?: string
          label?: string | null
          options?: Json
          priority?: number
          processed?: number
          run_at?: string | null
          scope?: string
          started_at?: string
          started_by?: string | null
          status?: string
          succeeded?: number
          total_items?: number
          updated_at?: string
        }
        Update: {
          cancel_requested?: boolean
          created_at?: string
          failed?: number
          finished_at?: string | null
          id?: string
          label?: string | null
          options?: Json
          priority?: number
          processed?: number
          run_at?: string | null
          scope?: string
          started_at?: string
          started_by?: string | null
          status?: string
          succeeded?: number
          total_items?: number
          updated_at?: string
        }
        Relationships: []
      }
      seo_validation_reports: {
        Row: {
          content_type: string
          error_count: number
          errors: Json
          id: string
          passed: boolean
          record_id: string
          url: string | null
          validated_at: string
          validated_by: string | null
          warning_count: number
          warnings: Json
        }
        Insert: {
          content_type: string
          error_count?: number
          errors?: Json
          id?: string
          passed: boolean
          record_id: string
          url?: string | null
          validated_at?: string
          validated_by?: string | null
          warning_count?: number
          warnings?: Json
        }
        Update: {
          content_type?: string
          error_count?: number
          errors?: Json
          id?: string
          passed?: boolean
          record_id?: string
          url?: string | null
          validated_at?: string
          validated_by?: string | null
          warning_count?: number
          warnings?: Json
        }
        Relationships: []
      }
      shortlister_submissions: {
        Row: {
          created_at: string
          email: string | null
          form_data: Json
          full_name: string | null
          id: string
          payload: Json | null
          results_count: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          form_data?: Json
          full_name?: string | null
          id?: string
          payload?: Json | null
          results_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          form_data?: Json
          full_name?: string | null
          id?: string
          payload?: Json | null
          results_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      silo_actions: {
        Row: {
          action: string
          anchor_text: string | null
          created_at: string
          from_path: string | null
          id: string
          notes: string | null
          performed_by: string | null
          recommendation_id: string | null
          revert_payload: Json | null
          reverted_at: string | null
          run_id: string | null
          source_field: string | null
          source_id: string | null
          source_table: string | null
          status: string
          to_path: string | null
        }
        Insert: {
          action: string
          anchor_text?: string | null
          created_at?: string
          from_path?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          to_path?: string | null
        }
        Update: {
          action?: string
          anchor_text?: string | null
          created_at?: string
          from_path?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          recommendation_id?: string | null
          revert_payload?: Json | null
          reverted_at?: string | null
          run_id?: string | null
          source_field?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          to_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "silo_actions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "silo_link_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silo_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "silo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      silo_link_recommendations: {
        Row: {
          anchor_text: string
          applied_at: string | null
          authority_after: number | null
          authority_before: number | null
          auto_applied: boolean
          context_snippet: string | null
          created_at: string
          error: string | null
          expected_impact: string | null
          id: string
          opportunity_score: number
          priority: string
          problem: string | null
          rationale: string | null
          reviewed_by: string | null
          run_id: string
          seo_impact: string | null
          source_field: string | null
          source_id: string | null
          source_name: string | null
          source_path: string
          source_table: string | null
          status: string
          target_name: string | null
          target_path: string
          target_type: string | null
          updated_at: string
        }
        Insert: {
          anchor_text: string
          applied_at?: string | null
          authority_after?: number | null
          authority_before?: number | null
          auto_applied?: boolean
          context_snippet?: string | null
          created_at?: string
          error?: string | null
          expected_impact?: string | null
          id?: string
          opportunity_score?: number
          priority?: string
          problem?: string | null
          rationale?: string | null
          reviewed_by?: string | null
          run_id: string
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_name?: string | null
          source_path: string
          source_table?: string | null
          status?: string
          target_name?: string | null
          target_path: string
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          anchor_text?: string
          applied_at?: string | null
          authority_after?: number | null
          authority_before?: number | null
          auto_applied?: boolean
          context_snippet?: string | null
          created_at?: string
          error?: string | null
          expected_impact?: string | null
          id?: string
          opportunity_score?: number
          priority?: string
          problem?: string | null
          rationale?: string | null
          reviewed_by?: string | null
          run_id?: string
          seo_impact?: string | null
          source_field?: string | null
          source_id?: string | null
          source_name?: string | null
          source_path?: string
          source_table?: string | null
          status?: string
          target_name?: string | null
          target_path?: string
          target_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "silo_link_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "silo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      silo_links: {
        Row: {
          anchor_text: string | null
          created_at: string
          from_path: string
          id: string
          run_id: string
          source_id: string | null
          source_table: string | null
          to_path: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string
          from_path: string
          id?: string
          run_id: string
          source_id?: string | null
          source_table?: string | null
          to_path: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string
          from_path?: string
          id?: string
          run_id?: string
          source_id?: string | null
          source_table?: string | null
          to_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "silo_links_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "silo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      silo_pages: {
        Row: {
          anchor_diversity: number | null
          authority_score: number
          avg_position: number | null
          clicks: number
          created_at: string
          hub_score: number
          id: string
          impressions: number
          is_commercial: boolean
          is_hub: boolean
          is_orphan: boolean
          links_in: number
          links_out: number
          opportunity_score: number
          page_name: string | null
          page_type: string
          pagerank: number
          path: string
          primary_keyword: string | null
          run_id: string
          signals: Json
          slug: string | null
          source_id: string | null
          source_table: string | null
          topic: string | null
          unique_sources: number
          updated_at: string
          url: string
          word_count: number
        }
        Insert: {
          anchor_diversity?: number | null
          authority_score?: number
          avg_position?: number | null
          clicks?: number
          created_at?: string
          hub_score?: number
          id?: string
          impressions?: number
          is_commercial?: boolean
          is_hub?: boolean
          is_orphan?: boolean
          links_in?: number
          links_out?: number
          opportunity_score?: number
          page_name?: string | null
          page_type?: string
          pagerank?: number
          path: string
          primary_keyword?: string | null
          run_id: string
          signals?: Json
          slug?: string | null
          source_id?: string | null
          source_table?: string | null
          topic?: string | null
          unique_sources?: number
          updated_at?: string
          url: string
          word_count?: number
        }
        Update: {
          anchor_diversity?: number | null
          authority_score?: number
          avg_position?: number | null
          clicks?: number
          created_at?: string
          hub_score?: number
          id?: string
          impressions?: number
          is_commercial?: boolean
          is_hub?: boolean
          is_orphan?: boolean
          links_in?: number
          links_out?: number
          opportunity_score?: number
          page_name?: string | null
          page_type?: string
          pagerank?: number
          path?: string
          primary_keyword?: string | null
          run_id?: string
          signals?: Json
          slug?: string | null
          source_id?: string | null
          source_table?: string | null
          topic?: string | null
          unique_sources?: number
          updated_at?: string
          url?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "silo_pages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "silo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      silo_runs: {
        Row: {
          applied: number
          created_at: string
          edges_found: number
          error: string | null
          finished_at: string | null
          id: string
          orphans: number
          pages_scanned: number
          recommendations: number
          scope: Json
          stage: string | null
          started_at: string
          status: string
          summary: Json
          triggered_by: string | null
          updated_at: string
          weak_hubs: number
        }
        Insert: {
          applied?: number
          created_at?: string
          edges_found?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          orphans?: number
          pages_scanned?: number
          recommendations?: number
          scope?: Json
          stage?: string | null
          started_at?: string
          status?: string
          summary?: Json
          triggered_by?: string | null
          updated_at?: string
          weak_hubs?: number
        }
        Update: {
          applied?: number
          created_at?: string
          edges_found?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          orphans?: number
          pages_scanned?: number
          recommendations?: number
          scope?: Json
          stage?: string | null
          started_at?: string
          status?: string
          summary?: Json
          triggered_by?: string | null
          updated_at?: string
          weak_hubs?: number
        }
        Relationships: []
      }
      silo_settings: {
        Row: {
          auto_apply_links: boolean
          automation_enabled: boolean
          created_at: string
          id: boolean
          max_links_per_page: number
          max_links_per_run: number
          min_opportunity_score: number
          updated_at: string
        }
        Insert: {
          auto_apply_links?: boolean
          automation_enabled?: boolean
          created_at?: string
          id?: boolean
          max_links_per_page?: number
          max_links_per_run?: number
          min_opportunity_score?: number
          updated_at?: string
        }
        Update: {
          auto_apply_links?: boolean
          automation_enabled?: boolean
          created_at?: string
          id?: boolean
          max_links_per_page?: number
          max_links_per_run?: number
          min_opportunity_score?: number
          updated_at?: string
        }
        Relationships: []
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
      sitemap_submissions: {
        Row: {
          created_at: string
          id: string
          sitemap_url: string
          submitted_by: string | null
          submitted_on: string
          url_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          sitemap_url: string
          submitted_by?: string | null
          submitted_on: string
          url_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          sitemap_url?: string
          submitted_by?: string | null
          submitted_on?: string
          url_count?: number | null
        }
        Relationships: []
      }
      sop_reviews: {
        Row: {
          academic_background: string | null
          ai_response: Json | null
          country_preference: string | null
          created_at: string
          current_role_text: string | null
          deadline: string | null
          error_message: string | null
          experience_years: number | null
          file_name: string | null
          file_url: string | null
          highlight_focus: string[] | null
          id: string
          long_term_goals: string | null
          major_achievements: string | null
          overall_score: number | null
          short_term_goals: string | null
          sop_text: string
          specialization: string | null
          status: string
          strengths: string | null
          target_colleges: string | null
          target_course: string | null
          tone_preference: string | null
          updated_at: string
          user_id: string
          weaknesses: string | null
          why_college: string | null
          why_course: string | null
        }
        Insert: {
          academic_background?: string | null
          ai_response?: Json | null
          country_preference?: string | null
          created_at?: string
          current_role_text?: string | null
          deadline?: string | null
          error_message?: string | null
          experience_years?: number | null
          file_name?: string | null
          file_url?: string | null
          highlight_focus?: string[] | null
          id?: string
          long_term_goals?: string | null
          major_achievements?: string | null
          overall_score?: number | null
          short_term_goals?: string | null
          sop_text: string
          specialization?: string | null
          status?: string
          strengths?: string | null
          target_colleges?: string | null
          target_course?: string | null
          tone_preference?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: string | null
          why_college?: string | null
          why_course?: string | null
        }
        Update: {
          academic_background?: string | null
          ai_response?: Json | null
          country_preference?: string | null
          created_at?: string
          current_role_text?: string | null
          deadline?: string | null
          error_message?: string | null
          experience_years?: number | null
          file_name?: string | null
          file_url?: string | null
          highlight_focus?: string[] | null
          id?: string
          long_term_goals?: string | null
          major_achievements?: string | null
          overall_score?: number | null
          short_term_goals?: string | null
          sop_text?: string
          specialization?: string | null
          status?: string
          strengths?: string | null
          target_colleges?: string | null
          target_course?: string | null
          tone_preference?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: string | null
          why_college?: string | null
          why_course?: string | null
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
      student_applications: {
        Row: {
          created_at: string
          fee_amount: number | null
          fee_paid: boolean
          id: string
          last_activity_at: string
          notes: string | null
          started_at: string | null
          status: string
          submitted_at: string | null
          tracker_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee_amount?: number | null
          fee_paid?: boolean
          id?: string
          last_activity_at?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          tracker_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee_amount?: number | null
          fee_paid?: boolean
          id?: string
          last_activity_at?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          tracker_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_applications_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "application_trackers"
            referencedColumns: ["id"]
          },
        ]
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
          image_url: string | null
          is_read: boolean
          link_label: string | null
          link_url: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          link_label?: string | null
          link_url?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          link_label?: string | null
          link_url?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      student_planner_skips: {
        Row: {
          created_at: string
          id: string
          series_id: string
          skipped_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          series_id: string
          skipped_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          series_id?: string
          skipped_date?: string
          user_id?: string
        }
        Relationships: []
      }
      student_planner_tasks: {
        Row: {
          actual_minutes: number | null
          auto_rollover: boolean
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_minutes: number
          id: string
          linked_action: string | null
          linked_ref: string | null
          notes: string | null
          original_date: string | null
          priority: string
          recurrence: string
          recurrence_days: number[]
          recurrence_until: string | null
          rolled_over_from: string | null
          scheduled_date: string
          scheduled_start_time: string | null
          series_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          auto_rollover?: boolean
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          linked_action?: string | null
          linked_ref?: string | null
          notes?: string | null
          original_date?: string | null
          priority?: string
          recurrence?: string
          recurrence_days?: number[]
          recurrence_until?: string | null
          rolled_over_from?: string | null
          scheduled_date?: string
          scheduled_start_time?: string | null
          series_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          auto_rollover?: boolean
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          linked_action?: string | null
          linked_ref?: string | null
          notes?: string | null
          original_date?: string | null
          priority?: string
          recurrence?: string
          recurrence_days?: number[]
          recurrence_until?: string | null
          rolled_over_from?: string | null
          scheduled_date?: string
          scheduled_start_time?: string | null
          series_id?: string | null
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
      support_faqs: {
        Row: {
          answer: string
          category: Database["public"]["Enums"]["ticket_category"] | null
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          question: string
          question_norm: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: Database["public"]["Enums"]["ticket_category"] | null
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          question: string
          question_norm?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: Database["public"]["Enums"]["ticket_category"] | null
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          question?: string
          question_norm?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          sender_role: Database["public"]["Enums"]["ticket_message_sender"]
          sender_user_id: string | null
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_role?: Database["public"]["Enums"]["ticket_message_sender"]
          sender_user_id?: string | null
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_role?: Database["public"]["Enums"]["ticket_message_sender"]
          sender_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachment_name: string | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          code: string
          created_at: string
          description: string
          id: string
          internal_notes: string | null
          last_admin_reply_at: string | null
          last_student_reply_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          student_email: string | null
          student_name: string | null
          student_phone: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          code?: string
          created_at?: string
          description: string
          id?: string
          internal_notes?: string | null
          last_admin_reply_at?: string | null
          last_student_reply_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          student_email?: string | null
          student_name?: string | null
          student_phone?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          code?: string
          created_at?: string
          description?: string
          id?: string
          internal_notes?: string | null
          last_admin_reply_at?: string | null
          last_student_reply_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          student_email?: string | null
          student_name?: string | null
          student_phone?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_check_config: {
        Row: {
          created_at: string
          cron_token: string
          daily_enabled: boolean
          id: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_token?: string
          daily_enabled?: boolean
          id?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_token?: string
          daily_enabled?: boolean
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      system_check_results: {
        Row: {
          category: string
          check_key: string
          created_at: string
          detail: Json
          fix_hint: string | null
          http_status: number | null
          id: string
          latency_ms: number | null
          message: string | null
          name: string
          provider: string | null
          run_date: string
          run_id: string
          section: string
          status: string
          target: string | null
          used_in: string[]
        }
        Insert: {
          category?: string
          check_key: string
          created_at?: string
          detail?: Json
          fix_hint?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          name: string
          provider?: string | null
          run_date?: string
          run_id: string
          section: string
          status?: string
          target?: string | null
          used_in?: string[]
        }
        Update: {
          category?: string
          check_key?: string
          created_at?: string
          detail?: Json
          fix_hint?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          name?: string
          provider?: string | null
          run_date?: string
          run_id?: string
          section?: string
          status?: string
          target?: string | null
          used_in?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "system_check_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_check_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_check_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          failed: number
          finished_at: string | null
          id: string
          passed: number
          run_date: string
          skipped: number
          started_at: string
          status: string
          summary: Json
          total: number
          trigger: string
          triggered_by: string | null
          updated_at: string
          warned: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          passed?: number
          run_date?: string
          skipped?: number
          started_at?: string
          status?: string
          summary?: Json
          total?: number
          trigger?: string
          triggered_by?: string | null
          updated_at?: string
          warned?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          passed?: number
          run_date?: string
          skipped?: number
          started_at?: string
          status?: string
          summary?: Json
          total?: number
          trigger?: string
          triggered_by?: string | null
          updated_at?: string
          warned?: number
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
      vocab_bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_bookmarks_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocab_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_daily_goals: {
        Row: {
          on_date: string
          quiz_done: number
          quiz_target: number
          user_id: string
          words_done: number
          words_target: number
        }
        Insert: {
          on_date: string
          quiz_done?: number
          quiz_target?: number
          user_id: string
          words_done?: number
          words_target?: number
        }
        Update: {
          on_date?: string
          quiz_done?: number
          quiz_target?: number
          user_id?: string
          words_done?: number
          words_target?: number
        }
        Relationships: []
      }
      vocab_generation_jobs: {
        Row: {
          attempts: number
          batch_size: number | null
          category: string | null
          created_at: string
          created_by: string | null
          current_activity: string | null
          difficulty: string | null
          duplicates: number
          error: string | null
          estimated_cost_usd: number
          estimated_input_tokens: number
          estimated_output_tokens: number
          exam: string | null
          failed: number
          finished_at: string | null
          generated: number
          id: string
          progress_details: Json
          provider: string | null
          rejected: number
          requested: number
          started_at: string | null
          status: string
          updated_at: string
          worker_heartbeat: string | null
        }
        Insert: {
          attempts?: number
          batch_size?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_activity?: string | null
          difficulty?: string | null
          duplicates?: number
          error?: string | null
          estimated_cost_usd?: number
          estimated_input_tokens?: number
          estimated_output_tokens?: number
          exam?: string | null
          failed?: number
          finished_at?: string | null
          generated?: number
          id?: string
          progress_details?: Json
          provider?: string | null
          rejected?: number
          requested: number
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_heartbeat?: string | null
        }
        Update: {
          attempts?: number
          batch_size?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_activity?: string | null
          difficulty?: string | null
          duplicates?: number
          error?: string | null
          estimated_cost_usd?: number
          estimated_input_tokens?: number
          estimated_output_tokens?: number
          exam?: string | null
          failed?: number
          finished_at?: string | null
          generated?: number
          id?: string
          progress_details?: Json
          provider?: string | null
          rejected?: number
          requested?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_heartbeat?: string | null
        }
        Relationships: []
      }
      vocab_progress: {
        Row: {
          id: string
          is_read: boolean
          last_seen_at: string | null
          mastery: number
          next_review_at: string
          read_at: string | null
          times_correct: number
          times_seen: number
          updated_at: string
          user_id: string
          word_id: string
        }
        Insert: {
          id?: string
          is_read?: boolean
          last_seen_at?: string | null
          mastery?: number
          next_review_at?: string
          read_at?: string | null
          times_correct?: number
          times_seen?: number
          updated_at?: string
          user_id: string
          word_id: string
        }
        Update: {
          id?: string
          is_read?: boolean
          last_seen_at?: string | null
          mastery?: number
          next_review_at?: string
          read_at?: string | null
          times_correct?: number
          times_seen?: number
          updated_at?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocab_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_quiz_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          quiz_type: Database["public"]["Enums"]["vocab_quiz_type"]
          time_taken_ms: number | null
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          quiz_type: Database["public"]["Enums"]["vocab_quiz_type"]
          time_taken_ms?: number | null
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          quiz_type?: Database["public"]["Enums"]["vocab_quiz_type"]
          time_taken_ms?: number | null
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_quiz_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocab_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_streaks: {
        Row: {
          badges: Json
          current_streak: number
          daily_target_words: number
          last_active_date: string | null
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: Json
          current_streak?: number
          daily_target_words?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: Json
          current_streak?: number
          daily_target_words?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocab_word_of_day: {
        Row: {
          created_at: string
          on_date: string
          word_id: string
        }
        Insert: {
          created_at?: string
          on_date: string
          word_id: string
        }
        Update: {
          created_at?: string
          on_date?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_word_of_day_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocab_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_words: {
        Row: {
          antonyms: string[]
          category: Database["public"]["Enums"]["vocab_category"]
          created_at: string
          difficulty: Database["public"]["Enums"]["vocab_difficulty"]
          exam_appearances: string[]
          example_business: string | null
          example_email: string | null
          example_interview: string | null
          hinglish_meaning: string | null
          id: string
          meaning: string
          meaning_hindi: string | null
          part_of_speech: string | null
          pronunciation: string | null
          pronunciation_syllables: string | null
          slug: string
          source: string
          synonyms: string[]
          updated_at: string
          word: string
        }
        Insert: {
          antonyms?: string[]
          category?: Database["public"]["Enums"]["vocab_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["vocab_difficulty"]
          exam_appearances?: string[]
          example_business?: string | null
          example_email?: string | null
          example_interview?: string | null
          hinglish_meaning?: string | null
          id?: string
          meaning: string
          meaning_hindi?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          pronunciation_syllables?: string | null
          slug: string
          source?: string
          synonyms?: string[]
          updated_at?: string
          word: string
        }
        Update: {
          antonyms?: string[]
          category?: Database["public"]["Enums"]["vocab_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["vocab_difficulty"]
          exam_appearances?: string[]
          example_business?: string | null
          example_email?: string | null
          example_interview?: string | null
          hinglish_meaning?: string | null
          id?: string
          meaning?: string
          meaning_hindi?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          pronunciation_syllables?: string | null
          slug?: string
          source?: string
          synonyms?: string[]
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      welcome_email_logs: {
        Row: {
          amount: number | null
          brevo_message_id: string | null
          course_name: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          brevo_message_id?: string | null
          course_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          brevo_message_id?: string | null
          course_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      welcome_email_template: {
        Row: {
          body_html: string
          dashboard_link: string
          enabled: boolean
          id: number
          subject: string
          support_email: string
          support_phone: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          dashboard_link?: string
          enabled?: boolean
          id?: number
          subject?: string
          support_email?: string
          support_phone?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          dashboard_link?: string
          enabled?: boolean
          id?: number
          subject?: string
          support_email?: string
          support_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          daily_limit: number
          id: string
          last_run_at: string | null
          message_body: string | null
          message_id: string | null
          message_type: string
          name: string
          notes: string | null
          send_end_time: string
          send_start_time: string
          send_timezone: string
          start_date: string
          status: string
          template_id: string | null
          template_language: string
          template_name: string | null
          template_params: Json
          total_target: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          id?: string
          last_run_at?: string | null
          message_body?: string | null
          message_id?: string | null
          message_type?: string
          name: string
          notes?: string | null
          send_end_time?: string
          send_start_time?: string
          send_timezone?: string
          start_date?: string
          status?: string
          template_id?: string | null
          template_language?: string
          template_name?: string | null
          template_params?: Json
          total_target?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          id?: string
          last_run_at?: string | null
          message_body?: string | null
          message_id?: string | null
          message_type?: string
          name?: string
          notes?: string | null
          send_end_time?: string
          send_start_time?: string
          send_timezone?: string
          start_date?: string
          status?: string
          template_id?: string | null
          template_language?: string
          template_name?: string | null
          template_params?: Json
          total_target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_daily_stats: {
        Row: {
          campaign_id: string
          created_at: string
          failed_count: number
          id: string
          processed_count: number
          send_date: string
          sent_count: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          failed_count?: number
          id?: string
          processed_count?: number
          send_date?: string
          sent_count?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          failed_count?: number
          id?: string
          processed_count?: number
          send_date?: string
          sent_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_daily_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          id: string
          message_body: string | null
          message_type: string
          name: string
          notes: string | null
          template_language: string
          template_name: string | null
          template_params: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_body?: string | null
          message_type?: string
          name: string
          notes?: string | null
          template_language?: string
          template_name?: string | null
          template_params?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_body?: string | null
          message_type?: string
          name?: string
          notes?: string | null
          template_language?: string
          template_name?: string | null
          template_params?: Json
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_recipients: {
        Row: {
          attempts: number
          campaign_id: string
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_error_code: string | null
          name: string | null
          next_retry_at: string | null
          phone: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          variables: Json
        }
        Insert: {
          attempts?: number
          campaign_id: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_error_code?: string | null
          name?: string | null
          next_retry_at?: string | null
          phone: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          attempts?: number
          campaign_id?: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_error_code?: string | null
          name?: string | null
          next_retry_at?: string | null
          phone?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_send_logs: {
        Row: {
          attempt: number
          campaign_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          next_retry_at: string | null
          phone: string
          provider_message_id: string | null
          recipient_id: string | null
          response: Json | null
          status: string
        }
        Insert: {
          attempt?: number
          campaign_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          next_retry_at?: string | null
          phone: string
          provider_message_id?: string | null
          recipient_id?: string | null
          response?: Json | null
          status: string
        }
        Update: {
          attempt?: number
          campaign_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          next_retry_at?: string | null
          phone?: string
          provider_message_id?: string | null
          recipient_id?: string | null
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_send_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_send_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_text: string | null
          category: string | null
          components: Json | null
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          language: string
          name: string
          provider_id: string | null
          source: string
          status: string
          synced_at: string | null
          updated_at: string
          variable_count: number
        }
        Insert: {
          body_text?: string | null
          category?: string | null
          components?: Json | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name: string
          provider_id?: string | null
          source?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
          variable_count?: number
        }
        Update: {
          body_text?: string | null
          category?: string | null
          components?: Json | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          name?: string
          provider_id?: string | null
          source?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
          variable_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      colleges_listing_cache: {
        Row: {
          accreditations: string[] | null
          campus_size: string | null
          city: string | null
          college_category: string | null
          description: string | null
          established: number | null
          exams_accepted: string[] | null
          fees: string | null
          fees_lakhs: number | null
          id: string | null
          listing_sort_order: number | null
          logo_url: string | null
          name: string | null
          placement_avg: string | null
          placement_highest: string | null
          placement_median: string | null
          ranking: number | null
          slug: string | null
          specializations: string[] | null
          state: string | null
          tier: string | null
          top_recruiters: string[] | null
          top_recruiters_total: number | null
          total_students: number | null
          type: string | null
        }
        Relationships: []
      }
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
      mv_global_leaderboard: {
        Row: {
          coins: number | null
          display_handle: string | null
          level: number | null
          rank: number | null
          streak_days: number | null
          total_mocks_completed: number | null
          user_id: string | null
          xp: number | null
        }
        Relationships: []
      }
      mv_vocab_leaderboard: {
        Row: {
          current_streak: number | null
          display_name: string | null
          level: number | null
          rank: number | null
          total_xp: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _indexing_url_for: {
        Args: { _slug: string; _table: string }
        Returns: string
      }
      ad_delivery: {
        Args: never
        Returns: {
          campaign_id: string
          today: number
          total: number
        }[]
      }
      ad_fill_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          device: string
          filled: number
          placement: string
          requests: number
        }[]
      }
      ad_page_type: { Args: { _path: string }; Returns: string }
      ad_smart_refresh: { Args: never; Returns: number }
      ad_smart_refresh_now: { Args: never; Returns: number }
      ad_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          campaign_id: string
          day: string
          device: string
          event_type: string
          n: number
          placement: string
        }[]
      }
      admin_college_filter_options: { Args: never; Returns: Json }
      admin_delete_bundle: { Args: { _bundle_id: string }; Returns: Json }
      admin_search_students: {
        Args: { _limit?: number; _query?: string }
        Returns: {
          banned_until: string
          display_name: string
          email: string
          enrolled_count: number
          phone: string
          user_id: string
        }[]
      }
      admin_table_row_estimates: {
        Args: never
        Returns: {
          row_estimate: number
          table_name: string
        }[]
      }
      application_student_summary: {
        Args: never
        Returns: {
          apply_clicks: number
          completed: number
          in_progress: number
          last_activity: string
          started: number
          student_email: string
          student_name: string
          user_id: string
          views: number
        }[]
      }
      approve_mock_question_upgrade: {
        Args: { _review_id: string }
        Returns: undefined
      }
      assign_admin_by_email: { Args: { _email: string }; Returns: string }
      award_quant_xp: {
        Args: { _activity_today?: boolean; _xp: number }
        Returns: {
          current_streak: number
          daily_target_formulas: number
          last_active_date: string | null
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quant_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      award_vocab_xp: {
        Args: { _activity_today?: boolean; _xp: number }
        Returns: {
          badges: Json
          current_streak: number
          daily_target_words: number
          last_active_date: string | null
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vocab_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      backfill_personalized_questions_from_mocks: {
        Args: never
        Returns: number
      }
      claim_exam_backfill_item: {
        Args: { _lock_minutes?: number; _max_attempts?: number }
        Returns: {
          attempts: number
          created_at: string
          error: string | null
          exam_id: string | null
          exam_name: string
          exam_slug: string | null
          exam_year: number | null
          fields_filled: number
          finished_at: string | null
          gaps: Json
          gaps_after: number
          gaps_before: number
          id: string
          job_id: string
          log: Json
          official_website: string | null
          passes: number
          research: Json | null
          started_at: string | null
          status: string
          step: string | null
          tokens_used: number
          updated_at: string
          worker_lock_until: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "exam_backfill_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_exam_generation_job: {
        Args: { _lock_minutes?: number; _max_attempts?: number }
        Returns: {
          attempts: number
          auto_publish: boolean
          batch_id: string | null
          batch_label: string | null
          created_at: string
          created_by: string | null
          draft_id: string | null
          error: string | null
          exam_category: string | null
          exam_id: string | null
          exam_name: string
          exam_year: number | null
          finished_at: string | null
          id: string
          log: Json
          mode: string
          notes: string | null
          official_website: string | null
          published_slug: string | null
          result: Json | null
          review_status: string
          reviewed_at: string | null
          sort_order: number | null
          sources: Json | null
          status: string
          step: string | null
          steps_done: number
          steps_total: number
          tokens_used: number
          updated_at: string
          worker_lock_until: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "exam_generation_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_master_refresh_item: {
        Args: { _lock_minutes?: number }
        Returns: {
          attempts: number
          changed_fields: number | null
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          error: string | null
          finished_at: string | null
          id: string
          job_id: string
          started_at: string | null
          status: string
          total_fields: number | null
          updated_at: string
          worker_lock_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "master_refresh_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_mock_section_job: {
        Args: { _lock_minutes?: number }
        Returns: {
          attempts: number
          category: string
          created_at: string
          created_by: string | null
          current_step: string | null
          dup_db_conflict: number
          dup_hash: number
          dup_paraphrase: number
          dup_similarity: number
          duplicates_rejected: number
          error_message: string | null
          exam_code: string
          final_reason: string | null
          generation_id: string | null
          id: string
          level: string
          mcq_count: number
          negative_marks: number
          positive_marks: number
          questions_done: number
          questions_per_set: number
          rejected_invalid: number
          section_code: string
          section_id: string
          section_name: string
          sets: number
          status: string
          strict_topic: string | null
          test_id: string
          tita_count: number
          topic: string | null
          total_questions: number
          updated_at: string
          verify_internet: boolean
          worker_lock_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "mock_section_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_personalized_bulk_item: {
        Args: { _lock_minutes?: number }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          current_step: string | null
          difficulty: string
          exam_code: string
          existing_count: number
          failed_count: number
          generated_count: number
          id: string
          job_id: string
          last_error: string | null
          requested_count: number
          section: string
          started_at: string | null
          status: string
          updated_at: string
          worker_lock_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "personalized_bulk_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_seo_pipeline_items: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          duplication_found: boolean | null
          error: string | null
          event: string
          health_score: number | null
          id: string
          page_name: string | null
          page_type: string | null
          path: string | null
          result: Json
          schema_valid: boolean | null
          source_id: string
          source_table: string
          stages_done: Json
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "seo_pipeline_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_shortlister_submissions: { Args: never; Returns: number }
      colleges_listing: {
        Args: never
        Returns: {
          accreditations: string[]
          campus_size: string
          city: string
          college_category: string
          description: string
          established: number
          exams_accepted: string[]
          fees: string
          fees_lakhs: number
          id: string
          listing_sort_order: number
          logo_url: string
          name: string
          placement_avg: string
          placement_highest: string
          placement_median: string
          ranking: number
          slug: string
          specializations: string[]
          state: string
          tier: string
          top_recruiters: string[]
          top_recruiters_total: number
          total_students: number
          type: string
        }[]
      }
      colleges_location_counts: {
        Args: never
        Returns: {
          city: string
          state: string
          total: number
        }[]
      }
      complete_article_display: {
        Args: { _article_id: string; _display: Json; _token: string }
        Returns: boolean
      }
      cta_analytics_export: {
        Args: {
          p_category?: string
          p_limit?: number
          p_outcome?: string
          p_search?: string
          p_section?: string
          p_since: string
        }
        Returns: Json
      }
      cta_analytics_summary: {
        Args: {
          p_category?: string
          p_outcome?: string
          p_search?: string
          p_section?: string
          p_since: string
        }
        Returns: Json
      }
      dedupe_faq_jsonb: { Args: { _faqs: Json }; Returns: Json }
      dedupe_site_settings_faqs: { Args: { _value: Json }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      distinct_text_count: { Args: { arr: string[] }; Returns: number }
      email_campaign_tick: { Args: never; Returns: number }
      email_campaign_wake: { Args: never; Returns: undefined }
      email_effective_global_cap: { Args: never; Returns: number }
      email_queue_dispatch: { Args: never; Returns: undefined }
      email_sender_health_check: { Args: { _sid: string }; Returns: boolean }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      first_distinct_texts: {
        Args: { arr: string[]; n: number }
        Returns: string[]
      }
      generate_ticket_code: { Args: never; Returns: string }
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
      get_mock_benchmarks: {
        Args: { _test_ids?: string[] }
        Returns: {
          cohort_average: number
          cohort_median: number
          difficulty: string
          is_provisional: boolean
          my_attempt_id: string
          my_percentile: number
          my_rank: number
          my_score: number
          test_id: string
          top_10_score: number
          topper_score: number
          verified_students: number
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
      get_mock_leaderboard_v2: {
        Args: { _limit?: number; _test_id: string }
        Returns: {
          accuracy: number
          attempt_id: string
          display_name: string
          is_provisional: boolean
          is_self: boolean
          max_score: number
          percentile: number
          rank: number
          submitted_at: string
          total_attempted: number
          total_correct: number
          total_score: number
          user_id: string
          verified_students: number
        }[]
      }
      get_my_leaderboard_rank: { Args: never; Returns: number }
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
      get_vocab_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          current_streak: number
          display_name: string
          is_self: boolean
          level: number
          rank: number
          total_xp: number
          user_id: string
        }[]
      }
      has_active_personalized_hub_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_meritto_retry: { Args: { p_id: string }; Returns: undefined }
      increment_tracker_counter: {
        Args: { _field: string; _tracker_id: string }
        Returns: undefined
      }
      is_admin_email: { Args: { _email: string }; Returns: boolean }
      mask_secret: { Args: { _v: string }; Returns: string }
      materialize_recurring_tasks: {
        Args: { _through?: string; _user_id: string }
        Returns: number
      }
      mirror_mock_question_to_personalized: {
        Args: { _question_id: string }
        Returns: undefined
      }
      mock_question_counts: {
        Args: never
        Returns: {
          question_count: number
          test_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_faq_question: { Args: { _question: string }; Returns: string }
      personalized_hub_today_count: {
        Args: { _user_id: string }
        Returns: number
      }
      pick_personalized_questions: {
        Args: {
          _count: number
          _difficulty: string
          _exam_code: string
          _sections: string[]
          _user_id: string
        }
        Returns: {
          correct_index: number
          created_at: string
          created_by: string | null
          difficulty: string
          exam_code: string
          explanation: string | null
          id: string
          options: Json
          question_hash: string | null
          question_text: string
          section: string
          source: string | null
          topic: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "personalized_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recover_stale_bulk_jobs: {
        Args: { _threshold_minutes?: number }
        Returns: Json
      }
      recover_stale_mock_section_jobs: {
        Args: { _threshold_minutes?: number }
        Returns: number
      }
      refresh_bulk_college_job_metrics: {
        Args: { _job_id: string }
        Returns: undefined
      }
      refresh_bulk_section_job_metrics: {
        Args: { _job_id: string }
        Returns: undefined
      }
      refresh_colleges_listing_cache: { Args: never; Returns: undefined }
      refresh_leaderboard_caches: { Args: never; Returns: undefined }
      rollover_planner_tasks: { Args: { _user_id: string }; Returns: number }
      rollup_mock_generation: {
        Args: { _generation_id: string }
        Returns: undefined
      }
      rollup_personalized_bulk_job: {
        Args: { _job_id: string }
        Returns: undefined
      }
      save_shortlister_submission: {
        Args: {
          p_email: string
          p_form_data: Json
          p_full_name: string
          p_payload: Json
          p_results_count: number
          p_status: string
          p_submission_id: string
        }
        Returns: string
      }
      seo_intel_claim_job: {
        Args: { p_lease_seconds?: number }
        Returns: {
          created_at: string
          data_source: string | null
          dedupe_key: string | null
          error: string | null
          errors: Json
          finished_at: string | null
          id: string
          job_type: string
          lease_until: string | null
          max_retries: number
          payload: Json
          priority: number
          progress: Json
          records_processed: number
          retry_count: number
          scheduled_for: string
          started_at: string | null
          status: string
          triggered_by: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "seo_intel_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      seo_intel_recover_stalled: { Args: never; Returns: number }
      seo_intel_tick: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      system_check_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          jobname: string
          schedule: string
        }[]
      }
      unlock_bundle_mocks: {
        Args: { _bundle_id: string; _user_id: string }
        Returns: number
      }
      user_has_mock_access: {
        Args: { _test_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_listing: {
        Args: { _target_id: string; _target_table: string; _user_id: string }
        Returns: boolean
      }
      vocab_due_for_review: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          antonyms: string[]
          category: Database["public"]["Enums"]["vocab_category"]
          created_at: string
          difficulty: Database["public"]["Enums"]["vocab_difficulty"]
          exam_appearances: string[]
          example_business: string | null
          example_email: string | null
          example_interview: string | null
          hinglish_meaning: string | null
          id: string
          meaning: string
          meaning_hindi: string | null
          part_of_speech: string | null
          pronunciation: string | null
          pronunciation_syllables: string | null
          slug: string
          source: string
          synonyms: string[]
          updated_at: string
          word: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vocab_words"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      vocab_mark_read: {
        Args: { _read?: boolean; _word_id: string }
        Returns: undefined
      }
      vocab_update_progress: {
        Args: { _correct: boolean; _word_id: string }
        Returns: {
          id: string
          is_read: boolean
          last_seen_at: string | null
          mastery: number
          next_review_at: string
          read_at: string | null
          times_correct: number
          times_seen: number
          updated_at: string
          user_id: string
          word_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vocab_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      whatsapp_bump_daily: {
        Args: {
          p_campaign: string
          p_date: string
          p_failed: number
          p_sent: number
        }
        Returns: undefined
      }
      whatsapp_campaign_progress: {
        Args: never
        Returns: {
          campaign_id: string
          failed: number
          pending: number
          retry: number
          sent: number
          total: number
        }[]
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
      mock_section_code:
        | "VARC"
        | "DILR"
        | "QA"
        | "VALR"
        | "DM"
        | "QADI"
        | "GK"
        | "LS"
        | "LR"
        | "QS"
        | "GE"
        | "AR"
        | "QADS"
        | "GA"
        | "IE"
        | "LC"
        | "MS"
        | "DA"
        | "ICR"
        | "IGE"
        | "VARC_DI"
        | "DILR_GK"
        | "DCR"
        | "VA"
      mock_test_type:
        | "full_length"
        | "sectional"
        | "topic"
        | "topic_wise"
        | "practice_set"
      quant_difficulty: "beginner" | "intermediate" | "cat" | "advanced"
      quant_progress_status: "none" | "completed" | "revise_later" | "mastered"
      ticket_category:
        | "mock_issue"
        | "payment_issue"
        | "login_issue"
        | "technical_issue"
        | "ai_tools"
        | "other"
      ticket_message_sender: "student" | "admin" | "system"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      vocab_category:
        | "finance"
        | "marketing"
        | "consulting"
        | "hr"
        | "economics"
        | "corp_comm"
        | "general"
      vocab_difficulty: "beginner" | "intermediate" | "cat" | "gdpi"
      vocab_quiz_type: "mcq" | "fill" | "synonym" | "correction" | "context"
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
      mock_section_code: [
        "VARC",
        "DILR",
        "QA",
        "VALR",
        "DM",
        "QADI",
        "GK",
        "LS",
        "LR",
        "QS",
        "GE",
        "AR",
        "QADS",
        "GA",
        "IE",
        "LC",
        "MS",
        "DA",
        "ICR",
        "IGE",
        "VARC_DI",
        "DILR_GK",
        "DCR",
        "VA",
      ],
      mock_test_type: [
        "full_length",
        "sectional",
        "topic",
        "topic_wise",
        "practice_set",
      ],
      quant_difficulty: ["beginner", "intermediate", "cat", "advanced"],
      quant_progress_status: ["none", "completed", "revise_later", "mastered"],
      ticket_category: [
        "mock_issue",
        "payment_issue",
        "login_issue",
        "technical_issue",
        "ai_tools",
        "other",
      ],
      ticket_message_sender: ["student", "admin", "system"],
      ticket_priority: ["low", "medium", "high"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      vocab_category: [
        "finance",
        "marketing",
        "consulting",
        "hr",
        "economics",
        "corp_comm",
        "general",
      ],
      vocab_difficulty: ["beginner", "intermediate", "cat", "gdpi"],
      vocab_quiz_type: ["mcq", "fill", "synonym", "correction", "context"],
    },
  },
} as const

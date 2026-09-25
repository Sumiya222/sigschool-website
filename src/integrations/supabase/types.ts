export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      affiliations: {
        Row: {
          created_at: string;
          id: string;
          logo_media_id: string | null;
          name: string;
          note: string | null;
          order: number;
          scope: Database["public"]["Enums"]["affiliation_scope"];
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_media_id?: string | null;
          name: string;
          note?: string | null;
          order?: number;
          scope?: Database["public"]["Enums"]["affiliation_scope"];
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_media_id?: string | null;
          name?: string;
          note?: string | null;
          order?: number;
          scope?: Database["public"]["Enums"]["affiliation_scope"];
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "affiliations_logo_media_id_fkey";
            columns: ["logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          session_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          student_id: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          student_id: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "result_cards";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action_type: string;
          actor_user_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action_type: string;
          actor_user_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action_type?: string;
          actor_user_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      camp_window: {
        Row: {
          age_tracks: string;
          camp_name: string;
          capacity: number | null;
          closed_message: string;
          closed_target: string;
          dates_label: string;
          id: string;
          is_open: boolean;
          note: string;
          register_label: string;
          register_url: string;
          registration_mode: Database["public"]["Enums"]["registration_mode"];
          show_closed_strip: boolean;
          singleton: boolean;
          updated_at: string;
          venue: string;
        };
        Insert: {
          age_tracks?: string;
          camp_name?: string;
          capacity?: number | null;
          closed_message?: string;
          closed_target?: string;
          dates_label?: string;
          id?: string;
          is_open?: boolean;
          note?: string;
          register_label?: string;
          register_url?: string;
          registration_mode?: Database["public"]["Enums"]["registration_mode"];
          show_closed_strip?: boolean;
          singleton?: boolean;
          updated_at?: string;
          venue?: string;
        };
        Update: {
          age_tracks?: string;
          camp_name?: string;
          capacity?: number | null;
          closed_message?: string;
          closed_target?: string;
          dates_label?: string;
          id?: string;
          is_open?: boolean;
          note?: string;
          register_label?: string;
          register_url?: string;
          registration_mode?: Database["public"]["Enums"]["registration_mode"];
          show_closed_strip?: boolean;
          singleton?: boolean;
          updated_at?: string;
          venue?: string;
        };
        Relationships: [];
      };
      class_sessions: {
        Row: {
          created_at: string;
          data_updated_at: string;
          id: string;
          instructor_user_id: string;
          section_id: string;
          session_date: string;
          term_id: string;
          week_number: number | null;
        };
        Insert: {
          created_at?: string;
          data_updated_at?: string;
          id?: string;
          instructor_user_id: string;
          section_id: string;
          session_date: string;
          term_id: string;
          week_number?: number | null;
        };
        Update: {
          created_at?: string;
          data_updated_at?: string;
          id?: string;
          instructor_user_id?: string;
          section_id?: string;
          session_date?: string;
          term_id?: string;
          week_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_sessions_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: false;
            referencedRelation: "result_cards";
            referencedColumns: ["term_id"];
          },
          {
            foreignKeyName: "class_sessions_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
        ];
      };
      company_settings: {
        Row: {
          account_number: string | null;
          account_title: string | null;
          bank_name: string | null;
          iban: string | null;
          id: string;
          singleton: boolean;
          updated_at: string;
        };
        Insert: {
          account_number?: string | null;
          account_title?: string | null;
          bank_name?: string | null;
          iban?: string | null;
          id?: string;
          singleton?: boolean;
          updated_at?: string;
        };
        Update: {
          account_number?: string | null;
          account_title?: string | null;
          bank_name?: string | null;
          iban?: string | null;
          id?: string;
          singleton?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      digest_state: {
        Row: {
          capacity_alert_camp: string | null;
          id: string;
          last_sent_at: string;
          singleton: boolean;
        };
        Insert: {
          capacity_alert_camp?: string | null;
          id?: string;
          last_sent_at?: string;
          singleton?: boolean;
        };
        Update: {
          capacity_alert_camp?: string | null;
          id?: string;
          last_sent_at?: string;
          singleton?: boolean;
        };
        Relationships: [];
      };
      enrollment_history: {
        Row: {
          academic_year: string;
          created_at: string;
          end_date: string | null;
          grade: number;
          id: string;
          school_id: string;
          section_id: string;
          start_date: string;
          student_id: string;
        };
        Insert: {
          academic_year: string;
          created_at?: string;
          end_date?: string | null;
          grade: number;
          id?: string;
          school_id: string;
          section_id: string;
          start_date?: string;
          student_id: string;
        };
        Update: {
          academic_year?: string;
          created_at?: string;
          end_date?: string | null;
          grade?: number;
          id?: string;
          school_id?: string;
          section_id?: string;
          start_date?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollment_history_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollment_history_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollment_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "result_cards";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "enrollment_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      faculty_claims: {
        Row: {
          claim_group: string;
          claim_key: string;
          created_at: string;
          description: string | null;
          id: string;
          is_placeholder: boolean;
          label: string;
          order: number;
          updated_at: string;
          value: string;
        };
        Insert: {
          claim_group?: string;
          claim_key: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_placeholder?: boolean;
          label: string;
          order?: number;
          updated_at?: string;
          value: string;
        };
        Update: {
          claim_group?: string;
          claim_key?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_placeholder?: boolean;
          label?: string;
          order?: number;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      featured_students: {
        Row: {
          achievement: string;
          age: number | null;
          consent_confirmed: boolean;
          created_at: string;
          full_name: string;
          grade: string | null;
          id: string;
          order: number;
          photo_media_id: string | null;
          project_id: string | null;
          quote: string | null;
          school: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          achievement?: string;
          age?: number | null;
          consent_confirmed?: boolean;
          created_at?: string;
          full_name: string;
          grade?: string | null;
          id?: string;
          order?: number;
          photo_media_id?: string | null;
          project_id?: string | null;
          quote?: string | null;
          school?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          achievement?: string;
          age?: number | null;
          consent_confirmed?: boolean;
          created_at?: string;
          full_name?: string;
          grade?: string | null;
          id?: string;
          order?: number;
          photo_media_id?: string | null;
          project_id?: string | null;
          quote?: string | null;
          school?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "featured_students_photo_media_id_fkey";
            columns: ["photo_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "featured_students_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      gallery_images: {
        Row: {
          caption: string;
          consent_confirmed: boolean;
          created_at: string;
          description: string | null;
          id: string;
          location: string | null;
          media_id: string | null;
          order: number;
          taken_on: string | null;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          caption?: string;
          consent_confirmed?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          media_id?: string | null;
          order?: number;
          taken_on?: string | null;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          caption?: string;
          consent_confirmed?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          media_id?: string | null;
          order?: number;
          taken_on?: string | null;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "gallery_images_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      hero_carousel: {
        Row: {
          created_at: string;
          id: string;
          media_id: string | null;
          order: number;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          media_id?: string | null;
          order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          media_id?: string | null;
          order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "hero_carousel_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: {
          created_at: string;
          details: Json;
          email: string;
          full_name: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          ip_hash: string | null;
          message: string;
          phone: string;
          role: string | null;
          school_name: string | null;
          status: Database["public"]["Enums"]["inquiry_status"];
          type: Database["public"]["Enums"]["inquiry_type"];
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          details?: Json;
          email: string;
          full_name: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          ip_hash?: string | null;
          message: string;
          phone: string;
          role?: string | null;
          school_name?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          type?: Database["public"]["Enums"]["inquiry_type"];
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          details?: Json;
          email?: string;
          full_name?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          ip_hash?: string | null;
          message?: string;
          phone?: string;
          role?: string | null;
          school_name?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          type?: Database["public"]["Enums"]["inquiry_type"];
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      instructor_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          id: string;
          instructor_user_id: string;
          revoked_at: string | null;
          section_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          id?: string;
          instructor_user_id: string;
          revoked_at?: string | null;
          section_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          id?: string;
          instructor_user_id?: string;
          revoked_at?: string | null;
          section_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instructor_assignments_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          active_student_count: number;
          amount_paid: number;
          arrears_amount: number;
          arrears_note: string | null;
          billing_month: string;
          created_at: string;
          due_date: string;
          generated_at: string;
          generated_by: string | null;
          id: string;
          invoice_number: string;
          notes: string | null;
          rate_per_student: number;
          school_id: string;
          total_amount: number | null;
          updated_at: string;
        };
        Insert: {
          active_student_count: number;
          amount_paid?: number;
          arrears_amount?: number;
          arrears_note?: string | null;
          billing_month: string;
          created_at?: string;
          due_date: string;
          generated_at?: string;
          generated_by?: string | null;
          id?: string;
          invoice_number: string;
          notes?: string | null;
          rate_per_student: number;
          school_id: string;
          total_amount?: number | null;
          updated_at?: string;
        };
        Update: {
          active_student_count?: number;
          amount_paid?: number;
          arrears_amount?: number;
          arrears_note?: string | null;
          billing_month?: string;
          created_at?: string;
          due_date?: string;
          generated_at?: string;
          generated_by?: string | null;
          id?: string;
          invoice_number?: string;
          notes?: string | null;
          rate_per_student?: number;
          school_id?: string;
          total_amount?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      job_applications: {
        Row: {
          cover_note: string | null;
          created_at: string;
          cv_file_name: string | null;
          cv_storage_path: string;
          email: string;
          full_name: string;
          id: string;
          ip_hash: string | null;
          job_opening_id: string | null;
          linkedin_url: string | null;
          notes: string | null;
          phone: string;
          status: Database["public"]["Enums"]["application_status"];
          updated_at: string;
        };
        Insert: {
          cover_note?: string | null;
          created_at?: string;
          cv_file_name?: string | null;
          cv_storage_path: string;
          email: string;
          full_name: string;
          id?: string;
          ip_hash?: string | null;
          job_opening_id?: string | null;
          linkedin_url?: string | null;
          notes?: string | null;
          phone: string;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
        };
        Update: {
          cover_note?: string | null;
          created_at?: string;
          cv_file_name?: string | null;
          cv_storage_path?: string;
          email?: string;
          full_name?: string;
          id?: string;
          ip_hash?: string | null;
          job_opening_id?: string | null;
          linkedin_url?: string | null;
          notes?: string | null;
          phone?: string;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_job_opening_id_fkey";
            columns: ["job_opening_id"];
            isOneToOne: false;
            referencedRelation: "job_openings";
            referencedColumns: ["id"];
          },
        ];
      };
      job_openings: {
        Row: {
          closes_at: string | null;
          created_at: string;
          department: string;
          description: string;
          employment_type: Database["public"]["Enums"]["employment_type"];
          id: string;
          location: string;
          order: number;
          posted_at: string;
          requirements: string;
          responsibilities: string;
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          closes_at?: string | null;
          created_at?: string;
          department?: string;
          description?: string;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          id?: string;
          location?: string;
          order?: number;
          posted_at?: string;
          requirements?: string;
          responsibilities?: string;
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          closes_at?: string | null;
          created_at?: string;
          department?: string;
          description?: string;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          id?: string;
          location?: string;
          order?: number;
          posted_at?: string;
          requirements?: string;
          responsibilities?: string;
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      leadership: {
        Row: {
          bio: string | null;
          bio_confirmed: boolean;
          created_at: string;
          id: string;
          media_id: string | null;
          name: string;
          order: number;
          tier: Database["public"]["Enums"]["team_tier"];
          title: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          bio?: string | null;
          bio_confirmed?: boolean;
          created_at?: string;
          id?: string;
          media_id?: string | null;
          name: string;
          order?: number;
          tier?: Database["public"]["Enums"]["team_tier"];
          title?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          bio?: string | null;
          bio_confirmed?: boolean;
          created_at?: string;
          id?: string;
          media_id?: string | null;
          name?: string;
          order?: number;
          tier?: Database["public"]["Enums"]["team_tier"];
          title?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "leadership_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      marks: {
        Row: {
          id: string;
          max_score: number;
          score: number | null;
          session_id: string;
          student_id: string;
        };
        Insert: {
          id?: string;
          max_score: number;
          score?: number | null;
          session_id: string;
          student_id: string;
        };
        Update: {
          id?: string;
          max_score?: number;
          score?: number | null;
          session_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marks_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "result_cards";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "marks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          alt_text: string;
          created_at: string;
          height: number | null;
          id: string;
          storage_path: string;
          tag: string | null;
          uploaded_by: string | null;
          width: number | null;
        };
        Insert: {
          alt_text: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          storage_path: string;
          tag?: string | null;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          storage_path?: string;
          tag?: string | null;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [];
      };
      nav_items: {
        Row: {
          created_at: string;
          footer_column: string | null;
          id: string;
          label: string;
          location: Database["public"]["Enums"]["nav_location"];
          order: number;
          target: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          footer_column?: string | null;
          id?: string;
          label: string;
          location?: Database["public"]["Enums"]["nav_location"];
          order?: number;
          target: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          footer_column?: string | null;
          id?: string;
          label?: string;
          location?: Database["public"]["Enums"]["nav_location"];
          order?: number;
          target?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      page_sections: {
        Row: {
          content: Json;
          id: string;
          mode: Database["public"]["Enums"]["section_mode"];
          order: number;
          page_slug: string;
          section_key: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          content?: Json;
          id?: string;
          mode?: Database["public"]["Enums"]["section_mode"];
          order?: number;
          page_slug: string;
          section_key: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          content?: Json;
          id?: string;
          mode?: Database["public"]["Enums"]["section_mode"];
          order?: number;
          page_slug?: string;
          section_key?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "page_sections_page_slug_fkey";
            columns: ["page_slug"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["slug"];
          },
        ];
      };
      pages: {
        Row: {
          id: string;
          order: number;
          published: boolean;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order?: number;
          published?: boolean;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order?: number;
          published?: boolean;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partners_schools: {
        Row: {
          blurb: string | null;
          created_at: string;
          id: string;
          logo_media_id: string | null;
          name: string;
          order: number;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          blurb?: string | null;
          created_at?: string;
          id?: string;
          logo_media_id?: string | null;
          name: string;
          order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          blurb?: string | null;
          created_at?: string;
          id?: string;
          logo_media_id?: string | null;
          name?: string;
          order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "partners_schools_logo_media_id_fkey";
            columns: ["logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          invoice_id: string;
          notes: string | null;
          paid_at: string;
          recorded_by: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          invoice_id: string;
          notes?: string | null;
          paid_at?: string;
          recorded_by?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          invoice_id?: string;
          notes?: string | null;
          paid_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          badge_label: string;
          created_at: string;
          description: string;
          id: string;
          mod_code: string;
          name: string;
          order: number;
          tags: string[];
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          badge_label?: string;
          created_at?: string;
          description?: string;
          id?: string;
          mod_code: string;
          name: string;
          order?: number;
          tags?: string[];
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          badge_label?: string;
          created_at?: string;
          description?: string;
          id?: string;
          mod_code?: string;
          name?: string;
          order?: number;
          tags?: string[];
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          age_range: string;
          created_at: string;
          description: string | null;
          description_confirmed: boolean;
          domain: Database["public"]["Enums"]["project_domain"];
          featured: boolean;
          id: string;
          media_id: string | null;
          order: number;
          title: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          age_range?: string;
          created_at?: string;
          description?: string | null;
          description_confirmed?: boolean;
          domain: Database["public"]["Enums"]["project_domain"];
          featured?: boolean;
          id?: string;
          media_id?: string | null;
          order?: number;
          title: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          age_range?: string;
          created_at?: string;
          description?: string | null;
          description_confirmed?: boolean;
          domain?: Database["public"]["Enums"]["project_domain"];
          featured?: boolean;
          id?: string;
          media_id?: string | null;
          order?: number;
          title?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "projects_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      registration_fields: {
        Row: {
          active: boolean;
          created_at: string;
          field_type: Database["public"]["Enums"]["registration_field_type"];
          help_text: string | null;
          id: string;
          label: string;
          options: Json;
          order: number;
          required: boolean;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          field_type?: Database["public"]["Enums"]["registration_field_type"];
          help_text?: string | null;
          id?: string;
          label: string;
          options?: Json;
          order?: number;
          required?: boolean;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          field_type?: Database["public"]["Enums"]["registration_field_type"];
          help_text?: string | null;
          id?: string;
          label?: string;
          options?: Json;
          order?: number;
          required?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          age_track: string;
          camp_name: string;
          consent_media: boolean;
          created_at: string;
          custom_answers: Json;
          id: string;
          ip_hash: string | null;
          medical_notes: string | null;
          parent_email: string;
          parent_name: string;
          parent_phone: string;
          status: Database["public"]["Enums"]["registration_status"];
          student_age: number;
          student_first_name: string;
          student_last_name: string;
          student_school: string | null;
          updated_at: string;
        };
        Insert: {
          age_track: string;
          camp_name: string;
          consent_media?: boolean;
          created_at?: string;
          custom_answers?: Json;
          id?: string;
          ip_hash?: string | null;
          medical_notes?: string | null;
          parent_email: string;
          parent_name: string;
          parent_phone: string;
          status?: Database["public"]["Enums"]["registration_status"];
          student_age: number;
          student_first_name: string;
          student_last_name: string;
          student_school?: string | null;
          updated_at?: string;
        };
        Update: {
          age_track?: string;
          camp_name?: string;
          consent_media?: boolean;
          created_at?: string;
          custom_answers?: Json;
          id?: string;
          ip_hash?: string | null;
          medical_notes?: string | null;
          parent_email?: string;
          parent_name?: string;
          parent_phone?: string;
          status?: Database["public"]["Enums"]["registration_status"];
          student_age?: number;
          student_first_name?: string;
          student_last_name?: string;
          student_school?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      remarks: {
        Row: {
          created_at: string;
          id: string;
          remark_text: string | null;
          session_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          remark_text?: string | null;
          session_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          remark_text?: string | null;
          session_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "remarks_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remarks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "result_cards";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "remarks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          monthly_rate_per_student: number | null;
          name: string;
          project_start_date: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          monthly_rate_per_student?: number | null;
          name: string;
          project_start_date?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          monthly_rate_per_student?: number | null;
          name?: string;
          project_start_date?: string | null;
        };
        Relationships: [];
      };
      sections: {
        Row: {
          created_at: string;
          grade: number;
          id: string;
          school_id: string;
          section_name: string;
        };
        Insert: {
          created_at?: string;
          grade: number;
          id?: string;
          school_id: string;
          section_name: string;
        };
        Update: {
          created_at?: string;
          grade?: number;
          id?: string;
          school_id?: string;
          section_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      sheet_sync_queue: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          last_error: string | null;
          payload: Json;
          record_id: string;
          source_table: string;
          status: string;
          synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          record_id: string;
          source_table: string;
          status?: string;
          synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          record_id?: string;
          source_table?: string;
          status?: string;
          synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      site_stats: {
        Row: {
          id: string;
          is_placeholder: boolean;
          key: string;
          label: string;
          order: number;
          suffix: string | null;
          updated_at: string;
          value: string;
        };
        Insert: {
          id?: string;
          is_placeholder?: boolean;
          key: string;
          label: string;
          order?: number;
          suffix?: string | null;
          updated_at?: string;
          value?: string;
        };
        Update: {
          id?: string;
          is_placeholder?: boolean;
          key?: string;
          label?: string;
          order?: number;
          suffix?: string | null;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      storage_quota_alert_state: {
        Row: {
          bucket_id: string;
          fired_at: string;
          threshold_percent: number;
        };
        Insert: {
          bucket_id: string;
          fired_at?: string;
          threshold_percent: number;
        };
        Update: {
          bucket_id?: string;
          fired_at?: string;
          threshold_percent?: number;
        };
        Relationships: [];
      };
      students: {
        Row: {
          created_at: string;
          created_by: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          notes: string | null;
          roll_number: string | null;
          section_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          notes?: string | null;
          roll_number?: string | null;
          section_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          notes?: string | null;
          roll_number?: string | null;
          section_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      terms: {
        Row: {
          created_at: string;
          end_date: string;
          id: string;
          is_active: boolean;
          name: string;
          start_date: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          id?: string;
          is_active?: boolean;
          name: string;
          start_date: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          start_date?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          attribution: string | null;
          created_at: string;
          id: string;
          is_placeholder: boolean;
          order: number;
          quote: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          attribution?: string | null;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          order?: number;
          quote: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          attribution?: string | null;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          order?: number;
          quote?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          school_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          school_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      whitelist: {
        Row: {
          assigned_school_id: string | null;
          created_at: string;
          created_by: string | null;
          email: string;
          id: string;
          is_super_admin: boolean;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["whitelist_status"];
        };
        Insert: {
          assigned_school_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          email: string;
          id?: string;
          is_super_admin?: boolean;
          role: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["whitelist_status"];
        };
        Update: {
          assigned_school_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string;
          id?: string;
          is_super_admin?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["whitelist_status"];
        };
        Relationships: [
          {
            foreignKeyName: "whitelist_assigned_school_id_fkey";
            columns: ["assigned_school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      result_cards: {
        Row: {
          attendance_percent: number | null;
          average_percent: number | null;
          full_name: string | null;
          marks_obtained: number | null;
          marks_total: number | null;
          present_count: number | null;
          remarks_concatenated: string | null;
          roll_number: string | null;
          section_id: string | null;
          student_id: string | null;
          term_id: string | null;
          term_name: string | null;
          total_sessions: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      admin_instructor_whitelisted_by: {
        Args: { _email: string };
        Returns: string;
      };
      admin_list_audit_log: {
        Args: {
          _action_type: string;
          _from: string;
          _limit: number;
          _to: string;
        };
        Returns: {
          action_type: string;
          actor_email: string;
          actor_user_id: string;
          created_at: string;
          details: Json;
          id: string;
          target_id: string;
          target_type: string;
        }[];
      };
      admin_list_instructors: {
        Args: never;
        Returns: {
          assignments_count: number;
          created_at: string;
          email: string;
          full_name: string;
          user_id: string;
          whitelist_status: Database["public"]["Enums"]["whitelist_status"];
        }[];
      };
      admin_set_instructor_status: {
        Args: {
          _email: string;
          _status: Database["public"]["Enums"]["whitelist_status"];
        };
        Returns: undefined;
      };
      can_edit_site: { Args: never; Returns: boolean };
      check_whitelist: {
        Args: { _email: string };
        Returns: {
          approved: boolean;
          role: Database["public"]["Enums"]["app_role"];
        }[];
      };
      compute_academic_year: { Args: { _d?: string }; Returns: string };
      current_user_school_id: { Args: never; Returns: string };
      generate_invoice:
        | {
            Args: {
              _billing_month: string;
              _due_date: string;
              _notes?: string;
              _school_id: string;
            };
            Returns: string;
          }
        | {
            Args: {
              _arrears_amount?: number;
              _arrears_note?: string;
              _billing_month: string;
              _due_date: string;
              _notes?: string;
              _rate_override?: number;
              _school_id: string;
            };
            Returns: string;
          };
      get_bucket_total_bytes: {
        Args: { _bucket_id: string };
        Returns: number;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_assigned_to_section: {
        Args: { _section_id: string };
        Returns: boolean;
      };
      is_current_user_super_admin: { Args: never; Returns: boolean };
      is_school_active: { Args: { _school_id: string }; Returns: boolean };
      is_whitelist_approved: { Args: { _user_id: string }; Returns: boolean };
      promote_students: {
        Args: {
          _academic_year: string;
          _student_ids: string[];
          _target_section_id: string;
        };
        Returns: number;
      };
      record_payment: {
        Args: {
          _amount: number;
          _invoice_id: string;
          _notes?: string;
          _paid_at: string;
        };
        Returns: string;
      };
      save_session: {
        Args: { _loaded_at: string; _rows: Json; _session_id: string };
        Returns: string;
      };
      section_cumulative_result_cards: {
        Args: { _section_id: string };
        Returns: {
          attendance_percent: number | null;
          average_percent: number | null;
          full_name: string;
          marks_obtained: number | null;
          marks_total: number | null;
          present_count: number;
          remarks_concatenated: string;
          roll_number: string | null;
          student_id: string;
          total_sessions: number;
        }[];
      };
      section_school_id: { Args: { _section_id: string }; Returns: string };
      session_section_id: { Args: { _session_id: string }; Returns: string };
      set_active_term: { Args: { _term_id: string }; Returns: undefined };
      verify_dashboard_access: {
        Args: { _selected: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
    };
    Enums: {
      affiliation_scope: "national" | "international";
      app_role: "admin" | "school" | "instructor" | "cms";
      application_status: "new" | "reviewing" | "interviewed" | "rejected" | "hired";
      attendance_status: "present" | "absent" | "late";
      employment_type: "Full-time" | "Part-time" | "Contract" | "Internship";
      inquiry_status: "new" | "handled";
      inquiry_type: "parent" | "school" | "other";
      job_status: "open" | "closed";
      nav_location: "nav" | "footer";
      project_domain: "robotics" | "ai" | "space";
      registration_field_type:
        "text" | "textarea" | "number" | "dropdown" | "checkbox" | "radio" | "date" | "file";
      registration_mode: "built_in" | "external" | "closed";
      registration_status: "new" | "confirmed" | "waitlisted" | "cancelled";
      section_mode: "rich_text" | "list" | "cards" | "gallery" | "custom";
      team_tier: "leadership" | "team";
      whitelist_status: "pending" | "approved" | "revoked";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      affiliation_scope: ["national", "international"],
      app_role: ["admin", "school", "instructor", "cms"],
      application_status: ["new", "reviewing", "interviewed", "rejected", "hired"],
      attendance_status: ["present", "absent", "late"],
      employment_type: ["Full-time", "Part-time", "Contract", "Internship"],
      inquiry_status: ["new", "handled"],
      inquiry_type: ["parent", "school", "other"],
      job_status: ["open", "closed"],
      nav_location: ["nav", "footer"],
      project_domain: ["robotics", "ai", "space"],
      registration_field_type: [
        "text",
        "textarea",
        "number",
        "dropdown",
        "checkbox",
        "radio",
        "date",
        "file",
      ],
      registration_mode: ["built_in", "external", "closed"],
      registration_status: ["new", "confirmed", "waitlisted", "cancelled"],
      section_mode: ["rich_text", "list", "cards", "gallery", "custom"],
      team_tier: ["leadership", "team"],
      whitelist_status: ["pending", "approved", "revoked"],
    },
  },
} as const;

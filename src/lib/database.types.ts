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
      academies: {
        Row: {
          address: string | null
          bank_account: Json | null
          business_registration_number: string | null
          camp_only: boolean
          closure_notice_sent_at: string | null
          created_at: string | null
          id: string
          is_suspended: boolean | null
          is_test: boolean
          logo_url: string | null
          name: string
          onboarding_completed_at: string | null
          onboarding_token: string | null
          onboarding_token_expires_at: string | null
          portone_contract_id: string | null
          portone_partner_id: string | null
          subscription_tier: string | null
          suspended_at: string | null
          suspension_reason: string | null
          tax_type: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: Json | null
          business_registration_number?: string | null
          camp_only?: boolean
          closure_notice_sent_at?: string | null
          created_at?: string | null
          id?: string
          is_suspended?: boolean | null
          is_test?: boolean
          logo_url?: string | null
          name: string
          onboarding_completed_at?: string | null
          onboarding_token?: string | null
          onboarding_token_expires_at?: string | null
          portone_contract_id?: string | null
          portone_partner_id?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tax_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: Json | null
          business_registration_number?: string | null
          camp_only?: boolean
          closure_notice_sent_at?: string | null
          created_at?: string | null
          id?: string
          is_suspended?: boolean | null
          is_test?: boolean
          logo_url?: string | null
          name?: string
          onboarding_completed_at?: string | null
          onboarding_token?: string | null
          onboarding_token_expires_at?: string | null
          portone_contract_id?: string | null
          portone_partner_id?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tax_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      academy_custom_colors: {
        Row: {
          academy_id: string
          color: string
          created_at: string | null
          created_by: string | null
          id: string
        }
        Insert: {
          academy_id: string
          color: string
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Update: {
          academy_id?: string
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_custom_colors_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_custom_colors_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "academy_custom_colors_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_notes: {
        Row: {
          academy_id: string
          admin_user_id: string
          content: string
          created_at: string | null
          id: string
          is_important: boolean | null
          note_type: string
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          admin_user_id: string
          content: string
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          note_type: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          admin_user_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          note_type?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_notes_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_notes_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "academy_notes_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_notes_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_settings: {
        Row: {
          academy_id: string | null
          academy_timezone: string | null
          allow_parent_registration: boolean | null
          created_at: string | null
          default_session_duration: number | null
          id: string
          require_payment_approval: boolean | null
          updated_at: string | null
        }
        Insert: {
          academy_id?: string | null
          academy_timezone?: string | null
          allow_parent_registration?: boolean | null
          created_at?: string | null
          default_session_duration?: number | null
          id?: string
          require_payment_approval?: boolean | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string | null
          academy_timezone?: string | null
          allow_parent_registration?: boolean | null
          created_at?: string | null
          default_session_duration?: number | null
          id?: string
          require_payment_approval?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_settings_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_settings_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "academy_settings_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_subscriptions: {
        Row: {
          academy_id: string
          additional_storage_gb: number
          additional_students: number
          additional_teachers: number
          auto_renew: boolean | null
          billing_cycle: string
          billing_key: string | null
          billing_key_cancelled_at: string | null
          billing_key_issued_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          features_enabled: Json | null
          id: string
          kg_customer_id: string | null
          kg_subscription_id: string | null
          last_payment_date: string | null
          monthly_amount: number
          next_billing_date: string | null
          pending_additional_storage_gb: number | null
          pending_additional_students: number | null
          pending_additional_teachers: number | null
          pending_addons_effective_date: string | null
          pending_change_effective_date: string | null
          pending_monthly_amount: number | null
          pending_tier: string | null
          plan_tier: string
          status: string
          storage_limit_gb: number
          student_limit: number
          teacher_limit: number
          total_user_limit: number
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          additional_storage_gb?: number
          additional_students?: number
          additional_teachers?: number
          auto_renew?: boolean | null
          billing_cycle: string
          billing_key?: string | null
          billing_key_cancelled_at?: string | null
          billing_key_issued_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          features_enabled?: Json | null
          id?: string
          kg_customer_id?: string | null
          kg_subscription_id?: string | null
          last_payment_date?: string | null
          monthly_amount: number
          next_billing_date?: string | null
          pending_additional_storage_gb?: number | null
          pending_additional_students?: number | null
          pending_additional_teachers?: number | null
          pending_addons_effective_date?: string | null
          pending_change_effective_date?: string | null
          pending_monthly_amount?: number | null
          pending_tier?: string | null
          plan_tier: string
          status: string
          storage_limit_gb?: number
          student_limit?: number
          teacher_limit?: number
          total_user_limit?: number
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          additional_storage_gb?: number
          additional_students?: number
          additional_teachers?: number
          auto_renew?: boolean | null
          billing_cycle?: string
          billing_key?: string | null
          billing_key_cancelled_at?: string | null
          billing_key_issued_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          features_enabled?: Json | null
          id?: string
          kg_customer_id?: string | null
          kg_subscription_id?: string | null
          last_payment_date?: string | null
          monthly_amount?: number
          next_billing_date?: string | null
          pending_additional_storage_gb?: number | null
          pending_additional_students?: number | null
          pending_additional_teachers?: number | null
          pending_addons_effective_date?: string | null
          pending_change_effective_date?: string | null
          pending_monthly_amount?: number | null
          pending_tier?: string | null
          plan_tier?: string
          status?: string
          storage_limit_gb?: number
          student_limit?: number
          teacher_limit?: number
          total_user_limit?: number
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_subscriptions_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_subscriptions_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "academy_subscriptions_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_log: {
        Row: {
          created_at: string
          hard_deleted_at: string | null
          id: string
          reactivated_at: string | null
          reason: string | null
          requested_from_ip: string | null
          requested_user_agent: string | null
          scheduled_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          hard_deleted_at?: string | null
          id?: string
          reactivated_at?: string | null
          reason?: string | null
          requested_from_ip?: string | null
          requested_user_agent?: string | null
          scheduled_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          hard_deleted_at?: string | null
          id?: string
          reactivated_at?: string | null
          reason?: string | null
          requested_from_ip?: string | null
          requested_user_agent?: string | null
          scheduled_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          description: string
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string | null
          updated_by: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string | null
          updated_by: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          context: Json | null
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          context?: Json | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          context?: Json | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          announcement_id: string
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          announcement_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_classrooms: {
        Row: {
          announcement_id: string
          classroom_id: string
          id: string
        }
        Insert: {
          announcement_id: string
          classroom_id: string
          id?: string
        }
        Update: {
          announcement_id?: string
          classroom_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_classrooms_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_classrooms_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          academy_id: string
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "announcements_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_attachments: {
        Row: {
          assignment_id: string
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_attachments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_categories: {
        Row: {
          academy_id: string
          created_at: string | null
          deleted_at: string | null
          display_order: number | null
          id: string
          name: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          deleted_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
          deleted_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_categories_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_categories_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "assignment_categories_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_categories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_comments: {
        Row: {
          assignment_id: string
          created_at: string | null
          id: string
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          id?: string
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          id?: string
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_comments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_grades: {
        Row: {
          assignment_id: string
          created_at: string | null
          feedback: string | null
          id: string
          score: number | null
          status: string
          student_id: string
          student_record_id: string | null
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string
          student_id: string
          student_record_id?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string
          student_id?: string
          student_record_id?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_grades_student_record_id_fkey"
            columns: ["student_record_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignment_categories_id: string | null
          assignment_type: string
          classroom_session_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          due_reminder_sent_at: string | null
          id: string
          overdue_notification_sent_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_categories_id?: string | null
          assignment_type: string
          classroom_session_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_reminder_sent_at?: string | null
          id?: string
          overdue_notification_sent_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_categories_id?: string | null
          assignment_type?: string
          classroom_session_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_reminder_sent_at?: string | null
          id?: string
          overdue_notification_sent_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assignment_categories_id_fkey"
            columns: ["assignment_categories_id"]
            isOneToOne: false
            referencedRelation: "assignment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_classroom_session_id_fkey"
            columns: ["classroom_session_id"]
            isOneToOne: false
            referencedRelation: "classroom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          classroom_session_id: string
          created_at: string | null
          id: string
          note: string | null
          status: string
          student_id: string
          student_record_id: string | null
          updated_at: string | null
        }
        Insert: {
          classroom_session_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          status: string
          student_id: string
          student_record_id?: string | null
          updated_at?: string | null
        }
        Update: {
          classroom_session_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          status?: string
          student_id?: string
          student_record_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_classroom_session_id_fkey"
            columns: ["classroom_session_id"]
            isOneToOne: false
            referencedRelation: "classroom_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_record_id_fkey"
            columns: ["student_record_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_assignments: {
        Row: {
          camp_program_id: string
          classroom_id: string
          classroom_session_id: string | null
          presented_at: string | null
          created_at: string
          deleted_at: string | null
          domain: string | null
          due_at: string | null
          id: string
          item_ids: Json
          kind: string | null
          question_count: number
          section: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          camp_program_id: string
          classroom_id: string
          classroom_session_id?: string | null
          presented_at?: string | null
          created_at?: string
          deleted_at?: string | null
          domain?: string | null
          due_at?: string | null
          id?: string
          item_ids: Json
          kind?: string | null
          question_count: number
          section?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          camp_program_id?: string
          classroom_id?: string
          classroom_session_id?: string | null
          presented_at?: string | null
          created_at?: string
          deleted_at?: string | null
          domain?: string | null
          due_at?: string | null
          id?: string
          item_ids?: Json
          kind?: string | null
          question_count?: number
          section?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_assignments_camp_program_id_fkey"
            columns: ["camp_program_id"]
            isOneToOne: false
            referencedRelation: "camp_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_assignments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_programs: {
        Row: {
          academy_id: string
          created_at: string
          deleted_at: string | null
          ends_on: string | null
          id: string
          name: string
          question_quota: number
          questions_used: number
          starts_on: string | null
          student_cap: number
          test_family: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          deleted_at?: string | null
          ends_on?: string | null
          id?: string
          name: string
          question_quota?: number
          questions_used?: number
          starts_on?: string | null
          student_cap?: number
          test_family: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          deleted_at?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          question_quota?: number
          questions_used?: number
          starts_on?: string | null
          student_cap?: number
          test_family?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_programs_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_programs_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "camp_programs_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_reports: {
        Row: {
          camp_program_id: string
          classroom_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          payload: Json
          period_end: string | null
          period_start: string | null
          student_id: string
        }
        Insert: {
          camp_program_id: string
          classroom_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          payload: Json
          period_end?: string | null
          period_start?: string | null
          student_id: string
        }
        Update: {
          camp_program_id?: string
          classroom_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          payload?: Json
          period_end?: string | null
          period_start?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_reports_camp_program_id_fkey"
            columns: ["camp_program_id"]
            isOneToOne: false
            referencedRelation: "camp_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_reports_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          academy_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "chat_conversations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          read_at: string | null
          sender_id: string
          sender_type: string
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          read_at?: string | null
          sender_id: string
          sender_type?: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_schedules: {
        Row: {
          classroom_id: string
          created_at: string | null
          day: string
          deleted_at: string | null
          effective_from: string | null
          effective_until: string | null
          end_time: string
          id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          day: string
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          end_time: string
          id?: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          day?: string
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_schedules_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_sessions: {
        Row: {
          classroom_id: string
          created_at: string | null
          date: string
          deleted_at: string | null
          end_time: string
          id: string
          location: string
          notes: string | null
          reminder_sent_at: string | null
          room_number: string | null
          start_time: string
          status: string
          substitute_teacher: string | null
          updated_at: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          date: string
          deleted_at?: string | null
          end_time: string
          id?: string
          location: string
          notes?: string | null
          reminder_sent_at?: string | null
          room_number?: string | null
          start_time: string
          status: string
          substitute_teacher?: string | null
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          end_time?: string
          id?: string
          location?: string
          notes?: string | null
          reminder_sent_at?: string | null
          room_number?: string | null
          start_time?: string
          status?: string
          substitute_teacher?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_sessions_substitute_teacher_fkey"
            columns: ["substitute_teacher"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_students: {
        Row: {
          classroom_id: string
          created_at: string | null
          id: string
          student_id: string
          student_record_id: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          id?: string
          student_id: string
          student_record_id?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          id?: string
          student_id?: string
          student_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_students_student_record_id_fkey"
            columns: ["student_record_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          academy_id: string
          camp_program_id: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          grade: string | null
          id: string
          name: string
          notes: string | null
          paused: boolean | null
          subject: string | null
          subject_id: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          camp_program_id?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          grade?: string | null
          id?: string
          name: string
          notes?: string | null
          paused?: boolean | null
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          camp_program_id?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          grade?: string | null
          id?: string
          name?: string
          notes?: string | null
          paused?: boolean | null
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "classrooms_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_camp_program_id_fkey"
            columns: ["camp_program_id"]
            isOneToOne: false
            referencedRelation: "camp_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          report_type: string
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          report_type: string
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          report_type?: string
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "assignment_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_name: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          id: string
          level: string
          message: string
          request_id: string | null
          service_name: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          level: string
          message: string
          request_id?: string | null
          service_name: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          level?: string
          message?: string
          request_id?: string | null
          service_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      families: {
        Row: {
          academy_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "families_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string | null
          email: string | null
          family_id: string
          id: string
          phone: string | null
          relation: string | null
          role: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          family_id: string
          id?: string
          phone?: string | null
          relation?: string | null
          role: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          family_id?: string
          id?: string
          phone?: string | null
          relation?: string | null
          role?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lang: string
          slug: string
          user_id: string | null
          vote: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lang: string
          slug: string
          user_id?: string | null
          vote: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lang?: string
          slug?: string
          user_id?: string | null
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_views: {
        Row: {
          id: string
          lang: string
          slug: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          lang: string
          slug: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          lang?: string
          slug?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          academy_id: string
          amount: number
          created_at: string
          deleted_at: string | null
          discount_amount: number | null
          discount_reason: string | null
          due_date: string
          due_reminder_sent_at: string | null
          final_amount: number
          id: string
          invoice_name: string
          notes: string | null
          overdue_notification_sent_at: string | null
          paid_at: string | null
          payment_method: string | null
          portone_order_id: string | null
          refunded_amount: number | null
          settlement_id: string | null
          status: string
          student_id: string | null
          student_record_id: string | null
          template_id: string | null
          transaction_id: string | null
        }
        Insert: {
          academy_id: string
          amount: number
          created_at?: string
          deleted_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date: string
          due_reminder_sent_at?: string | null
          final_amount: number
          id?: string
          invoice_name: string
          notes?: string | null
          overdue_notification_sent_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          portone_order_id?: string | null
          refunded_amount?: number | null
          settlement_id?: string | null
          status: string
          student_id?: string | null
          student_record_id?: string | null
          template_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          academy_id?: string
          amount?: number
          created_at?: string
          deleted_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string
          due_reminder_sent_at?: string | null
          final_amount?: number
          id?: string
          invoice_name?: string
          notes?: string | null
          overdue_notification_sent_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          portone_order_id?: string | null
          refunded_amount?: number | null
          settlement_id?: string | null
          status?: string
          student_id?: string | null
          student_record_id?: string | null
          template_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_record_id_fkey"
            columns: ["student_record_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recurring_payment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_heartbeats: {
        Row: {
          detail: Json | null
          duration_ms: number | null
          fail_streak: number
          job: string
          last_ok_at: string | null
          last_run_at: string
          ok: boolean
        }
        Insert: {
          detail?: Json | null
          duration_ms?: number | null
          fail_streak?: number
          job: string
          last_ok_at?: string | null
          last_run_at?: string
          ok?: boolean
        }
        Update: {
          detail?: Json | null
          duration_ms?: number | null
          fail_streak?: number
          job?: string
          last_ok_at?: string | null
          last_run_at?: string
          ok?: boolean
        }
        Relationships: []
      }
      level_test_answers: {
        Row: {
          answer: string | null
          attempt_id: string
          graded_at: string | null
          id: string
          is_correct: boolean | null
          manual_score: number | null
          question_id: string
        }
        Insert: {
          answer?: string | null
          attempt_id: string
          graded_at?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id: string
        }
        Update: {
          answer?: string | null
          attempt_id?: string
          graded_at?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "level_test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "level_test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      level_test_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          due_date: string | null
          id: string
          notification_sent: boolean
          student_id: string
          test_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          due_date?: string | null
          id?: string
          notification_sent?: boolean
          student_id: string
          test_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          due_date?: string | null
          id?: string
          notification_sent?: boolean
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_test_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "level_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      level_test_attempts: {
        Row: {
          ai_analysis: string | null
          ai_analysis_generated_at: string | null
          id: string
          needs_manual_grading: boolean
          score: number | null
          share_token: string | null
          started_at: string
          status: string
          student_id: string | null
          submitted_at: string | null
          taker_email: string | null
          taker_name: string
          test_id: string
          total_questions: number
        }
        Insert: {
          ai_analysis?: string | null
          ai_analysis_generated_at?: string | null
          id?: string
          needs_manual_grading?: boolean
          score?: number | null
          share_token?: string | null
          started_at?: string
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          taker_email?: string | null
          taker_name: string
          test_id: string
          total_questions: number
        }
        Update: {
          ai_analysis?: string | null
          ai_analysis_generated_at?: string | null
          id?: string
          needs_manual_grading?: boolean
          score?: number | null
          share_token?: string | null
          started_at?: string
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          taker_email?: string | null
          taker_name?: string
          test_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "level_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      level_test_questions: {
        Row: {
          choices: Json | null
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          order_index: number
          question: string
          test_id: string
          type: string
        }
        Insert: {
          choices?: Json | null
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          order_index: number
          question: string
          test_id: string
          type: string
        }
        Update: {
          choices?: Json | null
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          order_index?: number
          question?: string
          test_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "level_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      level_tests: {
        Row: {
          academy_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          difficulty: string
          extra_comments: string | null
          grade: string | null
          id: string
          language: string
          mc_choice_count: number
          question_count: number
          question_types: string[]
          share_enabled: boolean
          share_token: string | null
          subject_id: string | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          difficulty: string
          extra_comments?: string | null
          grade?: string | null
          id?: string
          language?: string
          mc_choice_count?: number
          question_count: number
          question_types: string[]
          share_enabled?: boolean
          share_token?: string | null
          subject_id?: string | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          difficulty?: string
          extra_comments?: string | null
          grade?: string | null
          id?: string
          language?: string
          mc_choice_count?: number
          question_count?: number
          question_types?: string[]
          share_enabled?: boolean
          share_token?: string | null
          subject_id?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_tests_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_tests_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "level_tests_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          academy_id: string
          active: boolean | null
          created_at: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "managers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "managers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          message_key: string | null
          message_params: Json | null
          navigation_data: Json | null
          title: string
          title_key: string | null
          title_params: Json | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          message_key?: string | null
          message_params?: Json | null
          navigation_data?: Json | null
          title: string
          title_key?: string | null
          title_params?: Json | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_key?: string | null
          message_params?: Json | null
          navigation_data?: Json | null
          title?: string
          title_key?: string | null
          title_params?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          academy_id: string
          active: boolean | null
          created_at: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "parents_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cancelled_amount: number | null
          cancelled_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          paid_amount: number | null
          paid_at: string | null
          payment_id: string
          payment_method: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          cancelled_amount?: number | null
          cancelled_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_id: string
          payment_method?: string | null
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          cancelled_amount?: number | null
          cancelled_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string
          payment_method?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recurring_payment_template_students: {
        Row: {
          amount_override: number | null
          created_at: string
          id: string
          status: string | null
          student_id: string
          student_record_id: string | null
          template_id: string
        }
        Insert: {
          amount_override?: number | null
          created_at?: string
          id?: string
          status?: string | null
          student_id: string
          student_record_id?: string | null
          template_id: string
        }
        Update: {
          amount_override?: number | null
          created_at?: string
          id?: string
          status?: string | null
          student_id?: string
          student_record_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_template_students_student_record_id_fkey"
            columns: ["student_record_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payment_template_students_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recurring_payment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payment_templates: {
        Row: {
          academy_id: string
          amount: number
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          deleted_at: string | null
          end_date: string | null
          id: string
          interval_weeks: number | null
          is_active: boolean
          name: string
          next_due_date: string
          recurrence_type: string
          semester_months: number | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          amount: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          interval_weeks?: number | null
          is_active?: boolean
          name: string
          next_due_date: string
          recurrence_type: string
          semester_months?: number | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          amount?: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          interval_weeks?: number | null
          is_active?: boolean
          name?: string
          next_due_date?: string
          recurrence_type?: string
          semester_months?: number | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_templates_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payment_templates_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "recurring_payment_templates_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_breaks: {
        Row: {
          classroom_id: string
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_breaks_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          assignments_data: Json | null
          created_at: string | null
          deleted_at: string | null
          id: string
          include_assignments: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignments_data?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          include_assignments?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignments_data?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          include_assignments?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      storage_deletion_queue: {
        Row: {
          attempts: number
          bucket_id: string
          deleted_at: string | null
          enqueued_at: string
          id: number
          last_error: string | null
          storage_path: string
        }
        Insert: {
          attempts?: number
          bucket_id: string
          deleted_at?: string | null
          enqueued_at?: string
          id?: number
          last_error?: string | null
          storage_path: string
        }
        Update: {
          attempts?: number
          bucket_id?: string
          deleted_at?: string | null
          enqueued_at?: string
          id?: number
          last_error?: string | null
          storage_path?: string
        }
        Relationships: []
      }
      student_reports: {
        Row: {
          ai_feedback_created_at: string | null
          ai_feedback_created_by: string | null
          ai_feedback_enabled: boolean | null
          ai_feedback_template: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          feedback: string | null
          id: string
          report_name: string | null
          selected_assignment_categories: Json | null
          selected_classrooms: Json | null
          selected_subjects: Json | null
          show_category_average: boolean | null
          show_individual_grades: boolean | null
          show_percentile_ranking: boolean | null
          start_date: string | null
          status: Database["public"]["Enums"]["report_status"]
          student_id: string
          student_record_id: string | null
          updated_at: string
        }
        Insert: {
          ai_feedback_created_at?: string | null
          ai_feedback_created_by?: string | null
          ai_feedback_enabled?: boolean | null
          ai_feedback_template?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          feedback?: string | null
          id?: string
          report_name?: string | null
          selected_assignment_categories?: Json | null
          selected_classrooms?: Json | null
          selected_subjects?: Json | null
          show_category_average?: boolean | null
          show_individual_grades?: boolean | null
          show_percentile_ranking?: boolean | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id: string
          student_record_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_feedback_created_at?: string | null
          ai_feedback_created_by?: string | null
          ai_feedback_enabled?: boolean | null
          ai_feedback_template?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          feedback?: string | null
          id?: string
          report_name?: string | null
          selected_assignment_categories?: Json | null
          selected_classrooms?: Json | null
          selected_subjects?: Json | null
          show_category_average?: boolean | null
          show_individual_grades?: boolean | null
          show_percentile_ranking?: boolean | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id?: string
          student_record_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_student_record_id_fkey"
            columns: ["student_record_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academy_id: string
          active: boolean | null
          created_at: string | null
          id: string
          phone: string | null
          school_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id: string
          active?: boolean | null
          created_at?: string | null
          id?: string
          phone?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string
          active?: boolean | null
          created_at?: string | null
          id?: string
          phone?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          props: Json | null
          student_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          props?: Json | null
          student_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          props?: Json | null
          student_id?: string
        }
        Relationships: []
      }
      study_attempt_explanations: {
        Row: {
          attempt_id: string
          simpler: string | null
          simpler_lang: string | null
          steps: string | null
          steps_lang: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          simpler?: string | null
          simpler_lang?: string | null
          steps?: string | null
          steps_lang?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          simpler?: string | null
          simpler_lang?: string | null
          steps?: string | null
          steps_lang?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_attempt_explanations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "study_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      study_attempt_notes: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          note: string
          reviewed_at: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          note?: string
          reviewed_at?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          note?: string
          reviewed_at?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_attempt_notes_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "study_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      study_attempts: {
        Row: {
          ai_explanation: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          item_id: string | null
          position: number | null
          question: Json
          session_id: string
          student_answer: string | null
          time_spent_seconds: number | null
          topic_id: string | null
        }
        Insert: {
          ai_explanation?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id?: string | null
          position?: number | null
          question: Json
          session_id: string
          student_answer?: string | null
          time_spent_seconds?: number | null
          topic_id?: string | null
        }
        Update: {
          ai_explanation?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id?: string | null
          position?: number | null
          question?: Json
          session_id?: string
          student_answer?: string | null
          time_spent_seconds?: number | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_challenges: {
        Row: {
          challenger_id: string
          challenger_xp: number
          created_at: string
          end_at: string | null
          id: string
          opponent_id: string
          opponent_xp: number
          resolved_at: string | null
          responded_at: string | null
          start_at: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          challenger_xp?: number
          created_at?: string
          end_at?: string | null
          id?: string
          opponent_id: string
          opponent_xp?: number
          resolved_at?: string | null
          responded_at?: string | null
          start_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          challenger_xp?: number
          created_at?: string
          end_at?: string | null
          id?: string
          opponent_id?: string
          opponent_xp?: number
          resolved_at?: string | null
          responded_at?: string | null
          start_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      study_credit_ledger: {
        Row: {
          bucket: string
          created_at: string
          delta: number
          id: string
          kind: string
          note: string | null
          source_id: string | null
          student_id: string
        }
        Insert: {
          bucket: string
          created_at?: string
          delta: number
          id?: string
          kind: string
          note?: string | null
          source_id?: string | null
          student_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          delta?: number
          id?: string
          kind?: string
          note?: string | null
          source_id?: string | null
          student_id?: string
        }
        Relationships: []
      }
      study_energy: {
        Row: {
          energy: number
          student_id: string
          updated_at: string
        }
        Insert: {
          energy?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          energy?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          source: string
          student_id: string
          test: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          student_id: string
          test: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          student_id?: string
          test?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_entitlements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_flashcard_bank: {
        Row: {
          archived: boolean
          back: string
          cohort: string | null
          content_hash: string | null
          created_at: string
          difficulty: string
          domain: string | null
          family: string
          front: string
          hint: string | null
          id: string
          section: string
          verified: boolean
        }
        Insert: {
          archived?: boolean
          back: string
          cohort?: string | null
          content_hash?: string | null
          created_at?: string
          difficulty?: string
          domain?: string | null
          family?: string
          front: string
          hint?: string | null
          id?: string
          section: string
          verified?: boolean
        }
        Update: {
          archived?: boolean
          back?: string
          cohort?: string | null
          content_hash?: string | null
          created_at?: string
          difficulty?: string
          domain?: string | null
          family?: string
          front?: string
          hint?: string | null
          id?: string
          section?: string
          verified?: boolean
        }
        Relationships: []
      }
      study_flashcard_reviews: {
        Row: {
          card_back: string
          card_front: string
          created_at: string
          due_at: string
          ease_factor: number
          interval_days: number
          last_quality: number | null
          last_reviewed_at: string | null
          repetitions: number
          student_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          card_back: string
          card_front: string
          created_at?: string
          due_at?: string
          ease_factor?: number
          interval_days?: number
          last_quality?: number | null
          last_reviewed_at?: string | null
          repetitions?: number
          student_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          card_back?: string
          card_front?: string
          created_at?: string
          due_at?: string
          ease_factor?: number
          interval_days?: number
          last_quality?: number | null
          last_reviewed_at?: string | null
          repetitions?: number
          student_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_flashcard_reviews_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      study_gift_codes: {
        Row: {
          code: string
          created_at: string
          credits: number
          id: string
          months: number
          paid_amount_cents: number | null
          payment_id: string | null
          purchaser_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number
          id?: string
          months?: number
          paid_amount_cents?: number | null
          payment_id?: string | null
          purchaser_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          id?: string
          months?: number
          paid_amount_cents?: number | null
          payment_id?: string | null
          purchaser_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      study_item_attacks: {
        Row: {
          attacked_at: string
          correct: number
          id: string
          item_id: string
          item_sha: string | null
          run_id: string
          solvers: number
        }
        Insert: {
          attacked_at?: string
          correct: number
          id?: string
          item_id: string
          item_sha?: string | null
          run_id: string
          solvers: number
        }
        Update: {
          attacked_at?: string
          correct?: number
          id?: string
          item_id?: string
          item_sha?: string | null
          run_id?: string
          solvers?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_item_attacks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_item_attacks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_calibration"
            referencedColumns: ["item_id"]
          },
        ]
      }
      study_item_bank: {
        Row: {
          archived: boolean
          cohort: string | null
          content_hash: string | null
          content_sha: string | null
          created_at: string
          dedup_key: string | null
          difficulty: string
          domain: string
          family: string
          id: string
          item: Json
          item_type: string
          passage_group_id: string | null
          section: string
          source: string
          subskill: string | null
          task: string
          topic_tag: string | null
          updated_at: string
          verified: boolean
          verify_meta: Json | null
          word_count: number | null
        }
        Insert: {
          archived?: boolean
          cohort?: string | null
          content_hash?: string | null
          content_sha?: string | null
          created_at?: string
          dedup_key?: string | null
          difficulty?: string
          domain: string
          family?: string
          id?: string
          item: Json
          item_type?: string
          passage_group_id?: string | null
          section: string
          source?: string
          subskill?: string | null
          task: string
          topic_tag?: string | null
          updated_at?: string
          verified?: boolean
          verify_meta?: Json | null
          word_count?: number | null
        }
        Update: {
          archived?: boolean
          cohort?: string | null
          content_hash?: string | null
          content_sha?: string | null
          created_at?: string
          dedup_key?: string | null
          difficulty?: string
          domain?: string
          family?: string
          id?: string
          item?: Json
          item_type?: string
          passage_group_id?: string | null
          section?: string
          source?: string
          subskill?: string | null
          task?: string
          topic_tag?: string | null
          updated_at?: string
          verified?: boolean
          verify_meta?: Json | null
          word_count?: number | null
        }
        Relationships: []
      }
      study_item_exposures: {
        Row: {
          id: string
          item_id: string
          seen_at: string
          session_id: string | null
          source: string
          student_id: string
        }
        Insert: {
          id?: string
          item_id: string
          seen_at?: string
          session_id?: string | null
          source: string
          student_id: string
        }
        Update: {
          id?: string
          item_id?: string
          seen_at?: string
          session_id?: string | null
          source?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_item_exposures_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_item_exposures_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_calibration"
            referencedColumns: ["item_id"]
          },
        ]
      }
      study_item_reviews: {
        Row: {
          blind_at: string | null
          blind_pick: string | null
          id: string
          item_id: string
          item_sha: string | null
          key_slot: string
          note: string | null
          realism: string | null
          reviewed_at: string | null
          reviewer_id: string
          reviewer_kind: string
          run_id: string
          shown_order: Json
          verdict: string | null
        }
        Insert: {
          blind_at?: string | null
          blind_pick?: string | null
          id?: string
          item_id: string
          item_sha?: string | null
          key_slot: string
          note?: string | null
          realism?: string | null
          reviewed_at?: string | null
          reviewer_id: string
          reviewer_kind?: string
          run_id: string
          shown_order: Json
          verdict?: string | null
        }
        Update: {
          blind_at?: string | null
          blind_pick?: string | null
          id?: string
          item_id?: string
          item_sha?: string | null
          key_slot?: string
          note?: string | null
          realism?: string | null
          reviewed_at?: string | null
          reviewer_id?: string
          reviewer_kind?: string
          run_id?: string
          shown_order?: Json
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_item_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_item_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_calibration"
            referencedColumns: ["item_id"]
          },
        ]
      }
      study_league_memberships: {
        Row: {
          closed_at: string | null
          final_rank: number | null
          id: string
          joined_at: string
          league_id: string
          next_tier: string | null
          promotion_event: string | null
          student_id: string
          xp_this_week: number
        }
        Insert: {
          closed_at?: string | null
          final_rank?: number | null
          id?: string
          joined_at?: string
          league_id: string
          next_tier?: string | null
          promotion_event?: string | null
          student_id: string
          xp_this_week?: number
        }
        Update: {
          closed_at?: string | null
          final_rank?: number | null
          id?: string
          joined_at?: string
          league_id?: string
          next_tier?: string | null
          promotion_event?: string | null
          student_id?: string
          xp_this_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "study_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      study_league_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string
          credits: number
          id: string
          kind: string
          rank: number | null
          student_id: string
          tier: string | null
          week_start: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          credits?: number
          id?: string
          kind: string
          rank?: number | null
          student_id: string
          tier?: string | null
          week_start: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          credits?: number
          id?: string
          kind?: string
          rank?: number | null
          student_id?: string
          tier?: string | null
          week_start?: string
        }
        Relationships: []
      }
      study_leagues: {
        Row: {
          capacity: number
          created_at: string
          id: string
          tier: string
          week_start: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          tier: string
          week_start: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          tier?: string
          week_start?: string
        }
        Relationships: []
      }
      study_mastery: {
        Row: {
          attempts_count: number
          id: string
          last_assessed_at: string
          score: number
          strengths: Json
          student_id: string
          topic_id: string
          updated_at: string
          weaknesses: Json
        }
        Insert: {
          attempts_count?: number
          id?: string
          last_assessed_at?: string
          score?: number
          strengths?: Json
          student_id: string
          topic_id: string
          updated_at?: string
          weaknesses?: Json
        }
        Update: {
          attempts_count?: number
          id?: string
          last_assessed_at?: string
          score?: number
          strengths?: Json
          student_id?: string
          topic_id?: string
          updated_at?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "study_mastery_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model: string | null
          role: string
          session_id: string
          tokens_in: number
          tokens_out: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          session_id: string
          tokens_in?: number
          tokens_out?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          session_id?: string
          tokens_in?: number
          tokens_out?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_pass_credits: {
        Row: {
          created_at: string
          id: string
          remaining: number
          student_id: string
          test: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          remaining?: number
          student_id: string
          test: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          remaining?: number
          student_id?: string
          test?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_payment_refunds: {
        Row: {
          amount_won: number
          created_at: string
          created_by: string | null
          id: string
          payment_id: string
          reason: string | null
        }
        Insert: {
          amount_won: number
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id: string
          reason?: string | null
        }
        Update: {
          amount_won?: number
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_payment_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "study_payments"
            referencedColumns: ["payment_id"]
          },
        ]
      }
      study_payments: {
        Row: {
          amount_won: number
          created_at: string
          kind: string
          payment_id: string
          refund_reason: string | null
          refunded_at: string | null
          student_id: string
        }
        Insert: {
          amount_won: number
          created_at?: string
          kind: string
          payment_id: string
          refund_reason?: string | null
          refunded_at?: string | null
          student_id: string
        }
        Update: {
          amount_won?: number
          created_at?: string
          kind?: string
          payment_id?: string
          refund_reason?: string | null
          refunded_at?: string | null
          student_id?: string
        }
        Relationships: []
      }
      study_quest_claims: {
        Row: {
          claimed_at: string
          id: string
          quest_key: string
          reward_xp: number
          student_id: string
          week_start: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          quest_key: string
          reward_xp?: number
          student_id: string
          week_start: string
        }
        Update: {
          claimed_at?: string
          id?: string
          quest_key?: string
          reward_xp?: number
          student_id?: string
          week_start?: string
        }
        Relationships: []
      }
      study_nickname_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reported_nickname: string
          reported_student_id: string
          reporter_student_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_nickname: string
          reported_student_id: string
          reporter_student_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_nickname?: string
          reported_student_id?: string
          reporter_student_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_nickname_reports_reported_student_id_fkey"
            columns: ["reported_student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_nickname_reports_reporter_student_id_fkey"
            columns: ["reporter_student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_nickname_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_question_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          question_hash: string
          question_snapshot: Json
          reason: string
          resolved_at: string | null
          session_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          question_hash: string
          question_snapshot: Json
          reason: string
          resolved_at?: string | null
          session_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          question_hash?: string
          question_snapshot?: Json
          reason?: string
          resolved_at?: string | null
          session_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_question_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_question_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_referral_codes: {
        Row: {
          code: string
          created_at: string
          student_id: string
        }
        Insert: {
          code: string
          created_at?: string
          student_id: string
        }
        Update: {
          code?: string
          created_at?: string
          student_id?: string
        }
        Relationships: []
      }
      study_referral_redemptions: {
        Row: {
          code: string
          converted: boolean
          converted_at: string | null
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
          rewarded: boolean
        }
        Insert: {
          code: string
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
          rewarded?: boolean
        }
        Update: {
          code?: string
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
          rewarded?: boolean
        }
        Relationships: []
      }
      study_response_audio: {
        Row: {
          bytes: number | null
          created_at: string
          id: string
          mime_type: string | null
          position: number | null
          session_id: string
          storage_path: string
          student_id: string
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          id?: string
          mime_type?: string | null
          position?: number | null
          session_id: string
          storage_path: string
          student_id: string
        }
        Update: {
          bytes?: number | null
          created_at?: string
          id?: string
          mime_type?: string | null
          position?: number | null
          session_id?: string
          storage_path?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_response_audio_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_response_grades: {
        Row: {
          annotations: Json
          created_at: string
          grader_model: string
          id: string
          model_rewrite: string | null
          overall_band: number
          rubric_scores: Json
          student_id: string
          submission_id: string
          summary: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          annotations?: Json
          created_at?: string
          grader_model: string
          id?: string
          model_rewrite?: string | null
          overall_band: number
          rubric_scores: Json
          student_id: string
          submission_id: string
          summary?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          annotations?: Json
          created_at?: string
          grader_model?: string
          id?: string
          model_rewrite?: string | null
          overall_band?: number
          rubric_scores?: Json
          student_id?: string
          submission_id?: string
          summary?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_response_grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "study_response_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_response_submissions: {
        Row: {
          audio_path: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          language: string
          prompt_text: string
          response_text: string
          session_id: string
          skill: string
          student_id: string
          test_family: string
          word_count: number | null
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          language?: string
          prompt_text: string
          response_text: string
          session_id: string
          skill: string
          student_id: string
          test_family: string
          word_count?: number | null
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          language?: string
          prompt_text?: string
          response_text?: string
          session_id?: string
          skill?: string
          student_id?: string
          test_family?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_response_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          archived: boolean
          completed_at: string | null
          config: Json
          correct_count: number | null
          created_at: string
          ended_reason: string | null
          generation_status: string | null
          id: string
          language: string
          last_active_at: string
          mode: string
          module1_correct: number | null
          module1_total: number | null
          module2_claimed_at: string | null
          module2_route: string | null
          score: number | null
          speaking_grade_mode: string | null
          status: string
          student_id: string
          title: string | null
          topic_freeform: string | null
          topic_id: string | null
          total_count: number | null
        }
        Insert: {
          archived?: boolean
          completed_at?: string | null
          config?: Json
          correct_count?: number | null
          created_at?: string
          ended_reason?: string | null
          generation_status?: string | null
          id?: string
          language?: string
          last_active_at?: string
          mode: string
          module1_correct?: number | null
          module1_total?: number | null
          module2_claimed_at?: string | null
          module2_route?: string | null
          score?: number | null
          speaking_grade_mode?: string | null
          status?: string
          student_id: string
          title?: string | null
          topic_freeform?: string | null
          topic_id?: string | null
          total_count?: number | null
        }
        Update: {
          archived?: boolean
          completed_at?: string | null
          config?: Json
          correct_count?: number | null
          created_at?: string
          ended_reason?: string | null
          generation_status?: string | null
          id?: string
          language?: string
          last_active_at?: string
          mode?: string
          module1_correct?: number | null
          module1_total?: number | null
          module2_claimed_at?: string | null
          module2_route?: string | null
          score?: number | null
          speaking_grade_mode?: string | null
          status?: string
          student_id?: string
          title?: string | null
          topic_freeform?: string | null
          topic_id?: string | null
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_snap_captures: {
        Row: {
          bookmarked_at: string | null
          created_at: string
          final_answer: string | null
          id: string
          image_path: string
          language: string
          model: string
          ocr_text: string | null
          solution_steps: Json
          student_id: string
          subject_guess: string | null
          tokens_in: number | null
          tokens_out: number | null
          topic_id: string | null
        }
        Insert: {
          bookmarked_at?: string | null
          created_at?: string
          final_answer?: string | null
          id?: string
          image_path: string
          language?: string
          model?: string
          ocr_text?: string | null
          solution_steps?: Json
          student_id: string
          subject_guess?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          topic_id?: string | null
        }
        Update: {
          bookmarked_at?: string | null
          created_at?: string
          final_answer?: string | null
          id?: string
          image_path?: string
          language?: string
          model?: string
          ocr_text?: string | null
          solution_steps?: Json
          student_id?: string
          subject_guess?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_snap_captures_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streak_state: {
        Row: {
          freezes: number
          last_milestone_awarded: number
          last_saved_notified_on: string | null
          max_streak: number
          protected_days: string[]
          student_id: string
          updated_at: string
        }
        Insert: {
          freezes?: number
          last_milestone_awarded?: number
          last_saved_notified_on?: string | null
          max_streak?: number
          protected_days?: string[]
          student_id: string
          updated_at?: string
        }
        Update: {
          freezes?: number
          last_milestone_awarded?: number
          last_saved_notified_on?: string | null
          max_streak?: number
          protected_days?: string[]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          grant_credits_remaining: number
          id: string
          last_payment_attempt_at: string | null
          last_payment_failure: string | null
          last_payment_id: string | null
          next_grant_at: string | null
          pending_plan: string | null
          plan: string
          portone_subscription_id: string | null
          price_cents: number
          purchased_credits_remaining: number
          status: string
          student_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          grant_credits_remaining?: number
          id?: string
          last_payment_attempt_at?: string | null
          last_payment_failure?: string | null
          last_payment_id?: string | null
          next_grant_at?: string | null
          pending_plan?: string | null
          plan?: string
          portone_subscription_id?: string | null
          price_cents?: number
          purchased_credits_remaining?: number
          status: string
          student_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          grant_credits_remaining?: number
          id?: string
          last_payment_attempt_at?: string | null
          last_payment_failure?: string | null
          last_payment_id?: string | null
          next_grant_at?: string | null
          pending_plan?: string | null
          plan?: string
          portone_subscription_id?: string | null
          price_cents?: number
          purchased_credits_remaining?: number
          status?: string
          student_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_test_specs: {
        Row: {
          created_at: string
          family: string
          last_attempted_at: string | null
          last_verified_at: string | null
          section_key: string
          sources: string[]
          spec: Json
          updated_at: string
          verifier_notes: string | null
        }
        Insert: {
          created_at?: string
          family: string
          last_attempted_at?: string | null
          last_verified_at?: string | null
          section_key: string
          sources?: string[]
          spec: Json
          updated_at?: string
          verifier_notes?: string | null
        }
        Update: {
          created_at?: string
          family?: string
          last_attempted_at?: string | null
          last_verified_at?: string | null
          section_key?: string
          sources?: string[]
          spec?: Json
          updated_at?: string
          verifier_notes?: string | null
        }
        Relationships: []
      }
      study_topics: {
        Row: {
          category: string
          created_at: string
          description_en: string | null
          description_ko: string | null
          grade_max: number | null
          grade_min: number | null
          id: string
          level: number
          name_en: string
          name_ko: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          description_en?: string | null
          description_ko?: string | null
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          level: number
          name_en: string
          name_ko: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description_en?: string | null
          description_ko?: string | null
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          level?: number
          name_en?: string
          name_ko?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_user_prefs: {
        Row: {
          avatar_config: Json | null
          avatar_id: string | null
          created_at: string
          daily_goal_minutes: number | null
          default_difficulty: string | null
          default_language: string | null
          goal_score: number | null
          goal_scores: Json
          grade_level: string | null
          is_test_user: boolean
          nav_tour_seen_at: string | null
          nickname: string | null
          nickname_changed: boolean
          onboarded_at: string | null
          student_id: string
          target_test: string | null
          target_tests: string[]
          test_date: string | null
          updated_at: string
        }
        Insert: {
          avatar_config?: Json | null
          avatar_id?: string | null
          created_at?: string
          daily_goal_minutes?: number | null
          default_difficulty?: string | null
          default_language?: string | null
          goal_score?: number | null
          goal_scores?: Json
          grade_level?: string | null
          is_test_user?: boolean
          nav_tour_seen_at?: string | null
          nickname?: string | null
          nickname_changed?: boolean
          onboarded_at?: string | null
          student_id: string
          target_test?: string | null
          target_tests?: string[]
          test_date?: string | null
          updated_at?: string
        }
        Update: {
          avatar_config?: Json | null
          avatar_id?: string | null
          created_at?: string
          daily_goal_minutes?: number | null
          default_difficulty?: string | null
          default_language?: string | null
          goal_score?: number | null
          goal_scores?: Json
          grade_level?: string | null
          is_test_user?: boolean
          nav_tour_seen_at?: string | null
          nickname?: string | null
          nickname_changed?: boolean
          onboarded_at?: string | null
          student_id?: string
          target_test?: string | null
          target_tests?: string[]
          test_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          source_id: string | null
          student_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          source_id?: string | null
          student_id: string
          xp: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          source_id?: string | null
          student_id?: string
          xp?: number
        }
        Relationships: []
      }
      subjects: {
        Row: {
          academy_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "subjects_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          academy_id: string | null
          amount: number
          billing_cycle: string
          billing_period_end: string
          billing_period_start: string
          created_at: string | null
          currency: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          kg_auth_date: string | null
          kg_order_id: string | null
          kg_payment_key: string | null
          kg_receipt_url: string | null
          kg_transaction_id: string | null
          metadata: Json | null
          paid_at: string | null
          plan_tier: string
          status: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id?: string | null
          amount: number
          billing_cycle: string
          billing_period_end: string
          billing_period_start: string
          created_at?: string | null
          currency?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          kg_auth_date?: string | null
          kg_order_id?: string | null
          kg_payment_key?: string | null
          kg_receipt_url?: string | null
          kg_transaction_id?: string | null
          metadata?: Json | null
          paid_at?: string | null
          plan_tier: string
          status: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string | null
          amount?: number
          billing_cycle?: string
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string | null
          currency?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          kg_auth_date?: string | null
          kg_order_id?: string | null
          kg_payment_key?: string | null
          kg_receipt_url?: string | null
          kg_transaction_id?: string | null
          metadata?: Json | null
          paid_at?: string | null
          plan_tier?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "subscription_invoices_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "academy_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          academy_id: string
          api_calls_month: number | null
          calculated_at: string | null
          current_classroom_count: number
          current_storage_gb: number
          current_student_count: number
          current_teacher_count: number
          emails_sent_month: number | null
          id: string
          peak_student_count: number | null
          peak_teacher_count: number | null
          sms_sent_month: number | null
        }
        Insert: {
          academy_id: string
          api_calls_month?: number | null
          calculated_at?: string | null
          current_classroom_count?: number
          current_storage_gb?: number
          current_student_count?: number
          current_teacher_count?: number
          emails_sent_month?: number | null
          id?: string
          peak_student_count?: number | null
          peak_teacher_count?: number | null
          sms_sent_month?: number | null
        }
        Update: {
          academy_id?: string
          api_calls_month?: number | null
          calculated_at?: string | null
          current_classroom_count?: number
          current_storage_gb?: number
          current_student_count?: number
          current_teacher_count?: number
          emails_sent_month?: number | null
          id?: string
          peak_student_count?: number | null
          peak_teacher_count?: number | null
          sms_sent_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "subscription_usage_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: true
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_internal: boolean | null
          message: string
          message_type: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          message_type?: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          message_type?: string | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          academy_id: string | null
          assigned_admin_id: string | null
          category: string
          closed_at: string | null
          created_at: string | null
          description: string
          id: string
          internal_notes: string | null
          metadata: Json | null
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id?: string | null
          assigned_admin_id?: string | null
          category: string
          closed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string | null
          assigned_admin_id?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "support_tickets_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          priority: number | null
          scheduled_for: string | null
          target_academy_ids: string[] | null
          target_audience: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          priority?: number | null
          scheduled_for?: string | null
          target_academy_ids?: string[] | null
          target_audience?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          priority?: number | null
          scheduled_for?: string | null
          target_academy_ids?: string[] | null
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          academy_id: string
          active: boolean | null
          created_at: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "teachers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_conversations: {
        Row: {
          academy_id: string
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_group: boolean
          name: string | null
          participant_1_id: string | null
          participant_2_id: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          participant_1_id?: string | null
          participant_2_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          participant_1_id?: string | null
          participant_2_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_conversations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["academy_id"]
          },
          {
            foreignKeyName: "user_conversations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "admin_academy_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          sender_id: string
          system_meta: Json | null
          system_type: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          sender_id: string
          system_meta?: Json | null
          system_type?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          sender_id?: string
          system_meta?: Json | null
          system_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_logout_minutes: number | null
          created_at: string | null
          dashboard_layout: Json | null
          dashboard_widgets: Json | null
          date_format: string | null
          default_view: string | null
          display_density: string | null
          email_notifications: Json | null
          language: string | null
          login_notifications: boolean | null
          push_categories: Json
          push_notifications: boolean | null
          theme: string | null
          timezone: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_logout_minutes?: number | null
          created_at?: string | null
          dashboard_layout?: Json | null
          dashboard_widgets?: Json | null
          date_format?: string | null
          default_view?: string | null
          display_density?: string | null
          email_notifications?: Json | null
          language?: string | null
          login_notifications?: boolean | null
          push_categories?: Json
          push_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_logout_minutes?: number | null
          created_at?: string | null
          dashboard_layout?: Json | null
          dashboard_widgets?: Json | null
          date_format?: string | null
          default_view?: string | null
          display_density?: string | null
          email_notifications?: Json | null
          language?: string | null
          login_notifications?: boolean | null
          push_categories?: Json
          push_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          deletion_scheduled_at: string | null
          email: string
          family_name: string | null
          given_name: string | null
          id: string
          is_internal: boolean
          name: string
          name_confirmed_at: string | null
          name_prompt_snoozed_until: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deletion_scheduled_at?: string | null
          email: string
          family_name?: string | null
          given_name?: string | null
          id?: string
          is_internal?: boolean
          name: string
          name_confirmed_at?: string | null
          name_prompt_snoozed_until?: string | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deletion_scheduled_at?: string | null
          email?: string
          family_name?: string | null
          given_name?: string | null
          id?: string
          is_internal?: boolean
          name?: string
          name_confirmed_at?: string | null
          name_prompt_snoozed_until?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          entity_id: string
          error_message: string | null
          event_type: string
          id: string
          partner_id: string | null
          processed: boolean | null
          raw_data: Json
          received_at: string
          status: string
          timestamp: string
          type: string
          webhook_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          entity_id: string
          error_message?: string | null
          event_type: string
          id?: string
          partner_id?: string | null
          processed?: boolean | null
          raw_data: Json
          received_at?: string
          status: string
          timestamp: string
          type: string
          webhook_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          entity_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          partner_id?: string | null
          processed?: boolean | null
          raw_data?: Json
          received_at?: string
          status?: string
          timestamp?: string
          type?: string
          webhook_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_academy_usage: {
        Row: {
          academy_id: string | null
          academy_name: string | null
          calculated_at: string | null
          current_classroom_count: number | null
          current_storage_gb: number | null
          current_student_count: number | null
          current_teacher_count: number | null
          id: string | null
          peak_student_count: number | null
          peak_teacher_count: number | null
          subscription_tier: string | null
        }
        Relationships: []
      }
      study_item_attack_coverage: {
        Row: {
          attacked: number | null
          blind_score_pct: number | null
          domain: string | null
          every_solver_got_it: number | null
          family: string | null
          items: number | null
          unmeasured: number | null
        }
        Relationships: []
      }
      study_item_attacks_fresh: {
        Row: {
          attacked_at: string | null
          correct: number | null
          id: string | null
          item_id: string | null
          item_sha: string | null
          run_id: string | null
          solvers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_item_attacks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_item_attacks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_calibration"
            referencedColumns: ["item_id"]
          },
        ]
      }
      study_item_calibration: {
        Row: {
          attempts: number | null
          cohort: string | null
          correct: number | null
          family: string | null
          item_id: string | null
          item_type: string | null
          labelled_cefr: string | null
          labelled_difficulty: string | null
          listening_task: string | null
          measured_difficulty: string | null
          p_value: number | null
          reading_task: string | null
          section: string | null
        }
        Relationships: []
      }
      study_item_review_results: {
        Row: {
          blind_answered: number | null
          blind_cant_tell: number | null
          blind_correct: number | null
          control_best_slot: number | null
          domain: string | null
          drawn: number | null
          reads_artificial: number | null
          reviewed: number | null
          reviewer_id: string | null
          run_id: string | null
          verdict_alternative: number | null
          verdict_broken: number | null
          verdict_unique: number | null
        }
        Relationships: []
      }
      study_item_reviews_fresh: {
        Row: {
          blind_at: string | null
          blind_pick: string | null
          id: string | null
          item_id: string | null
          item_sha: string | null
          key_slot: string | null
          note: string | null
          realism: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_kind: string | null
          run_id: string | null
          shown_order: Json | null
          verdict: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_item_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_item_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "study_item_calibration"
            referencedColumns: ["item_id"]
          },
        ]
      }
    }
    Functions: {
      admin_academy_subscription_status_counts: {
        Args: never
        Returns: {
          cnt: number
          status: string
        }[]
      }
      admin_comment_report_stats: {
        Args: { p_end?: string; p_report_type?: string; p_start?: string }
        Returns: {
          abuse: number
          other: number
          spam: number
          total: number
        }[]
      }
      admin_error_log_services: {
        Args: never
        Returns: {
          service_name: string
        }[]
      }
      admin_insert_study_refund: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_payment_id: string
          p_reason: string
        }
        Returns: {
          refund_id: string
          remaining_after: number
        }[]
      }
      admin_invoice_revenue_by_cycle: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount_won: number
          billing_cycle: string
        }[]
      }
      admin_invoice_revenue_by_month: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount_won: number
          month_index: number
          year: number
        }[]
      }
      admin_invoice_revenue_by_plan: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount_won: number
          plan_tier: string
        }[]
      }
      admin_invoice_revenue_totals: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount_won: number
          invoice_count: number
        }[]
      }
      admin_study_event_counts: {
        Args: { p_end: string; p_start: string }
        Returns: {
          cnt: number
          event: string
        }[]
      }
      admin_study_last_activity: {
        Args: never
        Returns: {
          last_active: string
          student_id: string
        }[]
      }
      admin_study_payment_totals: {
        Args: { p_kind?: string; p_pay_status?: string; p_student_ids?: string[] }
        Returns: {
          net_won: number
          total_count: number
        }[]
      }
      admin_study_report_status_counts: {
        Args: never
        Returns: {
          cnt: number
          status: string
        }[]
      }
      admin_study_session_stats: {
        Args: { p_end: string; p_start: string }
        Returns: {
          avg_duration_minutes: number
          completed_count: number
          session_count: number
        }[]
      }
      admin_study_subscription_status_counts: {
        Args: never
        Returns: {
          cnt: number
          status: string
        }[]
      }
      admin_subscription_metrics: {
        Args: never
        Returns: {
          active_count: number
          annual_mrr_won: number
          canceled_30d: number
          canceled_count: number
          monthly_mrr_won: number
          mrr_won: number
          new_30d: number
          total_count: number
          trialing_count: number
        }[]
      }
      admin_subscription_usage_approaching_limits: {
        Args: { p_threshold?: number }
        Returns: {
          academy_id: string
          academy_name: string
          storage_usage: number
          student_usage: number
          teacher_usage: number
        }[]
      }
      admin_subscription_usage_totals: {
        Args: never
        Returns: {
          academies: number
          classrooms: number
          storage_gb: number
          students: number
          teachers: number
        }[]
      }
      admin_webhook_event_stats: {
        Args: {
          p_end?: string
          p_event_type?: string
          p_processed?: boolean
          p_start?: string
          p_status?: string
          p_type?: string
        }
        Returns: {
          errors: number
          processed: number
          total: number
          unprocessed: number
        }[]
      }
      admin_webhook_event_types: {
        Args: never
        Returns: {
          event_type: string
        }[]
      }
      award_study_xp: {
        Args: {
          p_event_type: string
          p_source_id?: string
          p_student_id: string
          p_xp: number
        }
        Returns: string
      }
      can_access_assignment_grade: {
        Args: { assignment_id_param: string; user_id_param: string }
        Returns: boolean
      }
      close_study_league_week: {
        Args: { p_week_start: string }
        Returns: number
      }
      complete_user_registration: {
        Args: { p_academy_id: string; p_phone?: string; p_school_name?: string }
        Returns: Json
      }
      count_classrooms_by_student: {
        Args: { student_ids: string[] }
        Returns: {
          classroom_count: number
          student_id: string
        }[]
      }
      count_classrooms_by_teacher: {
        Args: { academy_id_param: string; teacher_ids: string[] }
        Returns: {
          classroom_count: number
          teacher_id: string
        }[]
      }
      create_user_profile: {
        Args: {
          p_academy_id: string
          p_email: string
          p_name: string
          p_phone?: string
          p_role: string
          p_school_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      delete_academy_cascade: { Args: { p_academy_id: string }; Returns: Json }
      delete_user_account: { Args: { user_id: string }; Returns: Json }
      delete_user_account_cascade: {
        Args: { p_skip_schedule_check?: boolean; p_user_id: string }
        Returns: Json
      }
      generate_ticket_number: { Args: never; Returns: string }
      get_academy_dashboard_stats: {
        Args: { academy_id_param: string }
        Returns: {
          classroom_count: number
          completed_sessions: number
          period_type: string
          total_revenue: number
          total_users: number
        }[]
      }
      get_academy_session_stats: {
        Args: {
          academy_id_param: string
          today: string
          week_end: string
          week_start: string
        }
        Returns: Json
      }
      get_academy_storage_usage: {
        Args: { p_academy_id: string }
        Returns: number
      }
      get_academy_trend_data: {
        Args: { academy_id_param: string; days_back?: number }
        Returns: Json
      }
      get_assignment_attachments: {
        Args: { assignment_uuids: string[] }
        Returns: {
          assignment_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          updated_at: string
          uploaded_by: string
        }[]
      }
      get_assignment_comments: {
        Args: { assignment_uuids: string[] }
        Returns: {
          assignment_id: string
          created_at: string
          id: string
          text: string
          updated_at: string
          user_id: string
          user_name: string
        }[]
      }
      get_assignment_grade_counts_for_academy: {
        Args: { p_academy_id: string }
        Returns: {
          assignment_id: string
          pending_count: number
          submitted_count: number
          total_count: number
        }[]
      }
      get_assignment_grades_for_academy: {
        Args: { p_academy_id: string }
        Returns: {
          assignment_id: string
          status: string
        }[]
      }
      get_assignments_for_sessions:
        | {
            Args: { session_uuids: string[] }
            Returns: {
              assignment_categories_id: string
              assignment_type: string
              category_name: string
              classroom_session_id: string
              description: string
              due_date: string
              id: string
              title: string
            }[]
          }
        | {
            Args: {
              min_due_date: string
              session_uuids: string[]
              student_uuid: string
            }
            Returns: {
              assignment_id: string
              classroom_session_id: string
              due_date: string
              grade_status: string
            }[]
          }
      get_attendance_counts_for_academy: {
        Args: { p_academy_id: string }
        Returns: {
          absent_count: number
          classroom_session_id: string
          excused_count: number
          late_count: number
          pending_count: number
          present_count: number
          total_count: number
        }[]
      }
      get_attendance_for_academy: {
        Args: { p_academy_id: string }
        Returns: {
          classroom_session_id: string
          status: string
        }[]
      }
      get_classroom_sessions: {
        Args: { classroom_uuids: string[] }
        Returns: {
          classroom_id: string
          classrooms: Json
          date: string
          end_time: string
          id: string
          location: string
          start_time: string
          status: string
        }[]
      }
      get_classroom_student_count: {
        Args: { classroom_uuid: string }
        Returns: number
      }
      get_family_members_for_user: {
        Args: { user_uuid: string }
        Returns: {
          family_id: string
          role: string
          user_id: string
        }[]
      }
      get_level_test_academy_id: {
        Args: { p_test_id: string }
        Returns: string
      }
      get_manager_academy_ids: {
        Args: { manager_user_id: string }
        Returns: string[]
      }
      get_parent_academy_ids: {
        Args: { parent_user_id: string }
        Returns: string[]
      }
      get_priority_grades_for_student: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
          p_student_id: string
        }
        Returns: Json
      }
      get_student_academy_ids: {
        Args: { student_user_id: string }
        Returns: string[]
      }
      get_student_assignment_grades: {
        Args: {
          end_date: string
          start_date: string
          target_student_id: string
        }
        Returns: {
          assignment_data: Json
          id: string
          score: number
          status: string
          submitted_date: string
          updated_at: string
        }[]
      }
      get_student_assignments: {
        Args: { min_due_date?: string; student_id: string }
        Returns: {
          classroom_session_id: string
          due_date: string
          id: string
        }[]
      }
      get_student_attendance: {
        Args: {
          end_date: string
          start_date: string
          target_student_id: string
        }
        Returns: {
          classroom_id: string
          classroom_name: string
          created_at: string
          id: string
          note: string
          session_date: string
          status: string
        }[]
      }
      get_student_classrooms: {
        Args: { academy_uuids: string[]; student_uuid: string }
        Returns: {
          classroom_id: string
          classrooms: Json
        }[]
      }
      get_student_grade_statistics: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_student_id: string
        }
        Returns: Json
      }
      get_student_reports: {
        Args: { student_uuid: string }
        Returns: {
          ai_feedback_created_at: string
          ai_feedback_enabled: boolean
          created_at: string
          end_date: string
          feedback: string
          id: string
          report_name: string
          selected_classrooms: Json
          selected_subjects: Json
          start_date: string
          status: string
          student_id: string
          updated_at: string
        }[]
      }
      get_teacher_academy_ids: {
        Args: { teacher_user_id: string }
        Returns: string[]
      }
      get_user_academy_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_user_accessible_classrooms: {
        Args: { input_user_id: string }
        Returns: string[]
      }
      get_user_family_students: {
        Args: { parent_user_id: string }
        Returns: string[]
      }
      get_users_for_family: {
        Args: { user_uuid: string }
        Returns: {
          academy_id: string
          email: string
          family_role: string
          id: string
          name: string
        }[]
      }
      increment_study_pass_credits: {
        Args: { p_delta: number; p_student: string; p_test: string }
        Returns: undefined
      }
      increment_study_purchased_credits: {
        Args: { p_delta: number; p_student_id: string }
        Returns: undefined
      }
      is_parent_of_student: {
        Args: { parent_user_id: string; student_user_id: string }
        Returns: boolean
      }
      is_same_academy: {
        Args: { check_user_id: string; target_academy_id: string }
        Returns: boolean
      }
      is_same_family: {
        Args: { parent_user_id: string; student_user_id: string }
        Returns: boolean
      }
      refund_study_credit: {
        Args: { p_source: string; p_student: string }
        Returns: Json
      }
      student_in_classroom: {
        Args: { student_user_id: string; target_classroom_id: string }
        Returns: boolean
      }
      study_item_content_sha: { Args: { p_item: Json }; Returns: string }
      study_item_dedup_key: { Args: { p_item: Json }; Returns: string }
      teaches_classroom: {
        Args: { target_classroom_id: string; teacher_user_id: string }
        Returns: boolean
      }
      use_study_credit: {
        Args: { p_source: string; p_student: string }
        Returns: Json
      }
      use_study_pass_credit: {
        Args: { p_source: string; p_student: string; p_test: string }
        Returns: Json
      }
      user_academy_id: { Args: { uid: string }; Returns: string }
      user_enrolled_classrooms: {
        Args: { user_uuid: string }
        Returns: {
          classroom_id: string
        }[]
      }
      user_sole_managed_academies: {
        Args: { p_user_id: string }
        Returns: {
          academy_id: string
          academy_name: string
          member_count: number
        }[]
      }
      classroom_performance_for_academy: {
        Args: { p_academy_id: string }
        Returns: {
          classroom_id: string
          classroom_name: string
          classroom_color: string | null
          avg_score: number | null
          graded_count: number
          attendance_rate: number | null
          attendance_count: number
        }[]
      }
      student_performance_for_academy: {
        Args: { p_academy_id: string }
        Returns: {
          student_id: string
          student_name: string
          avg_score: number | null
          graded_count: number
          classroom_name: string | null
        }[]
      }
    }
    Enums: {
      report_status:
        | "Draft"
        | "Finished"
        | "Approved"
        | "Sent"
        | "Viewed"
        | "Error"
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
      report_status: [
        "Draft",
        "Finished",
        "Approved",
        "Sent",
        "Viewed",
        "Error",
      ],
    },
  },
} as const

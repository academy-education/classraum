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
          created_at: string | null
          id: string
          is_suspended: boolean | null
          name: string
          subscription_tier: string | null
          suspended_at: string | null
          suspension_reason: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_suspended?: boolean | null
          name: string
          subscription_tier?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_suspended?: boolean | null
          name?: string
          subscription_tier?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
        ]
      }
      academy_subscriptions: {
        Row: {
          academy_id: string
          auto_renew: boolean | null
          billing_cycle: string
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
          plan_tier: string
          status: string
          storage_limit_gb: number
          student_limit: number
          teacher_limit: number
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          auto_renew?: boolean | null
          billing_cycle: string
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
          plan_tier: string
          status: string
          storage_limit_gb?: number
          student_limit?: number
          teacher_limit?: number
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          auto_renew?: boolean | null
          billing_cycle?: string
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
          plan_tier?: string
          status?: string
          storage_limit_gb?: number
          student_limit?: number
          teacher_limit?: number
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
        ]
      }
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          description: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      assignment_categories: {
        Row: {
          academy_id: string
          created_at: string | null
          id: string
          name: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          id?: string
          name: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
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
            referencedRelation: "students"
            referencedColumns: ["user_id"]
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
          id: string
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
          id?: string
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
          id?: string
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
          updated_at: string | null
        }
        Insert: {
          classroom_session_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          status: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          classroom_session_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          status?: string
          student_id?: string
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
            referencedRelation: "students"
            referencedColumns: ["user_id"]
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
          end_time: string
          id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          day: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          day?: string
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
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          id?: string
          student_id?: string
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
            referencedRelation: "students"
            referencedColumns: ["user_id"]
          },
        ]
      }
      classrooms: {
        Row: {
          academy_id: string
          color: string | null
          created_at: string | null
          deleted_at: string | null
          grade: string | null
          id: string
          name: string
          notes: string | null
          subject: string | null
          subject_id: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          grade?: string | null
          id?: string
          name: string
          notes?: string | null
          subject?: string | null
          subject_id?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          grade?: string | null
          id?: string
          name?: string
          notes?: string | null
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string
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
      families: {
        Row: {
          academy_id: string
          created_at: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
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
        ]
      }
      family_members: {
        Row: {
          created_at: string | null
          family_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          family_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          family_id?: string
          role?: string
          user_id?: string
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
      invoices: {
        Row: {
          academy_id: string
          amount: number
          created_at: string
          discount_amount: number | null
          discount_reason: string | null
          due_date: string
          final_amount: number
          id: string
          paid_at: string | null
          payment_method: string | null
          refunded_amount: number | null
          status: string
          student_id: string
          template_id: string | null
          transaction_id: string | null
        }
        Insert: {
          academy_id: string
          amount: number
          created_at?: string
          discount_amount?: number | null
          discount_reason?: string | null
          due_date: string
          final_amount: number
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          refunded_amount?: number | null
          status: string
          student_id: string
          template_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          academy_id?: string
          amount?: number
          created_at?: string
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string
          final_amount?: number
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          refunded_amount?: number | null
          status?: string
          student_id?: string
          template_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "parents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payment_template_students: {
        Row: {
          amount_override: number | null
          created_at: string
          id: string
          status: string | null
          student_id: string
          template_id: string
        }
        Insert: {
          amount_override?: number | null
          created_at?: string
          id?: string
          status?: string | null
          student_id: string
          template_id: string
        }
        Update: {
          amount_override?: number | null
          created_at?: string
          id?: string
          status?: string | null
          student_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_template_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["user_id"]
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
          end_date: string | null
          id: string
          interval_weeks: number | null
          is_active: boolean
          name: string
          next_due_date: string
          recurrence_type: string
          semester_months: number | null
          start_date: string
        }
        Insert: {
          academy_id: string
          amount: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          id?: string
          interval_weeks?: number | null
          is_active?: boolean
          name: string
          next_due_date: string
          recurrence_type: string
          semester_months?: number | null
          start_date: string
        }
        Update: {
          academy_id?: string
          amount?: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          id?: string
          interval_weeks?: number | null
          is_active?: boolean
          name?: string
          next_due_date?: string
          recurrence_type?: string
          semester_months?: number | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_templates_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          ai_feedback_enabled: boolean | null
          created_at: string
          end_date: string | null
          id: string
          report_name: string | null
          selected_assignment_categories: Json | null
          selected_classrooms: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["report_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          ai_feedback_enabled?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          report_name?: string | null
          selected_assignment_categories?: Json | null
          selected_classrooms?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          ai_feedback_enabled?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          report_name?: string | null
          selected_assignment_categories?: Json | null
          selected_classrooms?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_report_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["user_id"]
          },
        ]
      }
      students: {
        Row: {
          academy_id: string
          active: boolean | null
          created_at: string | null
          phone: string | null
          school_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academy_id: string
          active?: boolean | null
          created_at?: string | null
          phone?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academy_id?: string
          active?: boolean | null
          created_at?: string | null
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
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      subscription_invoices: {
        Row: {
          academy_id: string
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
          academy_id: string
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
          academy_id?: string
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
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_logout_minutes: number | null
          created_at: string | null
          dashboard_widgets: Json | null
          date_format: string | null
          default_view: string | null
          display_density: string | null
          email_notifications: Json | null
          language: string | null
          login_notifications: boolean | null
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
          dashboard_widgets?: Json | null
          date_format?: string | null
          default_view?: string | null
          display_density?: string | null
          email_notifications?: Json | null
          language?: string | null
          login_notifications?: boolean | null
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
          dashboard_widgets?: Json | null
          date_format?: string | null
          default_view?: string | null
          display_density?: string | null
          email_notifications?: Json | null
          language?: string | null
          login_notifications?: boolean | null
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
          email: string
          id: string
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_assignment_grade: {
        Args: { assignment_id_param: string; user_id_param: string }
        Returns: boolean
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
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
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
      get_academy_trend_data: {
        Args: { academy_id_param: string; days_back?: number }
        Returns: Json
      }
      get_classroom_student_count: {
        Args: { classroom_uuid: string }
        Returns: number
      }
      is_same_academy: {
        Args: { check_user_id: string; target_academy_id: string }
        Returns: boolean
      }
      is_same_family: {
        Args: { parent_user_id: string; student_user_id: string }
        Returns: boolean
      }
      student_in_classroom: {
        Args: { student_user_id: string; target_classroom_id: string }
        Returns: boolean
      }
      teaches_classroom: {
        Args: { target_classroom_id: string; teacher_user_id: string }
        Returns: boolean
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
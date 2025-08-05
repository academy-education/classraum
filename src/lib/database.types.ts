export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assignment_categories: {
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
            foreignKeyName: "assignment_categories_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
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
            referencedRelation: "teachers"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "classrooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["user_id"]
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
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
          id?: string
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
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
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
          created_at: string | null
          language: string | null
          push_notifications: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          language?: string | null
          push_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          language?: string | null
          push_notifications?: boolean | null
          theme?: string | null
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
      is_same_academy: {
        Args: { user_id: string; target_academy_id: string }
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
        Args: { teacher_user_id: string; target_classroom_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
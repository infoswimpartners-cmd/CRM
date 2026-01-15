export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          email: string | null
          role: 'admin' | 'coach' | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          role?: 'admin' | 'coach' | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          email?: string | null
          role?: 'admin' | 'coach' | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      lessons: {
        Row: {
          id: string
          created_at: string
          coach_id: string
          student_name: string
          lesson_date: string
          location: string
          menu_description: string | null
          price: number | null
          student_id: string | null
          lesson_master_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          coach_id: string
          student_name: string
          lesson_date: string
          location: string
          menu_description?: string | null
          price?: number | null
          student_id?: string | null
          lesson_master_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          coach_id?: string
          student_name?: string
          lesson_date?: string
          location?: string
          menu_description?: string | null
          price?: number | null
          student_id?: string | null
          lesson_master_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_coach_id_fkey"
            columns: ["coach_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_lesson_master_id_fkey"
            columns: ["lesson_master_id"]
            referencedRelation: "lesson_masters"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

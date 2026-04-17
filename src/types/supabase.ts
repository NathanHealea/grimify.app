export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string
          id: number
          logo_url: string | null
          name: string
          slug: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          logo_url?: string | null
          name: string
          slug: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          logo_url?: string | null
          name?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      hues: {
        Row: {
          created_at: string
          hex_code: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          hex_code: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          hex_code?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hues_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "hues"
            referencedColumns: ["id"]
          },
        ]
      }
      paint_references: {
        Row: {
          created_at: string
          id: number
          paint_id: string
          related_paint_id: string
          relationship: string
          similarity_score: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          paint_id: string
          related_paint_id: string
          relationship: string
          similarity_score?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          paint_id?: string
          related_paint_id?: string
          relationship?: string
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "paint_references_paint_id_fkey"
            columns: ["paint_id"]
            isOneToOne: false
            referencedRelation: "paints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_references_related_paint_id_fkey"
            columns: ["related_paint_id"]
            isOneToOne: false
            referencedRelation: "paints"
            referencedColumns: ["id"]
          },
        ]
      }
      paints: {
        Row: {
          b: number
          brand_paint_id: string
          created_at: string
          g: number
          hex: string
          hue: number
          hue_id: string | null
          id: string
          is_discontinued: boolean
          is_metallic: boolean
          lightness: number
          name: string
          paint_type: string | null
          product_line_id: number
          r: number
          saturation: number
          slug: string
          updated_at: string
        }
        Insert: {
          b: number
          brand_paint_id: string
          created_at?: string
          g: number
          hex: string
          hue: number
          hue_id?: string | null
          id?: string
          is_discontinued?: boolean
          is_metallic?: boolean
          lightness: number
          name: string
          paint_type?: string | null
          product_line_id: number
          r: number
          saturation: number
          slug: string
          updated_at?: string
        }
        Update: {
          b?: number
          brand_paint_id?: string
          created_at?: string
          g?: number
          hex?: string
          hue?: number
          hue_id?: string | null
          id?: string
          is_discontinued?: boolean
          is_metallic?: boolean
          lightness?: number
          name?: string
          paint_type?: string | null
          product_line_id?: number
          r?: number
          saturation?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paints_hue_id_fkey"
            columns: ["hue_id"]
            isOneToOne: false
            referencedRelation: "hues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paints_product_line_id_fkey"
            columns: ["product_line_id"]
            isOneToOne: false
            referencedRelation: "product_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lines: {
        Row: {
          brand_id: number
          created_at: string
          description: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          brand_id: number
          created_at?: string
          description?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          brand_id?: number
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_lines_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          has_setup_profile: boolean
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          has_setup_profile?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          has_setup_profile?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { target_id: string }; Returns: undefined }
      extract_oauth_display_name: { Args: { meta: Json }; Returns: string }
      generate_profile_name: { Args: never; Returns: string }
      get_user_roles: { Args: { user_uuid: string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


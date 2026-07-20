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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          created_at: string
          id: string
          ref_id: string
          ref_type: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ref_id: string
          ref_type: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ref_id?: string
          ref_type?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      indexer_state: {
        Row: {
          id: string
          last_block: number
          updated_at: string
        }
        Insert: {
          id: string
          last_block?: number
          updated_at?: string
        }
        Update: {
          id?: string
          last_block?: number
          updated_at?: string
        }
        Relationships: []
      }
      leash_spends: {
        Row: {
          amount: number
          block_number: number | null
          created_at: string
          id: string
          leash_id: string
          log_index: number
          to_address: string
          tx_hash: string
        }
        Insert: {
          amount: number
          block_number?: number | null
          created_at?: string
          id?: string
          leash_id: string
          log_index: number
          to_address: string
          tx_hash: string
        }
        Update: {
          amount?: number
          block_number?: number | null
          created_at?: string
          id?: string
          leash_id?: string
          log_index?: number
          to_address?: string
          tx_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "leash_spends_leash_id_fkey"
            columns: ["leash_id"]
            isOneToOne: false
            referencedRelation: "leashes"
            referencedColumns: ["id"]
          },
        ]
      }
      leashes: {
        Row: {
          allowed_contracts: string[]
          beneficiary_address: string | null
          beneficiary_ref: string
          beneficiary_user_id: string | null
          claim_token: string
          contract_scope: string
          created_at: string
          expiry_tz: string | null
          expiry_unix: number | null
          id: string
          onchain_leash_id: string | null
          owner_id: string
          revoked: boolean
          spend_limit: number
          spent: number
          token: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          allowed_contracts?: string[]
          beneficiary_address?: string | null
          beneficiary_ref: string
          beneficiary_user_id?: string | null
          claim_token?: string
          contract_scope?: string
          created_at?: string
          expiry_tz?: string | null
          expiry_unix?: number | null
          id?: string
          onchain_leash_id?: string | null
          owner_id: string
          revoked?: boolean
          spend_limit: number
          spent?: number
          token?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          allowed_contracts?: string[]
          beneficiary_address?: string | null
          beneficiary_ref?: string
          beneficiary_user_id?: string | null
          claim_token?: string
          contract_scope?: string
          created_at?: string
          expiry_tz?: string | null
          expiry_unix?: number | null
          id?: string
          onchain_leash_id?: string | null
          owner_id?: string
          revoked?: boolean
          spend_limit?: number
          spent?: number
          token?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leashes_beneficiary_user_id_fkey"
            columns: ["beneficiary_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leashes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
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
      pledge_events: {
        Row: {
          block_number: number | null
          created_at: string
          event_type: string
          id: string
          log_index: number | null
          pledge_id: string
          tx_hash: string | null
        }
        Insert: {
          block_number?: number | null
          created_at?: string
          event_type: string
          id?: string
          log_index?: number | null
          pledge_id: string
          tx_hash?: string | null
        }
        Update: {
          block_number?: number | null
          created_at?: string
          event_type?: string
          id?: string
          log_index?: number | null
          pledge_id?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pledge_events_pledge_id_fkey"
            columns: ["pledge_id"]
            isOneToOne: false
            referencedRelation: "pledges"
            referencedColumns: ["id"]
          },
        ]
      }
      pledges: {
        Row: {
          created_at: string
          deadline_tz: string
          deadline_unix: number
          failure_destination_address: string | null
          failure_destination_id: string
          failure_destination_label: string
          goal: string
          id: string
          is_public: boolean
          onchain_pledge_id: string | null
          pledger_id: string
          resolved_at: string | null
          share_card_url: string | null
          stake_amount: number
          status: string
          token: string
          tx_hash: string | null
          updated_at: string
          witness_address: string | null
          witness_ref: string
          witness_token: string
          witness_user_id: string | null
        }
        Insert: {
          created_at?: string
          deadline_tz: string
          deadline_unix: number
          failure_destination_address?: string | null
          failure_destination_id: string
          failure_destination_label: string
          goal: string
          id?: string
          is_public?: boolean
          onchain_pledge_id?: string | null
          pledger_id: string
          resolved_at?: string | null
          share_card_url?: string | null
          stake_amount: number
          status?: string
          token?: string
          tx_hash?: string | null
          updated_at?: string
          witness_address?: string | null
          witness_ref: string
          witness_token?: string
          witness_user_id?: string | null
        }
        Update: {
          created_at?: string
          deadline_tz?: string
          deadline_unix?: number
          failure_destination_address?: string | null
          failure_destination_id?: string
          failure_destination_label?: string
          goal?: string
          id?: string
          is_public?: boolean
          onchain_pledge_id?: string | null
          pledger_id?: string
          resolved_at?: string | null
          share_card_url?: string | null
          stake_amount?: number
          status?: string
          token?: string
          tx_hash?: string | null
          updated_at?: string
          witness_address?: string | null
          witness_ref?: string
          witness_token?: string
          witness_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pledges_pledger_id_fkey"
            columns: ["pledger_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_witness_user_id_fkey"
            columns: ["witness_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sends: {
        Row: {
          amount: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          dest_chain_id: number | null
          id: string
          note: string | null
          recipient_address: string | null
          recipient_input: string
          recipient_type: string
          recipient_user_id: string | null
          sender_id: string
          share_token: string
          source_chain_id: number | null
          status: string
          token: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          dest_chain_id?: number | null
          id?: string
          note?: string | null
          recipient_address?: string | null
          recipient_input: string
          recipient_type: string
          recipient_user_id?: string | null
          sender_id: string
          share_token?: string
          source_chain_id?: number | null
          status?: string
          token?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          dest_chain_id?: number | null
          id?: string
          note?: string | null
          recipient_address?: string | null
          recipient_input?: string
          recipient_type?: string
          recipient_user_id?: string | null
          sender_id?: string
          share_token?: string
          source_chain_id?: number | null
          status?: string
          token?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sends_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sends_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      split_members: {
        Row: {
          created_at: string
          id: string
          member_ref: string
          member_user_id: string | null
          settle_tx_hash: string | null
          settled: boolean
          settled_at: string | null
          share_amount: number
          split_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_ref: string
          member_user_id?: string | null
          settle_tx_hash?: string | null
          settled?: boolean
          settled_at?: string | null
          share_amount: number
          split_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_ref?: string
          member_user_id?: string | null
          settle_tx_hash?: string | null
          settled?: boolean
          settled_at?: string | null
          share_amount?: number
          split_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_members_member_user_id_fkey"
            columns: ["member_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_members_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
        ]
      }
      splits: {
        Row: {
          created_at: string
          id: string
          name: string | null
          organizer_id: string
          share_link_token: string
          split_method: string
          status: string
          token: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          organizer_id: string
          share_link_token?: string
          split_method?: string
          status?: string
          token?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          organizer_id?: string
          share_link_token?: string
          split_method?: string
          status?: string
          token?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "splits_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          handle: string | null
          id: string
          magic_id: string | null
          preferred_chain_id: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          handle?: string | null
          id: string
          magic_id?: string | null
          preferred_chain_id?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          handle?: string | null
          id?: string
          magic_id?: string | null
          preferred_chain_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_split_member: { Args: { split: string }; Returns: boolean }
      is_split_organizer: { Args: { split: string }; Returns: boolean }
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

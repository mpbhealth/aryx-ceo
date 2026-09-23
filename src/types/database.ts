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
      advisor_scorecards: {
        Row: {
          active_members: number
          advisor_key: string
          cost: number
          created_at: string
          display_name: string | null
          enrollments_30: number
          enrollments_90: number
          margin_pct: number | null
          metadata: Json
          mrr: number
          mrr_added_90: number
          net_mrr: number
          on_hold_members: number
          org_id: string
          retention_pct: number | null
          term_soon_90: number
          terminating_members: number
          updated_at: string
        }
        Insert: {
          active_members?: number
          advisor_key: string
          cost?: number
          created_at?: string
          display_name?: string | null
          enrollments_30?: number
          enrollments_90?: number
          margin_pct?: number | null
          metadata?: Json
          mrr?: number
          mrr_added_90?: number
          net_mrr?: number
          on_hold_members?: number
          org_id: string
          retention_pct?: number | null
          term_soon_90?: number
          terminating_members?: number
          updated_at?: string
        }
        Update: {
          active_members?: number
          advisor_key?: string
          cost?: number
          created_at?: string
          display_name?: string | null
          enrollments_30?: number
          enrollments_90?: number
          margin_pct?: number | null
          metadata?: Json
          mrr?: number
          mrr_added_90?: number
          net_mrr?: number
          on_hold_members?: number
          org_id?: string
          retention_pct?: number | null
          term_soon_90?: number
          terminating_members?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_scorecards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          metric_key: string
          org_id: string
          period_end: string | null
          period_start: string
          source: string
          unit: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          metric_key: string
          org_id: string
          period_end?: string | null
          period_start: string
          source: string
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          metric_key?: string
          org_id?: string
          period_end?: string | null
          period_start?: string
          source?: string
          unit?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      aryx_identity_map: {
        Row: {
          accounts_sub: string
          aryx_org_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          accounts_sub: string
          aryx_org_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          accounts_sub?: string
          aryx_org_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aryx_identity_map_aryx_org_id_fkey"
            columns: ["aryx_org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_actions: {
        Row: {
          action_key: string
          advisor_key: string | null
          created_at: string
          dollars: number | null
          href: string | null
          kind: string | null
          metadata: Json
          org_id: string
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          action_key: string
          advisor_key?: string | null
          created_at?: string
          dollars?: number | null
          href?: string | null
          kind?: string | null
          metadata?: Json
          org_id: string
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          action_key?: string
          advisor_key?: string | null
          created_at?: string
          dollars?: number | null
          href?: string | null
          kind?: string | null
          metadata?: Json
          org_id?: string
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_billing_risk: {
        Row: {
          advisor_key: string | null
          advisor_label: string | null
          created_at: string
          display_name: string | null
          last_payment: number | null
          member_key: string
          metadata: Json
          monthly_fee: number
          next_billing_date: string | null
          org_id: string
          paid: boolean | null
          product_key: string
          risk_flag: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          advisor_key?: string | null
          advisor_label?: string | null
          created_at?: string
          display_name?: string | null
          last_payment?: number | null
          member_key: string
          metadata?: Json
          monthly_fee?: number
          next_billing_date?: string | null
          org_id: string
          paid?: boolean | null
          product_key?: string
          risk_flag?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          advisor_key?: string | null
          advisor_label?: string | null
          created_at?: string
          display_name?: string | null
          last_payment?: number | null
          member_key?: string
          metadata?: Json
          monthly_fee?: number
          next_billing_date?: string | null
          org_id?: string
          paid?: boolean | null
          product_key?: string
          risk_flag?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_billing_risk_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_tickets: {
        Row: {
          agent_label: string | null
          category: string | null
          created_at: string | null
          href: string | null
          metadata: Json
          org_id: string
          priority: string | null
          sla_due_at: string | null
          status: string | null
          ticket_key: string
          ticket_number: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          agent_label?: string | null
          category?: string | null
          created_at?: string | null
          href?: string | null
          metadata?: Json
          org_id: string
          priority?: string | null
          sla_due_at?: string | null
          status?: string | null
          ticket_key: string
          ticket_number?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          agent_label?: string | null
          category?: string | null
          created_at?: string | null
          href?: string | null
          metadata?: Json
          org_id?: string
          priority?: string | null
          sla_due_at?: string | null
          status?: string | null
          ticket_key?: string
          ticket_number?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      cos_org_link: {
        Row: {
          accounts_org_id: string
          advisoriq_org_id: string | null
          created_at: string
          crm_org_id: string | null
          enrollment_org_id: string | null
          is_active: boolean
          marketflow_team_id: string | null
          org_id: string
          ticket_scope: string
          updated_at: string
        }
        Insert: {
          accounts_org_id: string
          advisoriq_org_id?: string | null
          created_at?: string
          crm_org_id?: string | null
          enrollment_org_id?: string | null
          is_active?: boolean
          marketflow_team_id?: string | null
          org_id: string
          ticket_scope?: string
          updated_at?: string
        }
        Update: {
          accounts_org_id?: string
          advisoriq_org_id?: string | null
          created_at?: string
          crm_org_id?: string | null
          enrollment_org_id?: string | null
          is_active?: boolean
          marketflow_team_id?: string | null
          org_id?: string
          ticket_scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cos_org_link_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          budget_allocated: number | null
          code: string | null
          contact_email: string | null
          created_at: string
          department_lead_id: string | null
          description: string | null
          headcount: number | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          org_id: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          budget_allocated?: number | null
          code?: string | null
          contact_email?: string | null
          created_at?: string
          department_lead_id?: string | null
          description?: string | null
          headcount?: number | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          org_id?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          budget_allocated?: number | null
          code?: string | null
          contact_email?: string | null
          created_at?: string
          department_lead_id?: string | null
          description?: string | null
          headcount?: number | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          org_id?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_logs: {
        Row: {
          created_at: string
          env: string
          id: string
          log: string | null
          org_id: string
          project: string
          status: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          env?: string
          id?: string
          log?: string | null
          org_id?: string
          project: string
          status?: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          env?: string
          id?: string
          log?: string | null
          org_id?: string
          project?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          account_id: string | null
          attachments: Json
          bcc_recipients: Json
          body_html: string | null
          cc_recipients: Json
          created_at: string
          id: string
          in_reply_to: string | null
          org_id: string
          reply_type: string | null
          subject: string | null
          to_recipients: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          attachments?: Json
          bcc_recipients?: Json
          body_html?: string | null
          cc_recipients?: Json
          created_at?: string
          id?: string
          in_reply_to?: string | null
          org_id: string
          reply_type?: string | null
          subject?: string | null
          to_recipients?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          attachments?: Json
          bcc_recipients?: Json
          body_html?: string | null
          cc_recipients?: Json
          created_at?: string
          id?: string
          in_reply_to?: string | null
          org_id?: string
          reply_type?: string | null
          subject?: string | null
          to_recipients?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signatures: {
        Row: {
          created_at: string
          html_content: string
          id: string
          include_social_links: boolean
          is_default: boolean
          logo_height: number | null
          logo_url: string | null
          logo_width: number | null
          name: string
          org_id: string
          plain_text_content: string | null
          social_links: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html_content?: string
          id?: string
          include_social_links?: boolean
          is_default?: boolean
          logo_height?: number | null
          logo_url?: string | null
          logo_width?: number | null
          name: string
          org_id: string
          plain_text_content?: string | null
          social_links?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          include_social_links?: boolean
          is_default?: boolean
          logo_height?: number | null
          logo_url?: string | null
          logo_width?: number | null
          name?: string
          org_id?: string
          plain_text_content?: string | null
          social_links?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_signatures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          created_at: string
          email: string | null
          employee_id: string | null
          employment_status: string
          employment_type: string | null
          first_name: string
          id: string
          last_name: string
          location: string | null
          org_id: string
          phone: string | null
          primary_department_id: string | null
          reports_to_id: string | null
          skills: string[]
          start_date: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          first_name: string
          id?: string
          last_name: string
          location?: string | null
          org_id?: string
          phone?: string | null
          primary_department_id?: string | null
          reports_to_id?: string | null
          skills?: string[]
          start_date?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          first_name?: string
          id?: string
          last_name?: string
          location?: string | null
          org_id?: string
          phone?: string | null
          primary_department_id?: string | null
          reports_to_id?: string | null
          skills?: string[]
          start_date?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_primary_department_id_fkey"
            columns: ["primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_record_links: {
        Row: {
          confidence: number | null
          created_at: string
          href: string | null
          id: string
          link_source: string
          local_entity: string | null
          local_id: string | null
          org_id: string
          remote_id: string
          remote_object: string
          remote_system: string
          verified_by_user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          href?: string | null
          id?: string
          link_source?: string
          local_entity?: string | null
          local_id?: string | null
          org_id: string
          remote_id: string
          remote_object: string
          remote_system: string
          verified_by_user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          href?: string | null
          id?: string
          link_source?: string
          local_entity?: string | null
          local_id?: string | null
          org_id?: string
          remote_id?: string
          remote_object?: string
          remote_system?: string
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_record_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_agent_upline: {
        Row: {
          active_members: number
          created_at: string
          display_name: string | null
          downline_count: number
          early_cancel_pct: number | null
          metadata: Json
          mrr: number
          mrr_share_pct: number | null
          net_mrr: number
          org_id: string
          updated_at: string
          upline_key: string
        }
        Insert: {
          active_members?: number
          created_at?: string
          display_name?: string | null
          downline_count?: number
          early_cancel_pct?: number | null
          metadata?: Json
          mrr?: number
          mrr_share_pct?: number | null
          net_mrr?: number
          org_id: string
          updated_at?: string
          upline_key: string
        }
        Update: {
          active_members?: number
          created_at?: string
          display_name?: string | null
          downline_count?: number
          early_cancel_pct?: number | null
          metadata?: Json
          mrr?: number
          mrr_share_pct?: number | null
          net_mrr?: number
          org_id?: string
          updated_at?: string
          upline_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_agent_upline_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_book_quality: {
        Row: {
          cohort_30: number
          cohort_60: number
          cohort_90: number
          cohort_size: number
          contribution: number | null
          created_at: string
          first_pay_success_pct: number | null
          grain: string
          metadata: Json
          org_id: string
          quality_key: string
          survived_30: number
          survived_60: number
          survived_90: number
          updated_at: string
        }
        Insert: {
          cohort_30?: number
          cohort_60?: number
          cohort_90?: number
          cohort_size?: number
          contribution?: number | null
          created_at?: string
          first_pay_success_pct?: number | null
          grain: string
          metadata?: Json
          org_id: string
          quality_key: string
          survived_30?: number
          survived_60?: number
          survived_90?: number
          updated_at?: string
        }
        Update: {
          cohort_30?: number
          cohort_60?: number
          cohort_90?: number
          cohort_size?: number
          contribution?: number | null
          created_at?: string
          first_pay_success_pct?: number | null
          grain?: string
          metadata?: Json
          org_id?: string
          quality_key?: string
          survived_30?: number
          survived_60?: number
          survived_90?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_book_quality_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_crm_pipeline_daily: {
        Row: {
          activity_count: number
          aging_over_7: number
          created_at: string
          deal_amount: number
          deal_count: number
          fact_date: string
          lead_count: number
          lost_count: number
          metadata: Json
          org_id: string
          premium_sum: number
          stage_key: string
          updated_at: string
          weighted_amount: number
          won_count: number
        }
        Insert: {
          activity_count?: number
          aging_over_7?: number
          created_at?: string
          deal_amount?: number
          deal_count?: number
          fact_date: string
          lead_count?: number
          lost_count?: number
          metadata?: Json
          org_id: string
          premium_sum?: number
          stage_key: string
          updated_at?: string
          weighted_amount?: number
          won_count?: number
        }
        Update: {
          activity_count?: number
          aging_over_7?: number
          created_at?: string
          deal_amount?: number
          deal_count?: number
          fact_date?: string
          lead_count?: number
          lost_count?: number
          metadata?: Json
          org_id?: string
          premium_sum?: number
          stage_key?: string
          updated_at?: string
          weighted_amount?: number
          won_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fact_crm_pipeline_daily_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_enrollment_ops: {
        Row: {
          active_count: number
          created_at: string
          fact_date: string
          future_active_count: number
          metadata: Json
          org_id: string
          other_count: number
          updated_at: string
        }
        Insert: {
          active_count?: number
          created_at?: string
          fact_date: string
          future_active_count?: number
          metadata?: Json
          org_id: string
          other_count?: number
          updated_at?: string
        }
        Update: {
          active_count?: number
          created_at?: string
          fact_date?: string
          future_active_count?: number
          metadata?: Json
          org_id?: string
          other_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_enrollment_ops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_enrollments_daily: {
        Row: {
          active_count: number
          created_at: string
          fact_date: string
          inactive_count: number
          metadata: Json
          mrr: number
          new_count: number
          org_id: string
          plan_type: string
          product_key: string
          updated_at: string
        }
        Insert: {
          active_count?: number
          created_at?: string
          fact_date: string
          inactive_count?: number
          metadata?: Json
          mrr?: number
          new_count?: number
          org_id: string
          plan_type?: string
          product_key?: string
          updated_at?: string
        }
        Update: {
          active_count?: number
          created_at?: string
          fact_date?: string
          inactive_count?: number
          metadata?: Json
          mrr?: number
          new_count?: number
          org_id?: string
          plan_type?: string
          product_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_enrollments_daily_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_iq_cohorts: {
        Row: {
          cohort_month: string
          cohort_size: number
          created_at: string
          metadata: Json
          org_id: string
          retained: number
          retention_pct: number | null
          updated_at: string
        }
        Insert: {
          cohort_month: string
          cohort_size?: number
          created_at?: string
          metadata?: Json
          org_id: string
          retained?: number
          retention_pct?: number | null
          updated_at?: string
        }
        Update: {
          cohort_month?: string
          cohort_size?: number
          created_at?: string
          metadata?: Json
          org_id?: string
          retained?: number
          retention_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_iq_cohorts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_iq_forward_risk: {
        Row: {
          bucket: string
          created_at: string
          members: number
          metadata: Json
          mrr_at_risk: number
          org_id: string
          updated_at: string
        }
        Insert: {
          bucket: string
          created_at?: string
          members?: number
          metadata?: Json
          mrr_at_risk?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          members?: number
          metadata?: Json
          mrr_at_risk?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_iq_forward_risk_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_iq_mrr_monthly: {
        Row: {
          created_at: string
          enrollments: number
          metadata: Json
          month: string
          mrr_added: number
          mrr_lost: number
          net_mrr_change: number
          org_id: string
          terminations: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollments?: number
          metadata?: Json
          month: string
          mrr_added?: number
          mrr_lost?: number
          net_mrr_change?: number
          org_id: string
          terminations?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollments?: number
          metadata?: Json
          month?: string
          mrr_added?: number
          mrr_lost?: number
          net_mrr_change?: number
          org_id?: string
          terminations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_iq_mrr_monthly_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_iq_reason_mix: {
        Row: {
          created_at: string
          item_count: number
          kind: string
          metadata: Json
          mrr: number
          org_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          item_count?: number
          kind: string
          metadata?: Json
          mrr?: number
          org_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_count?: number
          kind?: string
          metadata?: Json
          mrr?: number
          org_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_iq_reason_mix_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_pnl_period: {
        Row: {
          active_members: number
          collected: number
          commissions: number
          created_at: string
          enrollment_count: number
          failed: number
          gross_margin: number
          metadata: Json
          net_operating: number
          org_id: string
          pending: number
          period_grain: string
          period_start: string
          saas_cost: number
          updated_at: string
          vendor_cost: number
        }
        Insert: {
          active_members?: number
          collected?: number
          commissions?: number
          created_at?: string
          enrollment_count?: number
          failed?: number
          gross_margin?: number
          metadata?: Json
          net_operating?: number
          org_id: string
          pending?: number
          period_grain: string
          period_start: string
          saas_cost?: number
          updated_at?: string
          vendor_cost?: number
        }
        Update: {
          active_members?: number
          collected?: number
          commissions?: number
          created_at?: string
          enrollment_count?: number
          failed?: number
          gross_margin?: number
          metadata?: Json
          net_operating?: number
          org_id?: string
          pending?: number
          period_grain?: string
          period_start?: string
          saas_cost?: number
          updated_at?: string
          vendor_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "fact_pnl_period_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_product_mix: {
        Row: {
          active_members: number
          cost: number
          created_at: string
          margin_pct: number | null
          metadata: Json
          mrr: number
          net_mrr: number
          org_id: string
          product_key: string
          updated_at: string
        }
        Insert: {
          active_members?: number
          cost?: number
          created_at?: string
          margin_pct?: number | null
          metadata?: Json
          mrr?: number
          net_mrr?: number
          org_id: string
          product_key: string
          updated_at?: string
        }
        Update: {
          active_members?: number
          cost?: number
          created_at?: string
          margin_pct?: number | null
          metadata?: Json
          mrr?: number
          net_mrr?: number
          org_id?: string
          product_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_product_mix_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_ticket_agents: {
        Row: {
          agent_key: string
          breached_count: number
          created_at: string
          display_name: string | null
          metadata: Json
          open_count: number
          org_id: string
          resolved_30: number
          updated_at: string
        }
        Insert: {
          agent_key: string
          breached_count?: number
          created_at?: string
          display_name?: string | null
          metadata?: Json
          open_count?: number
          org_id: string
          resolved_30?: number
          updated_at?: string
        }
        Update: {
          agent_key?: string
          breached_count?: number
          created_at?: string
          display_name?: string | null
          metadata?: Json
          open_count?: number
          org_id?: string
          resolved_30?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_ticket_agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_ticket_aging: {
        Row: {
          bucket: string
          created_at: string
          metadata: Json
          org_id: string
          tickets: number
          updated_at: string
        }
        Insert: {
          bucket: string
          created_at?: string
          metadata?: Json
          org_id: string
          tickets?: number
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          metadata?: Json
          org_id?: string
          tickets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_ticket_aging_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_ticket_mix: {
        Row: {
          created_at: string
          item_count: number
          item_key: string
          kind: string
          metadata: Json
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          item_count?: number
          item_key: string
          kind: string
          metadata?: Json
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_count?: number
          item_key?: string
          kind?: string
          metadata?: Json
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_ticket_mix_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_tickets_daily: {
        Row: {
          breached_count: number
          created_at: string
          created_count: number
          fact_date: string
          first_response_pct: number | null
          metadata: Json
          open_count: number
          org_id: string
          pending_count: number
          resolution_pct: number | null
          resolved_count: number
          sla_pct: number | null
          unassigned_count: number
          updated_at: string
        }
        Insert: {
          breached_count?: number
          created_at?: string
          created_count?: number
          fact_date: string
          first_response_pct?: number | null
          metadata?: Json
          open_count?: number
          org_id: string
          pending_count?: number
          resolution_pct?: number | null
          resolved_count?: number
          sla_pct?: number | null
          unassigned_count?: number
          updated_at?: string
        }
        Update: {
          breached_count?: number
          created_at?: string
          created_count?: number
          fact_date?: string
          first_response_pct?: number | null
          metadata?: Json
          open_count?: number
          org_id?: string
          pending_count?: number
          resolution_pct?: number | null
          resolved_count?: number
          sla_pct?: number | null
          unassigned_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_tickets_daily_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_traffic_daily: {
        Row: {
          conversions: number
          created_at: string
          fact_date: string
          leads: number
          metadata: Json
          new_members: number
          org_id: string
          pageviews: number
          sessions: number
          source: string
          updated_at: string
          users: number
        }
        Insert: {
          conversions?: number
          created_at?: string
          fact_date: string
          leads?: number
          metadata?: Json
          new_members?: number
          org_id: string
          pageviews?: number
          sessions?: number
          source: string
          updated_at?: string
          users?: number
        }
        Update: {
          conversions?: number
          created_at?: string
          fact_date?: string
          leads?: number
          metadata?: Json
          new_members?: number
          org_id?: string
          pageviews?: number
          sessions?: number
          source?: string
          updated_at?: string
          users?: number
        }
        Relationships: [
          {
            foreignKeyName: "fact_traffic_daily_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_vendor_costs_monthly: {
        Row: {
          created_at: string
          metadata: Json
          missing_match_count: number
          org_id: string
          period_start: string
          product_key: string
          updated_at: string
          vendor_cost: number
        }
        Insert: {
          created_at?: string
          metadata?: Json
          missing_match_count?: number
          org_id: string
          period_start: string
          product_key?: string
          updated_at?: string
          vendor_cost?: number
        }
        Update: {
          created_at?: string
          metadata?: Json
          missing_match_count?: number
          org_id?: string
          period_start?: string
          product_key?: string
          updated_at?: string
          vendor_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "fact_vendor_costs_monthly_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          id: string
          mime: string | null
          org_id: string
          owner_user_id: string | null
          size_bytes: number | null
          storage_key: string
          title: string | null
          updated_at: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          mime?: string | null
          org_id: string
          owner_user_id?: string | null
          size_bytes?: number | null
          storage_key: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          mime?: string | null
          org_id?: string
          owner_user_id?: string | null
          size_bytes?: number | null
          storage_key?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_runs: {
        Row: {
          assumptions: Json
          created_at: string
          created_by: string | null
          horizon_days: number
          id: string
          org_id: string
          outputs: Json
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          created_by?: string | null
          horizon_days?: number
          id?: string
          org_id: string
          outputs?: Json
        }
        Update: {
          assumptions?: Json
          created_at?: string
          created_by?: string | null
          horizon_days?: number
          id?: string
          org_id?: string
          outputs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "forecast_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_baas: {
        Row: {
          created_at: string
          executed_on: string | null
          expires_on: string | null
          id: string
          notes: string | null
          org_id: string
          status: string
          updated_at: string
          vendor_name: string
        }
        Insert: {
          created_at?: string
          executed_on?: string | null
          expires_on?: string | null
          id?: string
          notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
          vendor_name: string
        }
        Update: {
          created_at?: string
          executed_on?: string | null
          expires_on?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_baas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_incidents: {
        Row: {
          created_at: string
          discovered_at: string | null
          id: string
          notes: string | null
          org_id: string
          severity: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discovered_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          severity?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discovered_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          severity?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_policies: {
        Row: {
          body: string | null
          created_at: string
          id: string
          org_id: string
          status: string
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          org_id: string
          status?: string
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          org_id?: string
          status?: string
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_trainings: {
        Row: {
          attendee_count: number | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attendee_count?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attendee_count?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hipaa_trainings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sources: {
        Row: {
          created_at: string
          id: string
          key: string
          kind: string
          last_error: string | null
          last_success_at: string | null
          org_id: string
          project_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          kind: string
          last_error?: string | null
          last_success_at?: string | null
          org_id: string
          project_ref?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          kind?: string
          last_error?: string | null
          last_success_at?: string | null
          org_id?: string
          project_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_accounts: {
        Row: {
          account_type: string
          created_at: string
          display_name: string | null
          email_address: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          granted_scopes: string[] | null
          id: string
          is_active: boolean
          is_default: boolean
          key_version: number
          last_successful_sync_at: string | null
          last_sync_at: string | null
          org_id: string
          owner_user_id: string
          provider: string
          provider_account_id: string | null
          refreshing_token: boolean
          status: string
          sync_error: string | null
          sync_failure_count: number
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          display_name?: string | null
          email_address: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          granted_scopes?: string[] | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          key_version?: number
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          org_id: string
          owner_user_id: string
          provider: string
          provider_account_id?: string | null
          refreshing_token?: boolean
          status?: string
          sync_error?: string | null
          sync_failure_count?: number
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          display_name?: string | null
          email_address?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          granted_scopes?: string[] | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          key_version?: number
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          org_id?: string
          owner_user_id?: string
          provider?: string
          provider_account_id?: string | null
          refreshing_token?: boolean
          status?: string
          sync_error?: string | null
          sync_failure_count?: number
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_folders: {
        Row: {
          id: string
          is_label: boolean
          kind: string | null
          mail_account_id: string
          name: string
          org_id: string
          parent_provider_folder_id: string | null
          provider_folder_id: string
          sort_order: number
          total_count: number
          unread_count: number
        }
        Insert: {
          id?: string
          is_label?: boolean
          kind?: string | null
          mail_account_id: string
          name: string
          org_id: string
          parent_provider_folder_id?: string | null
          provider_folder_id: string
          sort_order?: number
          total_count?: number
          unread_count?: number
        }
        Update: {
          id?: string
          is_label?: boolean
          kind?: string | null
          mail_account_id?: string
          name?: string
          org_id?: string
          parent_provider_folder_id?: string | null
          provider_folder_id?: string
          sort_order?: number
          total_count?: number
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "mail_folders_mail_account_id_fkey"
            columns: ["mail_account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_message_folders: {
        Row: {
          mail_folder_id: string
          mail_message_id: string
          org_id: string
        }
        Insert: {
          mail_folder_id: string
          mail_message_id: string
          org_id: string
        }
        Update: {
          mail_folder_id?: string
          mail_message_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_message_folders_mail_folder_id_fkey"
            columns: ["mail_folder_id"]
            isOneToOne: false
            referencedRelation: "mail_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_folders_mail_message_id_fkey"
            columns: ["mail_message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_message_recipients: {
        Row: {
          display_name: string | null
          email_address: string
          id: string
          mail_message_id: string
          normalized_email: string
          org_id: string
          position: number
          recipient_type: string
        }
        Insert: {
          display_name?: string | null
          email_address: string
          id?: string
          mail_message_id: string
          normalized_email: string
          org_id: string
          position?: number
          recipient_type: string
        }
        Update: {
          display_name?: string | null
          email_address?: string
          id?: string
          mail_message_id?: string
          normalized_email?: string
          org_id?: string
          position?: number
          recipient_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_message_recipients_mail_message_id_fkey"
            columns: ["mail_message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_message_recipients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          deleted_at: string | null
          direction: string | null
          id: string
          internet_message_id: string | null
          is_draft: boolean
          is_flagged: boolean
          is_read: boolean
          mail_account_id: string
          mail_thread_id: string | null
          org_id: string
          origin_class: string
          provider_message_id: string
          received_at: string | null
          send_status: string | null
          sender_address: string | null
          sender_name: string | null
          sent_at: string | null
          snippet: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          deleted_at?: string | null
          direction?: string | null
          id?: string
          internet_message_id?: string | null
          is_draft?: boolean
          is_flagged?: boolean
          is_read?: boolean
          mail_account_id: string
          mail_thread_id?: string | null
          org_id: string
          origin_class?: string
          provider_message_id: string
          received_at?: string | null
          send_status?: string | null
          sender_address?: string | null
          sender_name?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          deleted_at?: string | null
          direction?: string | null
          id?: string
          internet_message_id?: string | null
          is_draft?: boolean
          is_flagged?: boolean
          is_read?: boolean
          mail_account_id?: string
          mail_thread_id?: string | null
          org_id?: string
          origin_class?: string
          provider_message_id?: string
          received_at?: string | null
          send_status?: string | null
          sender_address?: string | null
          sender_name?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_mail_account_id_fkey"
            columns: ["mail_account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_mail_thread_id_fkey"
            columns: ["mail_thread_id"]
            isOneToOne: false
            referencedRelation: "mail_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_send_intents: {
        Row: {
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          mail_account_id: string
          org_id: string
          owner_user_id: string
          provider_message_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          mail_account_id: string
          org_id: string
          owner_user_id: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          mail_account_id?: string
          org_id?: string
          owner_user_id?: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_send_intents_mail_account_id_fkey"
            columns: ["mail_account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_send_intents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_renewed_at: string | null
          mail_account_id: string
          org_id: string
          provider_subscription_id: string | null
          renewal_failure_count: number
          resource: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_renewed_at?: string | null
          mail_account_id: string
          org_id: string
          provider_subscription_id?: string | null
          renewal_failure_count?: number
          resource?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_renewed_at?: string | null
          mail_account_id?: string
          org_id?: string
          provider_subscription_id?: string | null
          renewal_failure_count?: number
          resource?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_subscriptions_mail_account_id_fkey"
            columns: ["mail_account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_sync_cursors: {
        Row: {
          consecutive_failures: number
          created_at: string
          cursor_type: string
          cursor_value: string
          folder_id: string | null
          full_resync_required_at: string | null
          id: string
          last_advanced_at: string | null
          mail_account_id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          cursor_type: string
          cursor_value: string
          folder_id?: string | null
          full_resync_required_at?: string | null
          id?: string
          last_advanced_at?: string | null
          mail_account_id: string
          org_id: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          cursor_type?: string
          cursor_value?: string
          folder_id?: string | null
          full_resync_required_at?: string | null
          id?: string
          last_advanced_at?: string | null
          mail_account_id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_sync_cursors_mail_account_id_fkey"
            columns: ["mail_account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_sync_cursors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_threads: {
        Row: {
          created_at: string
          has_attachments: boolean
          id: string
          latest_message_at: string | null
          mail_account_id: string
          message_count: number
          normalized_subject: string | null
          org_id: string
          provider_thread_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_attachments?: boolean
          id?: string
          latest_message_at?: string | null
          mail_account_id: string
          message_count?: number
          normalized_subject?: string | null
          org_id: string
          provider_thread_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_attachments?: boolean
          id?: string
          latest_message_at?: string | null
          mail_account_id?: string
          message_count?: number
          normalized_subject?: string | null
          org_id?: string
          provider_thread_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_threads_mail_account_id_fkey"
            columns: ["mail_account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_spend: {
        Row: {
          amount: number
          created_at: string
          org_id: string
          period_start: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          org_id: string
          period_start: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          org_id?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_spend_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          created_for_role: string | null
          id: string
          is_collaborative: boolean
          is_pinned: boolean
          is_shared: boolean
          org_id: string
          owner_role: string | null
          owner_user_id: string | null
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          created_for_role?: string | null
          id?: string
          is_collaborative?: boolean
          is_pinned?: boolean
          is_shared?: boolean
          org_id: string
          owner_role?: string | null
          owner_user_id?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          created_for_role?: string | null
          id?: string
          is_collaborative?: boolean
          is_pinned?: boolean
          is_shared?: boolean
          org_id?: string
          owner_role?: string | null
          owner_user_id?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      phi_access_log: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          object_id: string | null
          object_type: string
          org_id: string
          purpose: string | null
          source: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          object_type: string
          org_id: string
          purpose?: string | null
          source: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          object_type?: string
          org_id?: string
          purpose?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "phi_access_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          document_type: string | null
          id: string
          org_id: string
          review_date: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          document_type?: string | null
          id?: string
          org_id?: string
          review_date?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          document_type?: string | null
          id?: string
          org_id?: string
          review_date?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          org_id: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          org_id?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          org_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          owner: string | null
          priority: string
          progress: number | null
          start_date: string | null
          status: string
          tags: string[] | null
          target_date: string | null
          team_members: string[] | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          owner?: string | null
          priority?: string
          progress?: number | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          target_date?: string | null
          team_members?: string[] | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          owner?: string | null
          priority?: string
          progress?: number | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          target_date?: string | null
          team_members?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_links: {
        Row: {
          category: string | null
          created_at: string
          id: string
          org_id: string
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          org_id: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          org_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          org_id: string
          priority: string
          start_date: string | null
          status: string
          tags: string[] | null
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          priority?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          priority?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_expenses: {
        Row: {
          amount: number | null
          cadence: string | null
          created_at: string
          currency: string
          id: string
          name: string
          notes: string | null
          org_id: string
          owner: string | null
          renewal_date: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number | null
          cadence?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          owner?: string | null
          renewal_date?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number | null
          cadence?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          owner?: string | null
          renewal_date?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          metrics: Json
          org_id: string
          source_key: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          metrics?: Json
          org_id: string
          source_key: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          metrics?: Json
          org_id?: string
          source_key?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          body: string | null
          created_at: string
          due_at: string | null
          id: string
          org_id: string
          owner_user_id: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          org_id: string
          owner_user_id?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          org_id?: string
          owner_user_id?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_stack: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          org_id: string
          owner: string | null
          status: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          owner?: string | null
          status?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          owner?: string | null
          status?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_stack_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      is_org_operator: { Args: { p_org: string }; Returns: boolean }
      member_org_ids: { Args: never; Returns: string[] }
      set_active_org: { Args: { p_org: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

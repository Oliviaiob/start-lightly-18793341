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
      activity_log: {
        Row: {
          activity_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          source: string | null
        }
        Insert: {
          activity_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          source?: string | null
        }
        Update: {
          activity_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_details: {
        Row: {
          account_holder_name: string
          account_number_encrypted: string
          bank_name: string
          candidate_id: string
          created_at: string
          id: string
          sort_code_encrypted: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number_encrypted: string
          bank_name: string
          candidate_id: string
          created_at?: string
          id?: string
          sort_code_encrypted: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number_encrypted?: string
          bank_name?: string
          candidate_id?: string
          created_at?: string
          id?: string
          sort_code_encrypted?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_details_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          branch_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          qualification_required: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          qualification_required?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          qualification_required?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          candidate_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          additional_qualifications: string[] | null
          address_line_1: string | null
          address_line_2: string | null
          assumed_location: string | null
          availability_grid: Json | null
          availability_updated_at: string | null
          available_days: string[] | null
          bank_details_token: string
          candidate_type: string | null
          city: string | null
          contract_agreed: boolean | null
          created_at: string | null
          created_by: string | null
          criminal_declaration_clear: boolean | null
          current_employer: string | null
          current_position: string | null
          cv_original_url: string | null
          cv_soar_url: string | null
          date_of_birth: string | null
          dbs_certificate_number: string | null
          dbs_issue_date: string | null
          dbs_next_check_due: string | null
          dbs_update_service_registered: boolean | null
          dbs_verified: boolean | null
          dbs_verified_date: string | null
          declaration_clear_since_dbs: boolean | null
          disability_declared: boolean | null
          drives: boolean | null
          email: string | null
          experience_summary: string | null
          first_name: string | null
          has_dbs: boolean | null
          hourly_rate: number | null
          id: string
          is_starred: boolean
          last_name: string | null
          latitude: number | null
          longitude: number | null
          marketing_consent: boolean | null
          max_commute_minutes: number | null
          ni_number: string | null
          notes: string | null
          onboarding_email_sent_at: string | null
          open_to_temp: boolean
          paediatric_first_aid: boolean | null
          paediatric_first_aid_expiry: string | null
          passport_photo_url: string | null
          payroll_consent: boolean | null
          perm_dbs_update_service: string | null
          perm_dbs_uptodate: string | null
          perm_paediatric_first_aid: string | null
          perm_safeguarding: string | null
          phone: string | null
          postcode: string | null
          preferred_fields: string[] | null
          qualification_level: string | null
          right_to_work_verified: boolean | null
          right_to_work_verified_date: string | null
          safeguarding_training: boolean | null
          shift_types_available: string[] | null
          source: string | null
          status_perm: string | null
          status_temp: string | null
          updated_at: string | null
          work_permit_required: boolean | null
        }
        Insert: {
          additional_qualifications?: string[] | null
          address_line_1?: string | null
          address_line_2?: string | null
          assumed_location?: string | null
          availability_grid?: Json | null
          availability_updated_at?: string | null
          available_days?: string[] | null
          bank_details_token?: string
          candidate_type?: string | null
          city?: string | null
          contract_agreed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          criminal_declaration_clear?: boolean | null
          current_employer?: string | null
          current_position?: string | null
          cv_original_url?: string | null
          cv_soar_url?: string | null
          date_of_birth?: string | null
          dbs_certificate_number?: string | null
          dbs_issue_date?: string | null
          dbs_next_check_due?: string | null
          dbs_update_service_registered?: boolean | null
          dbs_verified?: boolean | null
          dbs_verified_date?: string | null
          declaration_clear_since_dbs?: boolean | null
          disability_declared?: boolean | null
          drives?: boolean | null
          email?: string | null
          experience_summary?: string | null
          first_name?: string | null
          has_dbs?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_starred?: boolean
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_consent?: boolean | null
          max_commute_minutes?: number | null
          ni_number?: string | null
          notes?: string | null
          onboarding_email_sent_at?: string | null
          open_to_temp?: boolean
          paediatric_first_aid?: boolean | null
          paediatric_first_aid_expiry?: string | null
          passport_photo_url?: string | null
          payroll_consent?: boolean | null
          perm_dbs_update_service?: string | null
          perm_dbs_uptodate?: string | null
          perm_paediatric_first_aid?: string | null
          perm_safeguarding?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_fields?: string[] | null
          qualification_level?: string | null
          right_to_work_verified?: boolean | null
          right_to_work_verified_date?: string | null
          safeguarding_training?: boolean | null
          shift_types_available?: string[] | null
          source?: string | null
          status_perm?: string | null
          status_temp?: string | null
          updated_at?: string | null
          work_permit_required?: boolean | null
        }
        Update: {
          additional_qualifications?: string[] | null
          address_line_1?: string | null
          address_line_2?: string | null
          assumed_location?: string | null
          availability_grid?: Json | null
          availability_updated_at?: string | null
          available_days?: string[] | null
          bank_details_token?: string
          candidate_type?: string | null
          city?: string | null
          contract_agreed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          criminal_declaration_clear?: boolean | null
          current_employer?: string | null
          current_position?: string | null
          cv_original_url?: string | null
          cv_soar_url?: string | null
          date_of_birth?: string | null
          dbs_certificate_number?: string | null
          dbs_issue_date?: string | null
          dbs_next_check_due?: string | null
          dbs_update_service_registered?: boolean | null
          dbs_verified?: boolean | null
          dbs_verified_date?: string | null
          declaration_clear_since_dbs?: boolean | null
          disability_declared?: boolean | null
          drives?: boolean | null
          email?: string | null
          experience_summary?: string | null
          first_name?: string | null
          has_dbs?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_starred?: boolean
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_consent?: boolean | null
          max_commute_minutes?: number | null
          ni_number?: string | null
          notes?: string | null
          onboarding_email_sent_at?: string | null
          open_to_temp?: boolean
          paediatric_first_aid?: boolean | null
          paediatric_first_aid_expiry?: string | null
          passport_photo_url?: string | null
          payroll_consent?: boolean | null
          perm_dbs_update_service?: string | null
          perm_dbs_uptodate?: string | null
          perm_paediatric_first_aid?: string | null
          perm_safeguarding?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_fields?: string[] | null
          qualification_level?: string | null
          right_to_work_verified?: boolean | null
          right_to_work_verified_date?: string | null
          safeguarding_training?: boolean | null
          shift_types_available?: string[] | null
          source?: string | null
          status_perm?: string | null
          status_temp?: string | null
          updated_at?: string | null
          work_permit_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_rate_settings: {
        Row: {
          hourly_rate: number
          id: string
          qualification_level: string
          updated_at: string
        }
        Insert: {
          hourly_rate: number
          id?: string
          qualification_level: string
          updated_at?: string
        }
        Update: {
          hourly_rate?: number
          id?: string
          qualification_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_branches: {
        Row: {
          branch_name: string
          client_id: string
          contact_email: string | null
          contact_job_title: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          branch_name: string
          client_id: string
          contact_email?: string | null
          contact_job_title?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          branch_name?: string
          client_id?: string
          contact_email?: string | null
          contact_job_title?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_branches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          branch: string | null
          client_type: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_activity_date: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          perm_fee_percentage: number | null
          postcode: string | null
          status: string | null
          temp_rate_per_hour: number | null
          tob_document_url: string | null
          tob_signed: boolean | null
          tob_signed_date: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          branch?: string | null
          client_type?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_activity_date?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          perm_fee_percentage?: number | null
          postcode?: string | null
          status?: string | null
          temp_rate_per_hour?: number | null
          tob_document_url?: string | null
          tob_signed?: boolean | null
          tob_signed_date?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          branch?: string | null
          client_type?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_activity_date?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          perm_fee_percentage?: number | null
          postcode?: string | null
          status?: string | null
          temp_rate_per_hour?: number | null
          tob_document_url?: string | null
          tob_signed?: boolean | null
          tob_signed_date?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checklists: {
        Row: {
          ai_results: Json
          candidate_id: string | null
          character_reference: string | null
          childrens_barred_list: string | null
          compliance_completed_at: string | null
          created_at: string | null
          dbs_certificate: string | null
          dbs_update_service_check: string | null
          id: string
          item_notes: Json
          ni_number_check: string | null
          overall_status: string | null
          paediatric_first_aid_cert: string | null
          passport_photo: string | null
          proof_of_address_1: string | null
          proof_of_address_2: string | null
          proof_of_id: string | null
          qualification_certificates: string | null
          right_to_work: string | null
          safeguarding_training_cert: string | null
          updated_at: string | null
          work_reference_1: string | null
          work_reference_2: string | null
        }
        Insert: {
          ai_results?: Json
          candidate_id?: string | null
          character_reference?: string | null
          childrens_barred_list?: string | null
          compliance_completed_at?: string | null
          created_at?: string | null
          dbs_certificate?: string | null
          dbs_update_service_check?: string | null
          id?: string
          item_notes?: Json
          ni_number_check?: string | null
          overall_status?: string | null
          paediatric_first_aid_cert?: string | null
          passport_photo?: string | null
          proof_of_address_1?: string | null
          proof_of_address_2?: string | null
          proof_of_id?: string | null
          qualification_certificates?: string | null
          right_to_work?: string | null
          safeguarding_training_cert?: string | null
          updated_at?: string | null
          work_reference_1?: string | null
          work_reference_2?: string | null
        }
        Update: {
          ai_results?: Json
          candidate_id?: string | null
          character_reference?: string | null
          childrens_barred_list?: string | null
          compliance_completed_at?: string | null
          created_at?: string | null
          dbs_certificate?: string | null
          dbs_update_service_check?: string | null
          id?: string
          item_notes?: Json
          ni_number_check?: string | null
          overall_status?: string | null
          paediatric_first_aid_cert?: string | null
          passport_photo?: string | null
          proof_of_address_1?: string | null
          proof_of_address_2?: string | null
          proof_of_id?: string | null
          qualification_certificates?: string | null
          right_to_work?: string | null
          safeguarding_training_cert?: string | null
          updated_at?: string | null
          work_reference_1?: string | null
          work_reference_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklists_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          subject: string | null
          type: string | null
        }
        Insert: {
          body_html?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          subject?: string | null
          type?: string | null
        }
        Update: {
          body_html?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          subject?: string | null
          type?: string | null
        }
        Relationships: []
      }
      interview_details: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          interview_date: string | null
          interview_time: string | null
          interview_type: string | null
          interviewer_name: string | null
          location: string | null
          notes: string | null
          outcome: string | null
          outcome_notes: string | null
          pipeline_id: string
          reschedule_reason: string | null
          tag: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          interview_date?: string | null
          interview_time?: string | null
          interview_type?: string | null
          interviewer_name?: string | null
          location?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          pipeline_id: string
          reschedule_reason?: string | null
          tag?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          interview_date?: string | null
          interview_time?: string | null
          interview_type?: string | null
          interviewer_name?: string | null
          location?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          pipeline_id?: string
          reschedule_reason?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_details_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_details_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "job_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      job_pipeline: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          job_id: string | null
          notes: string | null
          stage: string | null
          stage_changed_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          stage?: string | null
          stage_changed_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          stage?: string | null
          stage_changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_pipeline_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pipeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pipeline_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          advertising_notes: string | null
          branch_id: string | null
          branch_name_override: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          filled_at: string | null
          hours: string | null
          id: string
          latitude: number | null
          location_postcode: string | null
          longitude: number | null
          notes: string | null
          posted_at: string | null
          qualification_required: string | null
          room: string | null
          salary_max: number | null
          salary_min: number | null
          source_boards: string[] | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          advertising_notes?: string | null
          branch_id?: string | null
          branch_name_override?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filled_at?: string | null
          hours?: string | null
          id?: string
          latitude?: number | null
          location_postcode?: string | null
          longitude?: number | null
          notes?: string | null
          posted_at?: string | null
          qualification_required?: string | null
          room?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source_boards?: string[] | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          advertising_notes?: string | null
          branch_id?: string | null
          branch_name_override?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filled_at?: string | null
          hours?: string | null
          id?: string
          latitude?: number | null
          location_postcode?: string | null
          longitude?: number | null
          notes?: string | null
          posted_at?: string | null
          qualification_required?: string | null
          room?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source_boards?: string[] | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          feature: string
          recruiters_can_access: boolean
          updated_at: string
        }
        Insert: {
          feature: string
          recruiters_can_access?: boolean
          updated_at?: string
        }
        Update: {
          feature?: string
          recruiters_can_access?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      placements: {
        Row: {
          candidate_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_status: string | null
          job_id: string | null
          notes: string | null
          perm_fee_amount: number | null
          perm_fee_percentage: number | null
          perm_salary: number | null
          placement_date: string | null
          placement_type: string | null
          quba_reference: string | null
          shift_id: string | null
          start_date: string | null
          temp_hours: number | null
          temp_rate: number | null
          temp_total: number | null
        }
        Insert: {
          candidate_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_status?: string | null
          job_id?: string | null
          notes?: string | null
          perm_fee_amount?: number | null
          perm_fee_percentage?: number | null
          perm_salary?: number | null
          placement_date?: string | null
          placement_type?: string | null
          quba_reference?: string | null
          shift_id?: string | null
          start_date?: string | null
          temp_hours?: number | null
          temp_rate?: number | null
          temp_total?: number | null
        }
        Update: {
          candidate_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_status?: string | null
          job_id?: string | null
          notes?: string | null
          perm_fee_amount?: number | null
          perm_fee_percentage?: number | null
          perm_salary?: number | null
          placement_date?: string | null
          placement_type?: string | null
          quba_reference?: string | null
          shift_id?: string | null
          start_date?: string | null
          temp_hours?: number | null
          temp_rate?: number | null
          temp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "placements_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "temp_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      references: {
        Row: {
          candidate_id: string | null
          candidate_position: string | null
          company_address: string | null
          company_name: string | null
          created_at: string | null
          employment_end_date: string | null
          employment_start_date: string | null
          id: string
          reason_for_leaving: string | null
          received_at: string | null
          ref_number: number | null
          ref_type: string | null
          referee_email: string | null
          referee_name: string | null
          referee_phone: string | null
          relationship_to_candidate: string | null
          requested_at: string | null
          response_additional_comments: string | null
          response_conduct_rating: string | null
          response_declaration_agreed: boolean | null
          response_disciplinary_awareness: boolean | null
          response_disciplinary_notes: string | null
          response_honesty_rating: string | null
          response_known_duration: string | null
          response_relationship: string | null
          response_signature_name: string | null
          response_submitted_at: string | null
          response_suitability_notes: string | null
          response_suitable_for_children: boolean | null
          response_teamwork_rating: string | null
          status: string | null
          unique_token: string | null
        }
        Insert: {
          candidate_id?: string | null
          candidate_position?: string | null
          company_address?: string | null
          company_name?: string | null
          created_at?: string | null
          employment_end_date?: string | null
          employment_start_date?: string | null
          id?: string
          reason_for_leaving?: string | null
          received_at?: string | null
          ref_number?: number | null
          ref_type?: string | null
          referee_email?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          relationship_to_candidate?: string | null
          requested_at?: string | null
          response_additional_comments?: string | null
          response_conduct_rating?: string | null
          response_declaration_agreed?: boolean | null
          response_disciplinary_awareness?: boolean | null
          response_disciplinary_notes?: string | null
          response_honesty_rating?: string | null
          response_known_duration?: string | null
          response_relationship?: string | null
          response_signature_name?: string | null
          response_submitted_at?: string | null
          response_suitability_notes?: string | null
          response_suitable_for_children?: boolean | null
          response_teamwork_rating?: string | null
          status?: string | null
          unique_token?: string | null
        }
        Update: {
          candidate_id?: string | null
          candidate_position?: string | null
          company_address?: string | null
          company_name?: string | null
          created_at?: string | null
          employment_end_date?: string | null
          employment_start_date?: string | null
          id?: string
          reason_for_leaving?: string | null
          received_at?: string | null
          ref_number?: number | null
          ref_type?: string | null
          referee_email?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          relationship_to_candidate?: string | null
          requested_at?: string | null
          response_additional_comments?: string | null
          response_conduct_rating?: string | null
          response_declaration_agreed?: boolean | null
          response_disciplinary_awareness?: boolean | null
          response_disciplinary_notes?: string | null
          response_honesty_rating?: string | null
          response_known_duration?: string | null
          response_relationship?: string | null
          response_signature_name?: string | null
          response_submitted_at?: string | null
          response_suitability_notes?: string | null
          response_suitable_for_children?: boolean | null
          response_teamwork_rating?: string | null
          status?: string | null
          unique_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "references_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_shortlist: {
        Row: {
          added_at: string
          booking_id: string | null
          candidate_id: string | null
          id: string
          shift_id: string | null
          status: string | null
        }
        Insert: {
          added_at?: string
          booking_id?: string | null
          candidate_id?: string | null
          id?: string
          shift_id?: string | null
          status?: string | null
        }
        Update: {
          added_at?: string
          booking_id?: string | null
          candidate_id?: string | null
          id?: string
          shift_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_shortlist_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_shortlist_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_shortlist_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "temp_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_shifts: {
        Row: {
          booking_id: string | null
          branch_id: string | null
          candidate_id: string | null
          charge_rate: number | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          latitude: number | null
          location_postcode: string | null
          longitude: number | null
          notes: string | null
          qualification_required: string | null
          quba_reference: string | null
          rate_per_hour: number | null
          shift_date: string
          shift_status: string | null
          shift_type: string | null
          start_time: string | null
          status: string | null
          total_amount: number | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          branch_id?: string | null
          candidate_id?: string | null
          charge_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          latitude?: number | null
          location_postcode?: string | null
          longitude?: number | null
          notes?: string | null
          qualification_required?: string | null
          quba_reference?: string | null
          rate_per_hour?: number | null
          shift_date: string
          shift_status?: string | null
          shift_type?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          branch_id?: string | null
          candidate_id?: string | null
          charge_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          latitude?: number | null
          location_postcode?: string | null
          longitude?: number | null
          notes?: string | null
          qualification_required?: string | null
          quba_reference?: string | null
          rate_per_hour?: number | null
          shift_date?: string
          shift_status?: string | null
          shift_type?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temp_shifts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_shifts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_shifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

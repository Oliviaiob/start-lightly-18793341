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
      candidate_applications: {
        Row: {
          applied_at: string | null
          candidate_id: string | null
          created_at: string | null
          id: string
          job_id: string | null
          job_reference: string | null
          notes: string | null
          raw_email_id: string | null
          source: string
        }
        Insert: {
          applied_at?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          job_reference?: string | null
          notes?: string | null
          raw_email_id?: string | null
          source: string
        }
        Update: {
          applied_at?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          job_reference?: string | null
          notes?: string | null
          raw_email_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_availability: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          id: string
          note: string | null
          unavailable_date: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          unavailable_date?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          unavailable_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_availability_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_availability_submissions: {
        Row: {
          candidate_id: string | null
          has_changes: boolean | null
          id: string
          submitted_at: string | null
          week_starting: string | null
        }
        Insert: {
          candidate_id?: string | null
          has_changes?: boolean | null
          id?: string
          submitted_at?: string | null
          week_starting?: string | null
        }
        Update: {
          candidate_id?: string | null
          has_changes?: boolean | null
          id?: string
          submitted_at?: string | null
          week_starting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_availability_submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_calls: {
        Row: {
          cancelled_at: string | null
          candidate_id: string | null
          created_at: string | null
          id: string
          scheduled_date: string
          scheduled_time: string
          status: string | null
        }
        Insert: {
          cancelled_at?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          scheduled_date: string
          scheduled_time: string
          status?: string | null
        }
        Update: {
          cancelled_at?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_calls_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_documents: {
        Row: {
          ai_notes: string | null
          candidate_id: string | null
          checked_at: string | null
          document_type: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          status: string | null
          uploaded_at: string | null
        }
        Insert: {
          ai_notes?: string | null
          candidate_id?: string | null
          checked_at?: string | null
          document_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          status?: string | null
          uploaded_at?: string | null
        }
        Update: {
          ai_notes?: string | null
          candidate_id?: string | null
          checked_at?: string | null
          document_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          status?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
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
      candidate_payment_details: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          candidate_id: string | null
          created_at: string | null
          id: string
          sort_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          sort_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          sort_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_payment_details_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_payslips: {
        Row: {
          candidate_id: string
          candidate_name: string | null
          created_at: string
          employer_name: string | null
          file_name: string | null
          file_size: number | null
          gross_pay: number | null
          holiday_pay: number | null
          hourly_pay: number | null
          id: string
          net_pay: number | null
          ni_deduction: number | null
          ni_number_masked: string | null
          notes: string | null
          other_deductions: number | null
          pay_period_end: string | null
          pay_period_start: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string
          payslip_date: string | null
          pdf_path: string
          tax_deduction: number | null
          tax_year: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          candidate_name?: string | null
          created_at?: string
          employer_name?: string | null
          file_name?: string | null
          file_size?: number | null
          gross_pay?: number | null
          holiday_pay?: number | null
          hourly_pay?: number | null
          id?: string
          net_pay?: number | null
          ni_deduction?: number | null
          ni_number_masked?: string | null
          notes?: string | null
          other_deductions?: number | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          payslip_date?: string | null
          pdf_path: string
          tax_deduction?: number | null
          tax_year?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          candidate_name?: string | null
          created_at?: string
          employer_name?: string | null
          file_name?: string | null
          file_size?: number | null
          gross_pay?: number | null
          holiday_pay?: number | null
          hourly_pay?: number | null
          id?: string
          net_pay?: number | null
          ni_deduction?: number | null
          ni_number_masked?: string | null
          notes?: string | null
          other_deductions?: number | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          payslip_date?: string | null
          pdf_path?: string
          tax_deduction?: number | null
          tax_year?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_payslips_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_references: {
        Row: {
          candidate_id: string | null
          candidate_position: string | null
          company_address: string | null
          company_name: string | null
          created_at: string | null
          employment_end: string | null
          employment_start: string | null
          id: string
          is_current: boolean | null
          known_since: string | null
          reason_for_leaving: string | null
          referee_email: string | null
          referee_job_title: string | null
          referee_name: string | null
          referee_phone: string | null
          reference_type: string | null
          relationship: string | null
          sort_order: number | null
        }
        Insert: {
          candidate_id?: string | null
          candidate_position?: string | null
          company_address?: string | null
          company_name?: string | null
          created_at?: string | null
          employment_end?: string | null
          employment_start?: string | null
          id?: string
          is_current?: boolean | null
          known_since?: string | null
          reason_for_leaving?: string | null
          referee_email?: string | null
          referee_job_title?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          reference_type?: string | null
          relationship?: string | null
          sort_order?: number | null
        }
        Update: {
          candidate_id?: string | null
          candidate_position?: string | null
          company_address?: string | null
          company_name?: string | null
          created_at?: string | null
          employment_end?: string | null
          employment_start?: string | null
          id?: string
          is_current?: boolean | null
          known_since?: string | null
          reason_for_leaving?: string | null
          referee_email?: string | null
          referee_job_title?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          reference_type?: string | null
          relationship?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_references_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_email: string | null
          referrer_candidate_id: string | null
          reward_amount: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_email?: string | null
          referrer_candidate_id?: string | null
          reward_amount?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_email?: string | null
          referrer_candidate_id?: string | null
          reward_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_referrals_referrer_candidate_id_fkey"
            columns: ["referrer_candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_time_off: {
        Row: {
          candidate_id: string | null
          category: string | null
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          start_date: string
          title: string
        }
        Insert: {
          candidate_id?: string | null
          category?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          title: string
        }
        Update: {
          candidate_id?: string | null
          category?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_time_off_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_weekly_availability: {
        Row: {
          all_day: boolean | null
          candidate_id: string | null
          day_of_week: string | null
          end_time: string | null
          id: string
          is_available: boolean | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          candidate_id?: string | null
          day_of_week?: string | null
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          candidate_id?: string | null
          day_of_week?: string | null
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_weekly_availability_candidate_id_fkey"
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
          additional_training: string[] | null
          address_line_1: string | null
          address_line_2: string | null
          address_line1: string | null
          address_line2: string | null
          assumed_location: string | null
          availability_grid: Json | null
          availability_notes: string | null
          availability_times: string[] | null
          availability_type: string | null
          availability_updated_at: string | null
          available_days: string[] | null
          bank_details_token: string
          candidate_type: string | null
          candidate_user_id: string | null
          career_aspiration_notes: string | null
          city: string | null
          commute_radius: string | null
          contract_agreed: boolean | null
          county: string | null
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
          dbs_status: string | null
          dbs_update_service: boolean | null
          dbs_update_service_registered: boolean | null
          dbs_verified: boolean | null
          dbs_verified_date: string | null
          declaration_clear_since_dbs: boolean | null
          declaration_ever_cautioned: boolean | null
          declaration_ever_cautioned_details: string | null
          declaration_since_dbs: boolean | null
          declaration_since_dbs_details: string | null
          disability_declared: boolean | null
          disability_notes: string | null
          drives: boolean | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          expected_salary: number | null
          experience_summary: string | null
          fields_of_work: string[] | null
          first_name: string | null
          gdpr_agreed: boolean | null
          has_dbs: boolean | null
          has_disability: boolean | null
          hourly_rate: number | null
          id: string
          is_starred: boolean
          is_unqualified: boolean | null
          languages: string[] | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          marketing_consent: boolean | null
          marketing_opt_in: boolean | null
          max_commute_minutes: number | null
          max_daily_hours: string | null
          national_insurance_number: string | null
          ni_number: string | null
          notes: string | null
          notice_period_weeks: number | null
          notif_email: boolean | null
          notif_push: boolean | null
          notif_sms: boolean | null
          onboarding_chapter: number | null
          onboarding_complete: boolean | null
          onboarding_email_sent_at: string | null
          onboarding_step: string | null
          open_to_temp: boolean
          paediatric_first_aid: boolean | null
          paediatric_first_aid_expiry: string | null
          passport_photo_url: string | null
          payroll_consent: boolean | null
          payroll_sharing_agreed: boolean | null
          perm_dbs_update_service: string | null
          perm_dbs_uptodate: string | null
          perm_paediatric_first_aid: string | null
          perm_safeguarding: string | null
          phone: string | null
          postcode: string | null
          pref_short_notice_shifts: boolean | null
          pref_weekday_shifts: boolean | null
          pref_weekend_shifts: boolean | null
          preferred_age_groups: string[] | null
          preferred_fields: string[] | null
          preferred_nursery_type: string | null
          profile_summary: string | null
          qualification_level: string | null
          qualifications_text: string | null
          recruiter_personality_notes: string | null
          requires_work_permit: boolean | null
          right_to_work_verified: boolean | null
          right_to_work_verified_date: string | null
          safeguarding_training: boolean | null
          salary_expectation_ideal: number | null
          salary_expectation_min: number | null
          shift_types_available: string[] | null
          signature_full_name: string | null
          signature_url: string | null
          source: string | null
          status_perm: string | null
          status_temp: string | null
          terms_agreed: boolean | null
          town: string | null
          updated_at: string | null
          vehicle_status: string | null
          work_permit_notes: string | null
          work_permit_required: boolean | null
        }
        Insert: {
          additional_qualifications?: string[] | null
          additional_training?: string[] | null
          address_line_1?: string | null
          address_line_2?: string | null
          address_line1?: string | null
          address_line2?: string | null
          assumed_location?: string | null
          availability_grid?: Json | null
          availability_notes?: string | null
          availability_times?: string[] | null
          availability_type?: string | null
          availability_updated_at?: string | null
          available_days?: string[] | null
          bank_details_token?: string
          candidate_type?: string | null
          candidate_user_id?: string | null
          career_aspiration_notes?: string | null
          city?: string | null
          commute_radius?: string | null
          contract_agreed?: boolean | null
          county?: string | null
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
          dbs_status?: string | null
          dbs_update_service?: boolean | null
          dbs_update_service_registered?: boolean | null
          dbs_verified?: boolean | null
          dbs_verified_date?: string | null
          declaration_clear_since_dbs?: boolean | null
          declaration_ever_cautioned?: boolean | null
          declaration_ever_cautioned_details?: string | null
          declaration_since_dbs?: boolean | null
          declaration_since_dbs_details?: string | null
          disability_declared?: boolean | null
          disability_notes?: string | null
          drives?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expected_salary?: number | null
          experience_summary?: string | null
          fields_of_work?: string[] | null
          first_name?: string | null
          gdpr_agreed?: boolean | null
          has_dbs?: boolean | null
          has_disability?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_starred?: boolean
          is_unqualified?: boolean | null
          languages?: string[] | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_consent?: boolean | null
          marketing_opt_in?: boolean | null
          max_commute_minutes?: number | null
          max_daily_hours?: string | null
          national_insurance_number?: string | null
          ni_number?: string | null
          notes?: string | null
          notice_period_weeks?: number | null
          notif_email?: boolean | null
          notif_push?: boolean | null
          notif_sms?: boolean | null
          onboarding_chapter?: number | null
          onboarding_complete?: boolean | null
          onboarding_email_sent_at?: string | null
          onboarding_step?: string | null
          open_to_temp?: boolean
          paediatric_first_aid?: boolean | null
          paediatric_first_aid_expiry?: string | null
          passport_photo_url?: string | null
          payroll_consent?: boolean | null
          payroll_sharing_agreed?: boolean | null
          perm_dbs_update_service?: string | null
          perm_dbs_uptodate?: string | null
          perm_paediatric_first_aid?: string | null
          perm_safeguarding?: string | null
          phone?: string | null
          postcode?: string | null
          pref_short_notice_shifts?: boolean | null
          pref_weekday_shifts?: boolean | null
          pref_weekend_shifts?: boolean | null
          preferred_age_groups?: string[] | null
          preferred_fields?: string[] | null
          preferred_nursery_type?: string | null
          profile_summary?: string | null
          qualification_level?: string | null
          qualifications_text?: string | null
          recruiter_personality_notes?: string | null
          requires_work_permit?: boolean | null
          right_to_work_verified?: boolean | null
          right_to_work_verified_date?: string | null
          safeguarding_training?: boolean | null
          salary_expectation_ideal?: number | null
          salary_expectation_min?: number | null
          shift_types_available?: string[] | null
          signature_full_name?: string | null
          signature_url?: string | null
          source?: string | null
          status_perm?: string | null
          status_temp?: string | null
          terms_agreed?: boolean | null
          town?: string | null
          updated_at?: string | null
          vehicle_status?: string | null
          work_permit_notes?: string | null
          work_permit_required?: boolean | null
        }
        Update: {
          additional_qualifications?: string[] | null
          additional_training?: string[] | null
          address_line_1?: string | null
          address_line_2?: string | null
          address_line1?: string | null
          address_line2?: string | null
          assumed_location?: string | null
          availability_grid?: Json | null
          availability_notes?: string | null
          availability_times?: string[] | null
          availability_type?: string | null
          availability_updated_at?: string | null
          available_days?: string[] | null
          bank_details_token?: string
          candidate_type?: string | null
          candidate_user_id?: string | null
          career_aspiration_notes?: string | null
          city?: string | null
          commute_radius?: string | null
          contract_agreed?: boolean | null
          county?: string | null
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
          dbs_status?: string | null
          dbs_update_service?: boolean | null
          dbs_update_service_registered?: boolean | null
          dbs_verified?: boolean | null
          dbs_verified_date?: string | null
          declaration_clear_since_dbs?: boolean | null
          declaration_ever_cautioned?: boolean | null
          declaration_ever_cautioned_details?: string | null
          declaration_since_dbs?: boolean | null
          declaration_since_dbs_details?: string | null
          disability_declared?: boolean | null
          disability_notes?: string | null
          drives?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expected_salary?: number | null
          experience_summary?: string | null
          fields_of_work?: string[] | null
          first_name?: string | null
          gdpr_agreed?: boolean | null
          has_dbs?: boolean | null
          has_disability?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_starred?: boolean
          is_unqualified?: boolean | null
          languages?: string[] | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_consent?: boolean | null
          marketing_opt_in?: boolean | null
          max_commute_minutes?: number | null
          max_daily_hours?: string | null
          national_insurance_number?: string | null
          ni_number?: string | null
          notes?: string | null
          notice_period_weeks?: number | null
          notif_email?: boolean | null
          notif_push?: boolean | null
          notif_sms?: boolean | null
          onboarding_chapter?: number | null
          onboarding_complete?: boolean | null
          onboarding_email_sent_at?: string | null
          onboarding_step?: string | null
          open_to_temp?: boolean
          paediatric_first_aid?: boolean | null
          paediatric_first_aid_expiry?: string | null
          passport_photo_url?: string | null
          payroll_consent?: boolean | null
          payroll_sharing_agreed?: boolean | null
          perm_dbs_update_service?: string | null
          perm_dbs_uptodate?: string | null
          perm_paediatric_first_aid?: string | null
          perm_safeguarding?: string | null
          phone?: string | null
          postcode?: string | null
          pref_short_notice_shifts?: boolean | null
          pref_weekday_shifts?: boolean | null
          pref_weekend_shifts?: boolean | null
          preferred_age_groups?: string[] | null
          preferred_fields?: string[] | null
          preferred_nursery_type?: string | null
          profile_summary?: string | null
          qualification_level?: string | null
          qualifications_text?: string | null
          recruiter_personality_notes?: string | null
          requires_work_permit?: boolean | null
          right_to_work_verified?: boolean | null
          right_to_work_verified_date?: string | null
          safeguarding_training?: boolean | null
          salary_expectation_ideal?: number | null
          salary_expectation_min?: number | null
          shift_types_available?: string[] | null
          signature_full_name?: string | null
          signature_url?: string | null
          source?: string | null
          status_perm?: string | null
          status_temp?: string | null
          terms_agreed?: boolean | null
          town?: string | null
          updated_at?: string | null
          vehicle_status?: string | null
          work_permit_notes?: string | null
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
          boolean_searches: Json | null
          branch_id: string | null
          branch_name_override: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          description_soar: string | null
          filled_at: string | null
          hours: string | null
          id: string
          job_reference: string | null
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
          boolean_searches?: Json | null
          branch_id?: string | null
          branch_name_override?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_soar?: string | null
          filled_at?: string | null
          hours?: string | null
          id?: string
          job_reference?: string | null
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
          boolean_searches?: Json | null
          branch_id?: string | null
          branch_name_override?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_soar?: string | null
          filled_at?: string | null
          hours?: string | null
          id?: string
          job_reference?: string | null
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
      messages: {
        Row: {
          candidate_id: string
          channel: string
          content: string
          created_at: string
          direction: string
          id: string
          recruiter_id: string | null
          status: string
          whatsapp_message_sid: string | null
        }
        Insert: {
          candidate_id: string
          channel?: string
          content: string
          created_at?: string
          direction: string
          id?: string
          recruiter_id?: string | null
          status?: string
          whatsapp_message_sid?: string | null
        }
        Update: {
          candidate_id?: string
          channel?: string
          content?: string
          created_at?: string
          direction?: string
          id?: string
          recruiter_id?: string | null
          status?: string
          whatsapp_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recruiter_id_fkey"
            columns: ["recruiter_id"]
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
          is_ai: boolean | null
          job_title: string | null
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
          is_ai?: boolean | null
          job_title?: string | null
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
          is_ai?: boolean | null
          job_title?: string | null
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
      shift_feedback: {
        Row: {
          booking_id: string | null
          candidate_id: string | null
          client_comment: string | null
          client_rating: number | null
          created_at: string | null
          id: string
          worker_comment: string | null
          worker_rating: number | null
        }
        Insert: {
          booking_id?: string | null
          candidate_id?: string | null
          client_comment?: string | null
          client_rating?: number | null
          created_at?: string | null
          id?: string
          worker_comment?: string | null
          worker_rating?: number | null
        }
        Update: {
          booking_id?: string | null
          candidate_id?: string | null
          client_comment?: string | null
          client_rating?: number | null
          created_at?: string | null
          id?: string
          worker_comment?: string | null
          worker_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_notifications: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          id: string
          notified: boolean | null
          shift_offer_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          notified?: boolean | null
          shift_offer_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          notified?: boolean | null
          shift_offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_notifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_notifications_shift_offer_id_fkey"
            columns: ["shift_offer_id"]
            isOneToOne: false
            referencedRelation: "shift_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_offers: {
        Row: {
          booking_group_id: string | null
          branch_id: string | null
          cancellation_within_24h: boolean | null
          cancelled_at: string | null
          candidate_id: string | null
          client_id: string | null
          confirmed_at: string | null
          created_at: string | null
          end_time: string | null
          hours: number | null
          id: string
          is_multi_day: boolean | null
          is_new: boolean | null
          notes: string | null
          pay_rate: number | null
          role: string | null
          shift_date: string | null
          start_time: string | null
          status: string | null
          visibility_expires_at: string | null
        }
        Insert: {
          booking_group_id?: string | null
          branch_id?: string | null
          cancellation_within_24h?: boolean | null
          cancelled_at?: string | null
          candidate_id?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          end_time?: string | null
          hours?: number | null
          id?: string
          is_multi_day?: boolean | null
          is_new?: boolean | null
          notes?: string | null
          pay_rate?: number | null
          role?: string | null
          shift_date?: string | null
          start_time?: string | null
          status?: string | null
          visibility_expires_at?: string | null
        }
        Update: {
          booking_group_id?: string | null
          branch_id?: string | null
          cancellation_within_24h?: boolean | null
          cancelled_at?: string | null
          candidate_id?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          end_time?: string | null
          hours?: number | null
          id?: string
          is_multi_day?: boolean | null
          is_new?: boolean | null
          notes?: string | null
          pay_rate?: number | null
          role?: string | null
          shift_date?: string | null
          start_time?: string | null
          status?: string | null
          visibility_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_offers_candidate_id_fkey"
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
          source: string | null
          status: string | null
        }
        Insert: {
          added_at?: string
          booking_id?: string | null
          candidate_id?: string | null
          id?: string
          shift_id?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          added_at?: string
          booking_id?: string | null
          candidate_id?: string | null
          id?: string
          shift_id?: string | null
          source?: string | null
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
      sos_alerts: {
        Row: {
          alert_type: string | null
          booking_id: string | null
          candidate_id: string | null
          created_at: string | null
          id: string
          resolved: boolean | null
        }
        Insert: {
          alert_type?: string | null
          booking_id?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          resolved?: boolean | null
        }
        Update: {
          alert_type?: string | null
          booking_id?: string | null
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
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
      timesheet_status_log: {
        Row: {
          changed_by: string | null
          changed_by_id: string | null
          created_at: string
          id: string
          new_status: string
          note: string | null
          previous_status: string | null
          submission_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_id?: string | null
          created_at?: string
          id?: string
          new_status: string
          note?: string | null
          previous_status?: string | null
          submission_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_id?: string | null
          created_at?: string
          id?: string
          new_status?: string
          note?: string | null
          previous_status?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_status_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "timesheet_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_submission_shifts: {
        Row: {
          break_minutes: number
          check_in: string | null
          check_out: string | null
          created_at: string
          hours_discrepancy_flagged: boolean | null
          id: string
          notes: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          shift_date: string
          shift_offer_id: string | null
          shift_status: string
          submission_id: string
          submitted_end: string | null
          submitted_start: string | null
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          hours_discrepancy_flagged?: boolean | null
          id?: string
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          shift_date: string
          shift_offer_id?: string | null
          shift_status?: string
          submission_id: string
          submitted_end?: string | null
          submitted_start?: string | null
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          hours_discrepancy_flagged?: boolean | null
          id?: string
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          shift_date?: string
          shift_offer_id?: string | null
          shift_status?: string
          submission_id?: string
          submitted_end?: string | null
          submitted_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_submission_shifts_shift_offer_id_fkey"
            columns: ["shift_offer_id"]
            isOneToOne: false
            referencedRelation: "shift_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_submission_shifts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "timesheet_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_submissions: {
        Row: {
          approval_method: string | null
          approved_at: string | null
          booking_group_id: string | null
          booking_reference: string | null
          branch_id: string | null
          candidate_confirmed: boolean
          candidate_id: string
          candidate_signature: string | null
          candidate_signed_at: string | null
          client_id: string | null
          created_at: string
          hours_discrepancy: boolean | null
          id: string
          manager_approval_token: string | null
          manager_approval_token_expires_at: string | null
          manager_email: string | null
          manager_name: string | null
          manager_position: string | null
          manager_signature: string | null
          manager_signed_at: string | null
          notes: string | null
          paid_at: string | null
          payslip_id: string | null
          pdf_url: string | null
          role: string | null
          status: string
          status_history: Json | null
          submitted_at: string | null
          total_break_minutes: number | null
          total_submitted_hours: number | null
          updated_at: string
          week_ending: string
        }
        Insert: {
          approval_method?: string | null
          approved_at?: string | null
          booking_group_id?: string | null
          booking_reference?: string | null
          branch_id?: string | null
          candidate_confirmed?: boolean
          candidate_id: string
          candidate_signature?: string | null
          candidate_signed_at?: string | null
          client_id?: string | null
          created_at?: string
          hours_discrepancy?: boolean | null
          id?: string
          manager_approval_token?: string | null
          manager_approval_token_expires_at?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_position?: string | null
          manager_signature?: string | null
          manager_signed_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payslip_id?: string | null
          pdf_url?: string | null
          role?: string | null
          status?: string
          status_history?: Json | null
          submitted_at?: string | null
          total_break_minutes?: number | null
          total_submitted_hours?: number | null
          updated_at?: string
          week_ending: string
        }
        Update: {
          approval_method?: string | null
          approved_at?: string | null
          booking_group_id?: string | null
          booking_reference?: string | null
          branch_id?: string | null
          candidate_confirmed?: boolean
          candidate_id?: string
          candidate_signature?: string | null
          candidate_signed_at?: string | null
          client_id?: string | null
          created_at?: string
          hours_discrepancy?: boolean | null
          id?: string
          manager_approval_token?: string | null
          manager_approval_token_expires_at?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_position?: string | null
          manager_signature?: string | null
          manager_signed_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payslip_id?: string | null
          pdf_url?: string | null
          role?: string | null
          status?: string
          status_history?: Json | null
          submitted_at?: string | null
          total_break_minutes?: number | null
          total_submitted_hours?: number | null
          updated_at?: string
          week_ending?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_submissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          booking_id: string | null
          break_minutes: number | null
          candidate_id: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          id: string
          manager_email: string | null
          manager_name: string | null
          manager_signature_url: string | null
          notes: string | null
          shift_date: string | null
          shift_offer_id: string | null
          signed_at: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          booking_id?: string | null
          break_minutes?: number | null
          candidate_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          id?: string
          manager_email?: string | null
          manager_name?: string | null
          manager_signature_url?: string | null
          notes?: string | null
          shift_date?: string | null
          shift_offer_id?: string | null
          signed_at?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          booking_id?: string | null
          break_minutes?: number | null
          candidate_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          id?: string
          manager_email?: string | null
          manager_name?: string | null
          manager_signature_url?: string | null
          notes?: string | null
          shift_date?: string | null
          shift_offer_id?: string | null
          signed_at?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_shift_offer_id_fkey"
            columns: ["shift_offer_id"]
            isOneToOne: false
            referencedRelation: "shift_offers"
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
      workflow_activity: {
        Row: {
          agent: string | null
          created_at: string | null
          description: string
          entity_id: string
          entity_type: string
          id: string
          item_key: string
          source: string
        }
        Insert: {
          agent?: string | null
          created_at?: string | null
          description: string
          entity_id: string
          entity_type: string
          id?: string
          item_key?: string
          source?: string
        }
        Update: {
          agent?: string | null
          created_at?: string | null
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          item_key?: string
          source?: string
        }
        Relationships: []
      }
      workflow_states: {
        Row: {
          ai_recommendation: string | null
          assigned_agent: string | null
          confidence_score: number | null
          created_at: string | null
          current_status: string
          due_status: string | null
          entity_id: string
          entity_type: string
          handover_to: string | null
          id: string
          item_key: string
          last_activity_at: string | null
          last_activity_desc: string | null
          locked_by_human: boolean
          next_action: string | null
          next_followup_at: string | null
          override_reason: string | null
          priority: number
          updated_at: string | null
          waiting_on: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          assigned_agent?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_status?: string
          due_status?: string | null
          entity_id: string
          entity_type: string
          handover_to?: string | null
          id?: string
          item_key?: string
          last_activity_at?: string | null
          last_activity_desc?: string | null
          locked_by_human?: boolean
          next_action?: string | null
          next_followup_at?: string | null
          override_reason?: string | null
          priority?: number
          updated_at?: string | null
          waiting_on?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          assigned_agent?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_status?: string
          due_status?: string | null
          entity_id?: string
          entity_type?: string
          handover_to?: string | null
          id?: string
          item_key?: string
          last_activity_at?: string | null
          last_activity_desc?: string | null
          locked_by_human?: boolean
          next_action?: string | null
          next_followup_at?: string | null
          override_reason?: string | null
          priority?: number
          updated_at?: string | null
          waiting_on?: string | null
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

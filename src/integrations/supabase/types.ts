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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          is_active: boolean
          last_login: string | null
          locked_until: string | null
          nom: string
          pin_hash: string
          prenom: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_login?: string | null
          locked_until?: string | null
          nom: string
          pin_hash: string
          prenom: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_login?: string | null
          locked_until?: string | null
          nom?: string
          pin_hash?: string
          prenom?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          attendance_note: string | null
          attendance_status: string
          attendance_updated_at: string | null
          attendance_updated_by: string | null
          created_at: string | null
          date: string
          heure_debut: string
          heure_fin: string
          id: string
          notes: string | null
          patient_id: string
          statut: string | null
          type: string
        }
        Insert: {
          attendance_note?: string | null
          attendance_status?: string
          attendance_updated_at?: string | null
          attendance_updated_by?: string | null
          created_at?: string | null
          date: string
          heure_debut: string
          heure_fin: string
          id?: string
          notes?: string | null
          patient_id: string
          statut?: string | null
          type: string
        }
        Update: {
          attendance_note?: string | null
          attendance_status?: string
          attendance_updated_at?: string | null
          attendance_updated_by?: string | null
          created_at?: string | null
          date?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          notes?: string | null
          patient_id?: string
          statut?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_attendance_events: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          appointment_id: string
          created_at: string
          event_type: string
          id: string
          note: string | null
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          appointment_id: string
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          appointment_id?: string
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          contenu: string | null
          created_at: string
          date: string
          date_debut: string | null
          date_fin: string | null
          duree_jours: number | null
          id: string
          motif: string | null
          notes: string | null
          patient_id: string
          type: string
        }
        Insert: {
          contenu?: string | null
          created_at?: string
          date?: string
          date_debut?: string | null
          date_fin?: string | null
          duree_jours?: number | null
          id?: string
          motif?: string | null
          notes?: string | null
          patient_id: string
          type: string
        }
        Update: {
          contenu?: string | null
          created_at?: string
          date?: string
          date_debut?: string | null
          date_fin?: string | null
          duree_jours?: number | null
          id?: string
          motif?: string | null
          notes?: string | null
          patient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_terms: {
        Row: {
          category_id: string | null
          code: string
          created_at: string
          label: string
          search_text: string
          source: string
          source_release: string | null
          synonyms: string[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string
          label: string
          source?: string
          source_release?: string | null
          synonyms?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string
          label?: string
          source?: string
          source_release?: string | null
          synonyms?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          diagnostic: string | null
          examen_clinique: string | null
          follow_up_decision: string
          histoire: string | null
          id: string
          motif: string | null
          patient_id: string
          plan: string | null
          queue_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          diagnostic?: string | null
          examen_clinique?: string | null
          follow_up_decision?: string
          histoire?: string | null
          id?: string
          motif?: string | null
          patient_id: string
          plan?: string | null
          queue_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          diagnostic?: string | null
          examen_clinique?: string | null
          follow_up_decision?: string
          histoire?: string | null
          id?: string
          motif?: string | null
          patient_id?: string
          plan?: string | null
          queue_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: true
            referencedRelation: "queue"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          id: string
          nom: string
          patient_id: string
          type: string
          url: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          id?: string
          nom: string
          patient_id: string
          type: string
          url: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          id?: string
          nom?: string
          patient_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          coverage_mode: string
          date: string
          id: string
          montant: number
          montant_brut: number
          consigne_reglement: string | null
          insurance_member_number: string | null
          insurance_name: string | null
          insurer_amount: number
          numero: string
          patient_id: string
          reduction_type: string
          reduction_valeur: number
          statut: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          coverage_mode?: string
          date: string
          id?: string
          montant: number
          montant_brut?: number
          consigne_reglement?: string | null
          insurance_member_number?: string | null
          insurance_name?: string | null
          insurer_amount?: number
          numero: string
          patient_id: string
          reduction_type?: string
          reduction_valeur?: number
          statut?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          coverage_mode?: string
          date?: string
          id?: string
          montant?: number
          montant_brut?: number
          consigne_reglement?: string | null
          insurance_member_number?: string | null
          insurance_name?: string | null
          insurer_amount?: number
          numero?: string
          patient_id?: string
          reduction_type?: string
          reduction_valeur?: number
          statut?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          consultation_pricing_item: boolean
          description: string
          id: string
          invoice_id: string
          line_total: number
          medical_act_template_id: string | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          consultation_pricing_item?: boolean
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          medical_act_template_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          consultation_pricing_item?: boolean
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          medical_act_template_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_medical_act_template_id_fkey"
            columns: ["medical_act_template_id"]
            isOneToOne: false
            referencedRelation: "medical_act_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payer_type: string
          payment_method: string
          received_by: string | null
          received_by_name: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payer_type: string
          payment_method: string
          received_by?: string | null
          received_by_name?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payer_type?: string
          payment_method?: string
          received_by?: string | null
          received_by_name?: string | null
          reference?: string | null
        }
        Relationships: []
      }
      follow_up_tasks: {
        Row: {
          appointment_id: string | null
          consultation_id: string
          created_at: string
          created_by: string | null
          destination: string | null
          due_date: string | null
          id: string
          instruction: string | null
          kind: string
          last_contact_at: string | null
          patient_id: string
          referral_contact_name: string | null
          referral_specialty: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          consultation_id: string
          created_at?: string
          created_by?: string | null
          destination?: string | null
          due_date?: string | null
          id?: string
          instruction?: string | null
          kind: string
          last_contact_at?: string | null
          patient_id: string
          referral_contact_name?: string | null
          referral_specialty?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          consultation_id?: string
          created_at?: string
          created_by?: string | null
          destination?: string | null
          due_date?: string | null
          id?: string
          instruction?: string | null
          kind?: string
          last_contact_at?: string | null
          patient_id?: string
          referral_contact_name?: string | null
          referral_specialty?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          allergies: string | null
          antecedents: string | null
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          traitements: string | null
          traitements_structures: Json
        }
        Insert: {
          allergies?: string | null
          antecedents?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          traitements?: string | null
          traitements_structures?: Json
        }
        Update: {
          allergies?: string | null
          antecedents?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          traitements?: string | null
          traitements_structures?: Json
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          dci: string | null
          dosage_defaut: string | null
          forme: string | null
          id: string
          nom: string
          unite: string | null
        }
        Insert: {
          created_at?: string | null
          dci?: string | null
          dosage_defaut?: string | null
          forme?: string | null
          id?: string
          nom: string
          unite?: string | null
        }
        Update: {
          created_at?: string | null
          dci?: string | null
          dosage_defaut?: string | null
          forme?: string | null
          id?: string
          nom?: string
          unite?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          adresse: string | null
          cin: string | null
          created_at: string | null
          date_naissance: string | null
          email: string | null
          id: string
          lien_personne_contact: string | null
          mutuelle: string | null
          nom: string
          numero_mutuelle: string | null
          personne_contact: string | null
          poids: number | null
          prenom: string
          sexe: string | null
          taille: number | null
          telephone: string | null
          telephone_personne_contact: string | null
        }
        Insert: {
          adresse?: string | null
          cin?: string | null
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          id?: string
          lien_personne_contact?: string | null
          mutuelle?: string | null
          nom: string
          numero_mutuelle?: string | null
          personne_contact?: string | null
          poids?: number | null
          prenom: string
          sexe?: string | null
          taille?: number | null
          telephone?: string | null
          telephone_personne_contact?: string | null
        }
        Update: {
          adresse?: string | null
          cin?: string | null
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          id?: string
          lien_personne_contact?: string | null
          mutuelle?: string | null
          nom?: string
          numero_mutuelle?: string | null
          personne_contact?: string | null
          poids?: number | null
          prenom?: string
          sexe?: string | null
          taille?: number | null
          telephone?: string | null
          telephone_personne_contact?: string | null
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          dosage: string | null
          duree: string | null
          id: string
          instructions: string | null
          medication_id: string | null
          nom_medicament: string
          ordre: number
          posologie: string
          prescription_id: string
          request_details: Json
          request_type: string
        }
        Insert: {
          dosage?: string | null
          duree?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          nom_medicament: string
          ordre?: number
          posologie: string
          prescription_id: string
          request_details?: Json
          request_type?: string
        }
        Update: {
          dosage?: string | null
          duree?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          nom_medicament?: string
          ordre?: number
          posologie?: string
          prescription_id?: string
          request_details?: Json
          request_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          patient_id: string
          prescription_type: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription_type?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      queue: {
        Row: {
          appointment_id: string | null
          called_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          invoice_id: string | null
          montant_consultation: number | null
          manual_order: number | null
          motif: string | null
          numero_ordre: number
          patient_id: string
          priority_level: string
          priority_updated_at: string | null
          priority_updated_by: string | null
          status: Database["public"]["Enums"]["queue_status"]
        }
        Insert: {
          appointment_id?: string | null
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          montant_consultation?: number | null
          manual_order?: number | null
          motif?: string | null
          numero_ordre: number
          patient_id: string
          priority_level?: string
          priority_updated_at?: string | null
          priority_updated_by?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
        }
        Update: {
          appointment_id?: string | null
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          montant_consultation?: number | null
          manual_order?: number | null
          motif?: string | null
          numero_ordre?: number
          patient_id?: string
          priority_level?: string
          priority_updated_at?: string | null
          priority_updated_by?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
        }
        Relationships: [
          {
            foreignKeyName: "queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_priority_events: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          new_priority: string
          note: string | null
          previous_priority: string
          queue_id: string
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_priority: string
          note?: string | null
          previous_priority: string
          queue_id: string
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_priority?: string
          note?: string | null
          previous_priority?: string
          queue_id?: string
        }
        Relationships: []
      }
      queue_intakes: {
        Row: {
          allergies_reported: string | null
          antecedents_reported: string | null
          created_at: string
          diastolic_bp: number | null
          height_cm: number | null
          id: string
          measured_by: string | null
          nursing_note: string | null
          oxygen_saturation: number | null
          pain_score: number | null
          pulse_bpm: number | null
          queue_id: string
          reason_for_visit: string | null
          respiratory_rate: number | null
          systolic_bp: number | null
          temperature_c: number | null
          treatments_reported: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies_reported?: string | null
          antecedents_reported?: string | null
          created_at?: string
          diastolic_bp?: number | null
          height_cm?: number | null
          id?: string
          measured_by?: string | null
          nursing_note?: string | null
          oxygen_saturation?: number | null
          pain_score?: number | null
          pulse_bpm?: number | null
          queue_id: string
          reason_for_visit?: string | null
          respiratory_rate?: number | null
          systolic_bp?: number | null
          temperature_c?: number | null
          treatments_reported?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies_reported?: string | null
          antecedents_reported?: string | null
          created_at?: string
          diastolic_bp?: number | null
          height_cm?: number | null
          id?: string
          measured_by?: string | null
          nursing_note?: string | null
          oxygen_saturation?: number | null
          pain_score?: number | null
          pulse_bpm?: number | null
          queue_id?: string
          reason_for_visit?: string | null
          respiratory_rate?: number | null
          systolic_bp?: number | null
          temperature_c?: number | null
          treatments_reported?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      medical_act_templates: {
        Row: {
          category: string
          created_at: string
          doctor_user_id: string
          id: string
          is_active: boolean
          label: string
          ngap_code: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          doctor_user_id: string
          id?: string
          is_active?: boolean
          label: string
          ngap_code?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          doctor_user_id?: string
          id?: string
          is_active?: boolean
          label?: string
          ngap_code?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_medical_act_template: {
        Args: { _actor_session_token: string; _template_id: string }
        Returns: boolean
      }
      complete_consultation: {
        Args: {
          _consultation_id: string
          _follow_up_contact_name?: string | null
          _follow_up_due_date?: string | null
          _follow_up_destination?: string | null
          _follow_up_instruction?: string | null
          _follow_up_specialty?: string | null
          _follow_up_none?: boolean
          _follow_up_type?: string | null
        }
        Returns: string
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      check_in_appointment: {
        Args: { _appointment_id: string }
        Returns: string
      }
      get_invoice_encashment_context: {
        Args: { _invoice_id: string; _actor_session_token: string }
        Returns: Json
      }
      get_medical_act_templates: {
        Args: { _actor_session_token: string }
        Returns: Json
      }
      get_queue_encashment_summary: {
        Args: { _actor_session_token: string }
        Returns: Json
      }
      get_queue_intake_context: {
        Args: { _queue_id: string; _actor_session_token: string }
        Returns: Json
      }
      set_queue_priority: {
        Args: {
          _queue_id: string
          _priority_level: string
          _actor_session_token: string
          _note?: string | null
        }
        Returns: string
      }
      reorder_queue_priority_group: {
        Args: { _ordered_queue_ids: string[]; _actor_session_token: string }
        Returns: undefined
      }
      save_structured_patient_medications: {
        Args: {
          _actor_session_token: string
          _medications: Json
          _patient_id: string
        }
        Returns: string
      }
      save_medical_act_template: {
        Args: {
          _actor_session_token: string
          _category: string
          _is_active: boolean
          _label: string
          _ngap_code: string | null
          _template_id: string | null
          _unit_price: number | null
        }
        Returns: string
      }
      check_in_appointment_with_attendance: {
        Args: { _appointment_id: string; _actor_session_token: string }
        Returns: string
      }
      record_appointment_attendance: {
        Args: {
          _appointment_id: string
          _attendance_status: string
          _actor_session_token: string
          _note?: string | null
        }
        Returns: string
      }
      save_invoice_encashment: {
        Args: {
          _invoice_id: string
          _actor_session_token: string
          _coverage_mode: string
          _insurance_name: string | null
          _insurance_member_number: string | null
          _insurer_amount: number
          _items: Json
          _payment_payer?: string | null
          _payment_amount?: number
          _payment_method?: string
          _payment_reference?: string | null
        }
        Returns: string
      }
      save_queue_intake: {
        Args: {
          _queue_id: string
          _actor_session_token: string
          _weight_kg: number | null
          _height_cm: number | null
          _temperature_c: number | null
          _systolic_bp: number | null
          _diastolic_bp: number | null
          _pulse_bpm: number | null
          _respiratory_rate: number | null
          _oxygen_saturation: number | null
          _pain_score: number | null
          _allergies_reported: string
          _antecedents_reported: string
          _treatments_reported: string
          _reason_for_visit: string
          _nursing_note: string
        }
        Returns: string
      }
      update_appointment_with_attendance: {
        Args: {
          _appointment_id: string
          _patient_id: string
          _date: string
          _heure_debut: string
          _heure_fin: string
          _type: string
          _statut: string
          _notes: string | null
          _actor_session_token: string
        }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      save_consultation_pricing: {
        Args: {
          _discount_type: string
          _discount_value: number
          _consultation_amount: number
          _settlement_instruction: string
          _queue_id: string
          _actor_session_token: string
          _items: Json
        }
        Returns: string
      }
      get_consultation_pricing_items: {
        Args: {
          _actor_session_token: string
          _queue_id: string
        }
        Returns: Json
      }
      schedule_follow_up_appointment: {
        Args: {
          _date: string
          _follow_up_id: string
          _heure_debut: string
          _heure_fin: string
        }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_app_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "medecin" | "secretaire" | "assistant"
      queue_status: "waiting" | "in_consultation" | "completed" | "cancelled"
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
      app_role: ["medecin", "secretaire", "assistant"],
      queue_status: ["waiting", "in_consultation", "completed", "cancelled"],
    },
  },
} as const

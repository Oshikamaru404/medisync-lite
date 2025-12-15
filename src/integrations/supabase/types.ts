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
      appointments: {
        Row: {
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
      documents: {
        Row: {
          created_at: string | null
          id: string
          nom: string
          patient_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nom: string
          patient_id: string
          type: string
          url: string
        }
        Update: {
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
          date: string
          id: string
          montant: number
          numero: string
          patient_id: string
          statut: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          montant: number
          numero: string
          patient_id: string
          statut?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          montant?: number
          numero?: string
          patient_id?: string
          statut?: string | null
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
      medical_records: {
        Row: {
          allergies: string | null
          antecedents: string | null
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          traitements: string | null
        }
        Insert: {
          allergies?: string | null
          antecedents?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          traitements?: string | null
        }
        Update: {
          allergies?: string | null
          antecedents?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          traitements?: string | null
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
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
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
          called_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          invoice_id: string | null
          montant_consultation: number | null
          motif: string | null
          numero_ordre: number
          patient_id: string
          status: Database["public"]["Enums"]["queue_status"]
        }
        Insert: {
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          montant_consultation?: number | null
          motif?: string | null
          numero_ordre: number
          patient_id: string
          status?: Database["public"]["Enums"]["queue_status"]
        }
        Update: {
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          montant_consultation?: number | null
          motif?: string | null
          numero_ordre?: number
          patient_id?: string
          status?: Database["public"]["Enums"]["queue_status"]
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
    }
    Enums: {
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
      queue_status: ["waiting", "in_consultation", "completed", "cancelled"],
    },
  },
} as const

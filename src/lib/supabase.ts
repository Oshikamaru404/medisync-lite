import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifoxagxzysuickngzdy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZm94YWd4enlzdWlja25nemR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTk2ODUsImV4cCI6MjA4MDA3NTY4NX0.IYOstoWmmsV8GFvuN6QtpdwaO8Q3W7ECS20jNU1n3PI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          nom: string;
          prenom: string;
          date_naissance: string | null;
          telephone: string | null;
          email: string | null;
          adresse: string | null;
          mutuelle: string | null;
          personne_contact: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          date: string;
          heure_debut: string;
          heure_fin: string;
          type: string;
          statut: 'confirmed' | 'pending' | 'cancelled' | 'completed';
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          patient_id: string;
          numero: string;
          date: string;
          montant: number;
          statut: 'paid' | 'pending' | 'cancelled';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      medical_records: {
        Row: {
          id: string;
          patient_id: string;
          antecedents: string | null;
          allergies: string | null;
          traitements: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['medical_records']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['medical_records']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          patient_id: string;
          type: string;
          nom: string;
          url: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
    };
  };
};

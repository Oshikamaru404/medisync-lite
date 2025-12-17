import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrescriptionItem {
  nom_medicament: string;
  dosage: string | null;
  posologie: string;
  duree: string | null;
  instructions: string | null;
}

interface PrescriptionRequest {
  prescription: {
    id: string;
    date: string;
    notes: string | null;
    items: PrescriptionItem[];
    patient: {
      nom: string;
      prenom: string;
      date_naissance: string | null;
      adresse: string | null;
    };
  };
  cabinet: {
    name: string;
    doctor: string;
    specialty: string;
    specialtyArabic?: string;
    specialtyIcon?: string;
    orderNumber?: string;
    address: string;
    city?: string;
    phone: string;
    email: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prescription, cabinet }: PrescriptionRequest = await req.json();

    console.log("Generating PDF for prescription:", prescription.id);

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    const calculateAge = (birthDate: string | null) => {
      if (!birthDate) return null;
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    const patientAge = calculateAge(prescription.patient.date_naissance);

    const medicationsHtml = prescription.items
      .map(
        (item, index) => `
        <div class="medication-row">
          <div class="medication-left">
            <div class="medication-name">
              <span class="medication-number">${index + 1}.</span>
              ${item.nom_medicament.toUpperCase()}${item.dosage ? ` ${item.dosage}` : ""}
            </div>
            <div class="medication-posology">${item.posologie}</div>
          </div>
          <div class="medication-duration">
            ${item.duree ? `Pendant ${item.duree}` : ""}
          </div>
        </div>
      `
      )
      .join("");

    // Get the specialty logo SVG - Professional medical logos
    const getSpecialtyLogoSvg = (iconName: string): string => {
      const logos: Record<string, string> = {
        stethoscope: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M32 28V52C32 62 40 70 50 70C60 70 68 62 68 52V28" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="50" cy="76" r="6" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <circle cx="32" cy="24" r="4" fill="currentColor"/>
          <circle cx="68" cy="24" r="4" fill="currentColor"/>
        </svg>`,
        orl: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M60 30C68 34 73 43 73 53C73 63 68 72 60 76C52 80 43 77 38 70C33 63 31 54 35 45C39 36 48 28 60 30Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M55 40C59 42 62 47 62 53C62 59 57 64 52 63C47 62 44 56 47 49C50 42 53 38 55 40Z" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="52" cy="53" r="4" fill="currentColor"/>
          <path d="M26 45C22 50 22 56 26 61" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
          <path d="M32 42C27 48 27 58 32 64" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
        </svg>`,
        cardiology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M50 75L22 47C14 39 14 27 26 20C38 13 50 26 50 26C50 26 62 13 74 20C86 27 86 39 78 47L50 75Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M25 50H38L43 38L50 62L57 44L62 50H75" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        ophthalmology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <ellipse cx="50" cy="50" rx="32" ry="20" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <circle cx="50" cy="50" r="12" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <circle cx="50" cy="50" r="5" fill="currentColor"/>
        </svg>`,
        neurology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M50 20C38 20 30 28 30 40C30 45 32 49 35 53C31 56 27 62 27 68C27 76 33 81 41 81C44 81 47 80 50 78C53 80 56 81 59 81C67 81 73 76 73 68C73 62 69 56 65 53C68 49 70 45 70 40C70 28 62 20 50 20Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M50 28V78" stroke="currentColor" stroke-width="1.5"/>
          <path d="M38 40C42 42 46 42 50 40C54 42 58 42 62 40" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M38 55C42 57 46 57 50 55C54 57 58 57 62 55" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>`,
        pediatrics: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="50" cy="42" r="18" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <circle cx="44" cy="40" r="2.5" fill="currentColor"/>
          <circle cx="56" cy="40" r="2.5" fill="currentColor"/>
          <path d="M46 48C48 51 52 51 54 48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M38 60V72C38 76 43 79 50 79C57 79 62 76 62 72V60" stroke="currentColor" stroke-width="2.5" fill="none"/>
        </svg>`,
        gynecology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="50" cy="38" r="16" stroke="currentColor" stroke-width="3" fill="none"/>
          <path d="M50 54V75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M40 65H60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>`,
        dermatology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M25 40C30 35 40 38 50 35C60 32 70 38 75 40" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M25 50C30 45 40 48 50 45C60 42 70 48 75 50" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M25 60C30 55 40 58 50 55C60 52 70 58 75 60" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="60" cy="65" r="10" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M67 72L75 80" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>`,
        orthopedics: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M35 30C31 28 28 31 30 35C32 39 35 40 36 43L50 67L64 43C65 40 68 39 70 35C72 31 69 28 65 30C61 32 60 36 58 38L50 50L42 38C40 36 39 32 35 30Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M50 67L36 77C34 79 31 78 30 75C29 72 31 70 34 70L46 68" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M50 67L64 77C66 79 69 78 70 75C71 72 69 70 66 70L54 68" stroke="currentColor" stroke-width="2.5" fill="none"/>
        </svg>`,
        gastroenterology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M35 35C35 30 40 25 50 25C60 25 70 30 70 40C70 50 65 55 60 58C55 61 50 62 50 68C50 74 55 78 50 78C45 78 40 74 40 68C40 62 35 58 32 52C29 46 30 40 35 35Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M45 40C50 42 55 42 60 40" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M42 50C47 52 53 52 58 50" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>`,
        pulmonology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M50 25V50" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M50 35L40 40C30 45 25 55 28 65C31 75 40 78 45 75C50 72 50 65 50 60" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M50 35L60 40C70 45 75 55 72 65C69 75 60 78 55 75C50 72 50 65 50 60" stroke="currentColor" stroke-width="2.5" fill="none"/>
        </svg>`,
        urology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M30 40C25 35 25 50 30 55C35 60 38 55 38 50C38 45 35 45 30 40Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M70 40C75 35 75 50 70 55C65 60 62 55 62 50C62 45 65 45 70 40Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M34 55L40 70L50 75" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M66 55L60 70L50 75" stroke="currentColor" stroke-width="2" fill="none"/>
          <ellipse cx="50" cy="75" rx="8" ry="5" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>`,
        psychiatry: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M55 25C70 28 75 40 75 50C75 60 70 70 60 75L55 75L55 80L45 80L45 75C35 72 30 62 30 50C30 38 38 25 55 25Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M40 45C42 42 45 42 48 45C51 48 54 48 57 45C60 42 63 42 65 45" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M40 55C42 52 45 52 48 55C51 58 54 58 57 55C60 52 63 52 65 55" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>`,
        endocrinology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M50 30L50 40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M35 45C35 40 42 38 50 38C58 38 65 40 65 45C65 55 58 60 50 60C42 60 35 55 35 45Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <circle cx="42" cy="48" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="58" cy="48" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M30 70C35 65 40 70 45 65C50 60 55 65 60 60C65 55 70 60 75 55" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>`,
        dentistry: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M35 35C35 28 42 25 50 25C58 25 65 28 65 35C65 45 60 48 58 55C56 62 58 75 55 75C52 75 50 65 50 65C50 65 48 75 45 75C42 75 44 62 42 55C40 48 35 45 35 35Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M42 35C45 38 48 38 50 35C52 38 55 38 58 35" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>`,
        surgery: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M30 70L55 35" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M55 35L65 28L70 33L60 40L55 35Z" fill="currentColor"/>
          <path d="M60 60L75 45" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M70 60L75 45" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="58" cy="62" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="72" cy="62" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>`,
        nephrology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M35 35C28 32 25 40 25 50C25 60 28 68 35 65C42 62 45 55 45 50C45 45 42 38 35 35Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M65 35C72 32 75 40 75 50C75 60 72 68 65 65C58 62 55 55 55 50C55 45 58 38 65 35Z" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M32 45C35 47 38 47 40 45" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M32 55C35 53 38 53 40 55" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M60 45C63 47 66 47 68 45" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M60 55C63 53 66 53 68 55" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>`,
        rheumatology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <ellipse cx="50" cy="50" rx="20" ry="12" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <path d="M25 50L30 50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <path d="M70 50L75 50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <circle cx="30" cy="50" r="6" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="70" cy="50" r="6" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M50 30L45 35M50 30L55 35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M50 70L45 65M50 70L55 65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`,
        radiology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="28" y="28" width="44" height="44" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
          <ellipse cx="50" cy="38" rx="8" ry="6" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M50 44V55" stroke="currentColor" stroke-width="3"/>
          <path d="M42 48L50 52L58 48" stroke="currentColor" stroke-width="2"/>
          <path d="M45 55L50 62L55 55" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M45 62L45 68" stroke="currentColor" stroke-width="2"/>
          <path d="M55 62L55 68" stroke="currentColor" stroke-width="2"/>
        </svg>`,
        anesthesiology: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="35" y="40" width="35" height="12" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M70 43V49" stroke="currentColor" stroke-width="2"/>
          <path d="M75 46L82 46" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M28 46L35 46" stroke="currentColor" stroke-width="2"/>
          <rect x="38" y="42" width="15" height="8" fill="currentColor" opacity="0.3"/>
          <path d="M35 60C35 65 42 72 50 72C58 72 65 65 65 60" stroke="currentColor" stroke-width="2.5" fill="none"/>
          <ellipse cx="50" cy="60" rx="12" ry="6" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>`,
      };
      return logos[iconName] || logos.stethoscope;
    };

    const specialtyLogo = getSpecialtyLogoSvg(cabinet.specialtyIcon || "stethoscope");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.4;
            color: #1a365d;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20px 30px;
            position: relative;
            background: #fff;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-bottom: 10px;
          }
          .header-left {
            text-align: left;
            flex: 1;
          }
          .header-center {
            flex: 0 0 80px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .header-center svg {
            width: 70px;
            height: 70px;
            color: #c05621;
          }
          .header-right {
            text-align: right;
            flex: 1;
            direction: rtl;
          }
          .doctor-name {
            font-size: 18px;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 3px;
          }
          .specialty {
            font-size: 13px;
            color: #2d3748;
            margin-bottom: 2px;
          }
          .order-number {
            font-size: 12px;
            color: #4a5568;
          }
          .arabic-text {
            font-size: 14px;
            color: #c05621;
            font-weight: 600;
            line-height: 1.6;
          }
          
          .patient-section {
            margin-bottom: 15px;
          }
          .patient-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 5px;
          }
          .patient-name {
            font-size: 14px;
          }
          .patient-name strong {
            font-weight: 700;
          }
          .patient-date {
            font-size: 13px;
            color: #4a5568;
          }
          
          .divider {
            display: flex;
            align-items: center;
            margin: 20px 0;
          }
          .divider-line {
            flex: 1;
            height: 2px;
            background: #1a365d;
          }
          .divider-diamond {
            width: 10px;
            height: 10px;
            background: #1a365d;
            transform: rotate(45deg);
            margin: 0 10px;
          }
          
          .title {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            color: #1a365d;
            letter-spacing: 3px;
            margin: 25px 0 35px 0;
            text-transform: uppercase;
          }
          
          .medications {
            margin-bottom: 40px;
            min-height: 300px;
          }
          .medication-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-left: 30px;
          }
          .medication-left {
            flex: 1;
          }
          .medication-name {
            font-size: 14px;
            font-weight: 500;
            color: #1a365d;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .medication-number {
            font-weight: 700;
            margin-right: 15px;
            display: inline-block;
            min-width: 25px;
          }
          .medication-posology {
            font-size: 13px;
            font-weight: 700;
            color: #1a365d;
            margin-left: 40px;
          }
          .medication-duration {
            font-size: 13px;
            font-weight: 600;
            color: #1a365d;
            white-space: nowrap;
          }
          
          .notes {
            background-color: #f7fafc;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 3px solid #1a365d;
          }
          .notes-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #1a365d;
          }
          .notes-content {
            color: #4a5568;
            font-size: 13px;
          }
          
          .footer {
            position: absolute;
            bottom: 20px;
            left: 30px;
            right: 30px;
          }
          .footer-divider {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          .footer-line {
            flex: 1;
            height: 1px;
            background: #1a365d;
          }
          .footer-circle {
            width: 8px;
            height: 8px;
            border: 2px solid #1a365d;
            border-radius: 50%;
            margin: 0 5px;
          }
          .footer-warning {
            text-align: center;
            font-size: 11px;
            color: #c05621;
            margin-bottom: 10px;
            direction: rtl;
          }
          .footer-contact {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #4a5568;
          }
          .contact-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div class="doctor-name">Dr ${cabinet.doctor}</div>
            <div class="specialty">${cabinet.specialty}</div>
            ${cabinet.orderNumber ? `<div class="order-number">N° d'ordre : ${cabinet.orderNumber}</div>` : ""}
          </div>
          <div class="header-center">
            ${specialtyLogo}
          </div>
          <div class="header-right">
            ${cabinet.specialtyArabic ? `<div class="arabic-text">${cabinet.specialtyArabic}</div>` : ""}
          </div>
        </div>

        <div class="patient-section">
          <div class="patient-row">
            <div class="patient-name">Nom & Prénom : <strong>${prescription.patient.prenom} ${prescription.patient.nom}</strong></div>
            <div class="patient-date">${cabinet.city ? `${cabinet.city}, le : ` : "Le : "}${formatDate(prescription.date)}</div>
          </div>
          ${patientAge ? `<div class="patient-name">Age : ${patientAge} ans</div>` : ""}
        </div>

        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-diamond"></div>
          <div class="divider-line"></div>
        </div>

        <div class="title">ORDONNANCE</div>

        <div class="medications">
          ${medicationsHtml}
        </div>

        ${prescription.notes ? `
        <div class="notes">
          <div class="notes-title">Recommandations :</div>
          <div class="notes-content">${prescription.notes}</div>
        </div>
        ` : ""}

        <div class="footer">
          <div class="footer-divider">
            <div class="footer-circle"></div>
            <div class="footer-line"></div>
            <div class="footer-circle"></div>
          </div>
          <div class="footer-warning">لا تتركوا الأدوية في متناول الأطفال</div>
          <div class="footer-contact">
            <div class="contact-item">
              ${cabinet.email ? `✉ ${cabinet.email}` : ""}
            </div>
            <div class="contact-item">
              ${cabinet.phone ? `📞 ${cabinet.phone}` : ""}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    const base64Html = btoa(String.fromCharCode(...htmlBytes));

    console.log("PDF HTML generated successfully");

    return new Response(
      JSON.stringify({ 
        html: html,
        pdf: base64Html,
        success: true 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating prescription PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

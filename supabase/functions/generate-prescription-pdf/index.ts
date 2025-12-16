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
            ${item.duree ? `QSP ${item.duree}` : ""}
          </div>
        </div>
      `
      )
      .join("");

    // Get the specialty logo SVG
    const getSpecialtyLogoSvg = (iconName: string): string => {
      const logos: Record<string, string> = {
        ear: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M65 20C75 25 82 38 82 52C82 66 75 78 65 85C55 92 42 88 35 78C28 68 25 55 30 42C35 29 48 18 65 20Z" stroke="currentColor" stroke-width="4" fill="none"/>
          <path d="M55 35C60 38 65 45 65 55C65 65 58 72 50 70C42 68 38 58 42 48C46 38 50 32 55 35Z" stroke="currentColor" stroke-width="3" fill="none"/>
          <circle cx="50" cy="55" r="5" fill="currentColor"/>
        </svg>`,
        stethoscope: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30 20V45C30 60 40 70 55 70C70 70 80 60 80 45V20" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="55" cy="78" r="8" stroke="currentColor" stroke-width="3" fill="none"/>
          <circle cx="30" cy="15" r="5" fill="currentColor"/>
          <circle cx="80" cy="15" r="5" fill="currentColor"/>
        </svg>`,
        "heart-pulse": `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 85L15 50C5 40 5 25 20 15C35 5 50 20 50 20C50 20 65 5 80 15C95 25 95 40 85 50L50 85Z" stroke="currentColor" stroke-width="4" fill="none"/>
          <path d="M20 50H35L40 35L50 65L60 45L65 50H80" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        eye: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="50" rx="40" ry="25" stroke="currentColor" stroke-width="4" fill="none"/>
          <circle cx="50" cy="50" r="15" stroke="currentColor" stroke-width="3" fill="none"/>
          <circle cx="50" cy="50" r="6" fill="currentColor"/>
        </svg>`,
        brain: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 15C35 15 25 25 25 40C25 45 27 50 30 55C25 58 20 65 20 72C20 82 28 88 38 88C42 88 46 87 50 85C54 87 58 88 62 88C72 88 80 82 80 72C80 65 75 58 70 55C73 50 75 45 75 40C75 25 65 15 50 15Z" stroke="currentColor" stroke-width="4" fill="none"/>
          <path d="M50 25V85" stroke="currentColor" stroke-width="2"/>
        </svg>`,
        baby: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="40" r="25" stroke="currentColor" stroke-width="4" fill="none"/>
          <circle cx="42" cy="38" r="3" fill="currentColor"/>
          <circle cx="58" cy="38" r="3" fill="currentColor"/>
          <path d="M44 48C46 52 54 52 56 48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M35 65V80C35 85 42 88 50 88C58 88 65 85 65 80V65" stroke="currentColor" stroke-width="4" fill="none"/>
        </svg>`,
        heart: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 85L15 50C5 40 5 25 20 15C35 5 50 20 50 20C50 20 65 5 80 15C95 25 95 40 85 50L50 85Z" stroke="currentColor" stroke-width="4" fill="none"/>
        </svg>`,
        bone: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 25C20 20 15 25 15 32C15 38 20 40 22 42L58 78C60 80 62 85 68 85C75 85 80 80 75 75" stroke="currentColor" stroke-width="4" fill="none"/>
          <circle cx="20" cy="28" r="6" stroke="currentColor" stroke-width="3" fill="none"/>
          <circle cx="28" cy="20" r="6" stroke="currentColor" stroke-width="3" fill="none"/>
        </svg>`,
        smile: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="4" fill="none"/>
          <circle cx="38" cy="42" r="4" fill="currentColor"/>
          <circle cx="62" cy="42" r="4" fill="currentColor"/>
          <path d="M35 60C40 70 60 70 65 60" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
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
            <div class="doctor-name">${cabinet.doctor}</div>
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

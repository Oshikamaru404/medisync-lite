import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CertificateRequest {
  certificate: {
    id: string;
    type: 'repos' | 'aptitude' | 'bonne_sante' | 'custom';
    date: string;
    duree_jours: number | null;
    date_debut: string | null;
    date_fin: string | null;
    motif: string | null;
    contenu: string | null;
    patient?: {
      nom: string;
      prenom: string;
      date_naissance: string | null;
      adresse: string | null;
    };
  };
  settings: {
    doctorName: string;
    doctorNameArabic?: string;
    specialty: string;
    cabinetName: string;
    cabinetAddress: string;
    cabinetPhone: string;
    customLogo?: string;
  };
}

const CERTIFICATE_TYPES = {
  repos: {
    label: 'Certificat de Repos Médical',
    labelAr: 'شهادة راحة طبية',
  },
  aptitude: {
    label: "Certificat d'Aptitude",
    labelAr: 'شهادة القدرة',
  },
  bonne_sante: {
    label: 'Certificat de Bonne Santé',
    labelAr: 'شهادة صحية',
  },
  custom: {
    label: 'Certificat Médical',
    labelAr: 'شهادة طبية',
  },
};

const SPECIALTIES: Record<string, { nameFrLong: string; nameAr: string }> = {
  general: { nameFrLong: "Spécialiste en Médecine Générale", nameAr: "أخصائي في الطب العام" },
  orl: { nameFrLong: "Spécialiste en Oto-Rhino-Laryngologie", nameAr: "أخصائي في طب و جراحة الأذن، الأنف و الحنجرة" },
  cardiology: { nameFrLong: "Spécialiste en Cardiologie et Maladies Vasculaires", nameAr: "أخصائي في أمراض القلب والشرايين" },
  dermatology: { nameFrLong: "Spécialiste en Dermatologie et Vénérologie", nameAr: "أخصائي في الأمراض الجلدية والتناسلية" },
  ophthalmology: { nameFrLong: "Spécialiste en Ophtalmologie", nameAr: "أخصائي في طب وجراحة العيون" },
  pediatrics: { nameFrLong: "Spécialiste en Pédiatrie", nameAr: "أخصائي في طب الأطفال" },
  gynecology: { nameFrLong: "Spécialiste en Gynécologie-Obstétrique", nameAr: "أخصائي في أمراض النساء والتوليد" },
  neurology: { nameFrLong: "Spécialiste en Neurologie", nameAr: "أخصائي في طب الأعصاب" },
  orthopedics: { nameFrLong: "Spécialiste en Chirurgie Orthopédique et Traumatologique", nameAr: "أخصائي في جراحة العظام والمفاصل" },
  gastroenterology: { nameFrLong: "Spécialiste en Gastro-Entérologie et Hépatologie", nameAr: "أخصائي في أمراض الجهاز الهضمي والكبد" },
  pulmonology: { nameFrLong: "Spécialiste en Pneumologie", nameAr: "أخصائي في أمراض الرئة والجهاز التنفسي" },
  urology: { nameFrLong: "Spécialiste en Urologie", nameAr: "أخصائي في طب وجراحة المسالك البولية" },
  psychiatry: { nameFrLong: "Spécialiste en Psychiatrie", nameAr: "أخصائي في الطب النفسي" },
  rheumatology: { nameFrLong: "Spécialiste en Rhumatologie", nameAr: "أخصائي في أمراض المفاصل والروماتيزم" },
  endocrinology: { nameFrLong: "Spécialiste en Endocrinologie, Diabétologie et Maladies Métaboliques", nameAr: "أخصائي في أمراض الغدد الصماء والسكري" },
  nephrology: { nameFrLong: "Spécialiste en Néphrologie", nameAr: "أخصائي في أمراض الكلى" },
  surgery: { nameFrLong: "Spécialiste en Chirurgie Générale", nameAr: "أخصائي في الجراحة العامة" },
  dentistry: { nameFrLong: "Chirurgien Dentiste", nameAr: "طبيب جراح الأسنان" },
  radiology: { nameFrLong: "Spécialiste en Radiologie et Imagerie Médicale", nameAr: "أخصائي في الأشعة التشخيصية" },
  anesthesiology: { nameFrLong: "Spécialiste en Anesthésie-Réanimation", nameAr: "أخصائي في التخدير والإنعاش" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { certificate, settings }: CertificateRequest = await req.json();

    console.log("Generating PDF for certificate:", certificate.id, "type:", certificate.type);

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return date.toLocaleDateString("fr-FR", options);
    };

    const certType = CERTIFICATE_TYPES[certificate.type] || CERTIFICATE_TYPES.custom;
    const specialtyData = SPECIALTIES[settings.specialty] || SPECIALTIES.general;
    const patientName = certificate.patient 
      ? `${certificate.patient.prenom} ${certificate.patient.nom}`.toUpperCase() 
      : "PATIENT";
    const patientBirthDate = certificate.patient?.date_naissance 
      ? formatDate(certificate.patient.date_naissance) 
      : null;
    const patientAddress = certificate.patient?.adresse || "";
    const certDate = formatDate(certificate.date);

    // Generate certificate content based on type
    let contentHtml = '';
    switch (certificate.type) {
      case 'repos':
        const dateDebut = certificate.date_debut ? formatDate(certificate.date_debut) : certDate;
        const dateFin = certificate.date_fin ? formatDate(certificate.date_fin) : null;
        contentHtml = `
          <p class="content-paragraph">
            Je soussigné, <strong>${settings.doctorName}</strong>, ${specialtyData.nameFrLong}, 
            certifie avoir examiné ce jour ${patientBirthDate ? 'M./Mme' : ''} <strong>${patientName}</strong>${patientBirthDate ? `, né(e) le ${patientBirthDate}` : ''}.
          </p>
          <p class="content-paragraph">
            L'état de santé de l'intéressé(e) nécessite un repos médical de 
            <strong>${certificate.duree_jours} jour${certificate.duree_jours && certificate.duree_jours > 1 ? 's' : ''}</strong>,
            du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong> inclus.
          </p>
          ${certificate.motif ? `<p class="content-paragraph" style="font-size: 11pt;">Motif : ${certificate.motif}</p>` : ''}
        `;
        break;
      
      case 'aptitude':
        contentHtml = `
          <p class="content-paragraph">
            Je soussigné, <strong>${settings.doctorName}</strong>, ${specialtyData.nameFrLong}, 
            certifie avoir examiné ce jour M./Mme <strong>${patientName}</strong>${patientBirthDate ? `, né(e) le ${patientBirthDate}` : ''}.
          </p>
          <p class="content-paragraph">
            Après examen clinique complet, je certifie que l'intéressé(e) est 
            <strong>apte</strong> à ${certificate.motif || "la pratique sportive"}.
          </p>
          <p class="content-paragraph" style="font-size: 11pt;">
            Ce certificat est valable pour une durée d'un an à compter de sa date d'établissement.
          </p>
        `;
        break;
      
      case 'bonne_sante':
        contentHtml = `
          <p class="content-paragraph">
            Je soussigné, <strong>${settings.doctorName}</strong>, ${specialtyData.nameFrLong}, 
            certifie avoir examiné ce jour M./Mme <strong>${patientName}</strong>${patientBirthDate ? `, né(e) le ${patientBirthDate}` : ''}${patientAddress ? `, demeurant à ${patientAddress}` : ''}.
          </p>
          <p class="content-paragraph">
            L'examen clinique de ce jour ne révèle aucune anomalie apparente.
            L'intéressé(e) est en <strong>bonne santé apparente</strong>.
          </p>
        `;
        break;
      
      case 'custom':
        contentHtml = `
          <div class="custom-content">
            ${(certificate.contenu || "Contenu du certificat personnalisé").replace(/\n/g, '<br/>')}
          </div>
        `;
        break;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            background: white;
          }
          
          .certificate {
            padding: 20px;
            min-height: 100vh;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 2px solid #1e40af;
            margin-bottom: 40px;
          }
          
          .header-left {
            text-align: left;
          }
          
          .header-right {
            text-align: right;
            direction: rtl;
          }
          
          .doctor-name {
            font-size: 18pt;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .specialty {
            font-size: 11pt;
            color: #c05621;
          }
          
          .title-section {
            text-align: center;
            margin: 40px 0;
          }
          
          .title {
            font-size: 22pt;
            font-weight: bold;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
          }
          
          .title-arabic {
            font-size: 18pt;
            color: #1e40af;
            font-family: 'Arial', sans-serif;
            direction: rtl;
          }
          
          .content {
            text-align: justify;
            margin: 40px 20px;
            font-size: 13pt;
            line-height: 2;
          }
          
          .content-paragraph {
            margin-bottom: 20px;
          }
          
          .custom-content {
            white-space: pre-wrap;
            line-height: 1.8;
          }
          
          .signature-section {
            text-align: right;
            margin-top: 60px;
            padding-right: 40px;
          }
          
          .signature-location {
            margin-bottom: 10px;
          }
          
          .signature-name {
            font-weight: bold;
            margin-top: 40px;
          }
          
          .signature-specialty {
            font-size: 10pt;
            color: #666;
          }
          
          .signature-line {
            border-top: 1px solid #666;
            width: 180px;
            margin-left: auto;
            margin-top: 60px;
            padding-top: 8px;
          }
          
          .signature-label {
            font-size: 9pt;
            color: #666;
          }
          
          .footer {
            position: absolute;
            bottom: 30px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            margin: 0 20px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="header-left">
              <div class="doctor-name">${settings.doctorName}</div>
              <div class="specialty">${specialtyData.nameFrLong}</div>
            </div>
            <div class="header-right">
              ${settings.doctorNameArabic ? `<div class="doctor-name">${settings.doctorNameArabic}</div>` : ''}
              <div class="specialty">${specialtyData.nameAr}</div>
            </div>
          </div>
          
          <div class="title-section">
            <div class="title">${certType.label}</div>
            <div class="title-arabic">${certType.labelAr}</div>
          </div>
          
          <div class="content">
            ${contentHtml}
          </div>
          
          <div class="signature-section">
            <div class="signature-location">Fait à ${settings.cabinetAddress?.split(',')[0] || 'notre cabinet'}, le ${certDate}</div>
            <div class="signature-name">${settings.doctorName}</div>
            <div class="signature-specialty">${specialtyData.nameFrLong}</div>
            <div class="signature-line">
              <span class="signature-label">Signature et cachet</span>
            </div>
          </div>
          
          <div class="footer">
            <p>${settings.cabinetName} - ${settings.cabinetAddress}</p>
            ${settings.cabinetPhone ? `<p>Tél: ${settings.cabinetPhone}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    // Use a PDF generation service
    const pdfResponse = await fetch("https://api.pdflayer.com/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        access_key: Deno.env.get("PDFLAYER_API_KEY") || "",
        document_html: html,
        page_size: "A4",
        margin_top: "15",
        margin_bottom: "15",
        margin_left: "20",
        margin_right: "20",
      }),
    });

    // If pdflayer fails, use alternative method with base64 HTML
    if (!pdfResponse.ok) {
      console.log("PDFLayer not available, returning HTML for client-side conversion");
      
      // Return base64 encoded HTML that can be converted client-side
      const base64Html = btoa(unescape(encodeURIComponent(html)));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          html: base64Html,
          message: "Use client-side PDF generation"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log("PDF generated successfully for certificate:", certificate.id);

    return new Response(
      JSON.stringify({ pdf: pdfBase64, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error generating certificate PDF:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

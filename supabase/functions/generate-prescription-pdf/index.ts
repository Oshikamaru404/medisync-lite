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
    address: string;
    phone: string;
    email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prescription, cabinet }: PrescriptionRequest = await req.json();

    console.log("Generating PDF for prescription:", prescription.id);

    // Format date
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    // Calculate birth info
    const birthInfo = prescription.patient.date_naissance
      ? `Né(e) le ${formatDate(prescription.patient.date_naissance)}`
      : "";

    // Build medications HTML
    const medicationsHtml = prescription.items
      .map(
        (item, index) => `
        <div style="margin-bottom: 20px; padding-left: 20px; border-left: 3px solid #2563eb;">
          <div style="font-size: 16px;">
            <strong>${index + 1}. ${item.nom_medicament}</strong>
            ${item.dosage ? `<span style="color: #6b7280;"> (${item.dosage})</span>` : ""}
          </div>
          <div style="margin-left: 20px; margin-top: 5px;">
            <div>${item.posologie}</div>
            ${item.duree ? `<div style="color: #6b7280;">Durée : ${item.duree}</div>` : ""}
            ${item.instructions ? `<div style="color: #6b7280; font-style: italic;">${item.instructions}</div>` : ""}
          </div>
        </div>
      `
      )
      .join("");

    // Build complete HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
          }
          .cabinet-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .doctor-name {
            font-size: 18px;
            font-weight: 500;
          }
          .specialty {
            color: #6b7280;
          }
          .contact {
            text-align: right;
            font-size: 12px;
            color: #6b7280;
          }
          .patient-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #2563eb;
            margin-bottom: 30px;
          }
          .medications {
            margin-bottom: 30px;
          }
          .notes {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .notes-title {
            font-weight: 500;
            margin-bottom: 5px;
          }
          .signature {
            text-align: right;
            margin-top: 60px;
          }
          .signature-label {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 80px;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="cabinet-name">${cabinet.name}</div>
            <div class="doctor-name">${cabinet.doctor}</div>
            <div class="specialty">${cabinet.specialty}</div>
          </div>
          <div class="contact">
            ${cabinet.address ? `<div>📍 ${cabinet.address}</div>` : ""}
            ${cabinet.phone ? `<div>📞 ${cabinet.phone}</div>` : ""}
            ${cabinet.email ? `<div>✉️ ${cabinet.email}</div>` : ""}
          </div>
        </div>

        <div class="patient-info">
          <div>
            <div style="font-size: 12px; color: #6b7280;">Patient</div>
            <div style="font-size: 18px; font-weight: 600;">
              ${prescription.patient.prenom} ${prescription.patient.nom}
            </div>
            ${birthInfo ? `<div style="font-size: 12px; color: #6b7280;">${birthInfo}</div>` : ""}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #6b7280;">Date</div>
            <div style="font-weight: 600;">${formatDate(prescription.date)}</div>
          </div>
        </div>

        <div class="title">ORDONNANCE MÉDICALE</div>

        <div class="medications">
          ${medicationsHtml}
        </div>

        ${
          prescription.notes
            ? `
        <div class="notes">
          <div class="notes-title">Recommandations :</div>
          <div style="color: #6b7280;">${prescription.notes}</div>
        </div>
        `
            : ""
        }

        <div class="signature">
          <div class="signature-label">Signature et cachet</div>
          <div style="font-weight: 500;">${cabinet.doctor}</div>
        </div>

        <div class="footer">
          Cette ordonnance est valable 3 mois à compter de sa date d'émission
        </div>
      </body>
      </html>
    `;

    // Use a simple HTML to PDF approach - return HTML for now
    // In production, you could use a service like Puppeteer, jsPDF, or an external API
    
    // For now, return HTML that can be converted to PDF client-side or printed
    // We'll encode the HTML as base64 for download
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    const base64Html = btoa(String.fromCharCode(...htmlBytes));

    console.log("PDF HTML generated successfully");

    return new Response(
      JSON.stringify({ 
        html: html,
        pdf: base64Html, // This is actually HTML encoded, client can use it for print
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

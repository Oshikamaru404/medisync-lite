import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Certificate, CERTIFICATE_TYPES } from "@/hooks/useCertificates";
import { useSettings } from "@/hooks/useSettings";
import { MEDICAL_SPECIALTIES, SPECIALTY_LOGOS } from "@/data/specialties";

interface CertificatePreviewProps {
  certificate: Certificate;
  scale?: number;
}

export const CertificatePreview = ({ certificate, scale = 1 }: CertificatePreviewProps) => {
  const { getSettingValue } = useSettings();

  const doctorName = getSettingValue("doctor_name") || "Dr. Nom du Médecin";
  const doctorNameArabic = getSettingValue("doctor_name_arabic") || "";
  const specialty = getSettingValue("specialty") || "orl";
  const specialtyData = MEDICAL_SPECIALTIES.find(s => s.id === specialty) || MEDICAL_SPECIALTIES[0];
  const cabinetName = getSettingValue("cabinet_name") || "Cabinet Médical";
  const cabinetAddress = getSettingValue("cabinet_address") || "Adresse du cabinet";
  const cabinetPhone = getSettingValue("cabinet_phone") || "";
  const customLogo = getSettingValue("custom_logo");
  
  const specialtyIcon = SPECIALTY_LOGOS[specialtyData.icon] || SPECIALTY_LOGOS['stethoscope'];

  const patientName = certificate.patient 
    ? `${certificate.patient.prenom} ${certificate.patient.nom}`.toUpperCase()
    : "PATIENT";
  
  const patientBirthDate = certificate.patient?.date_naissance
    ? format(parseISO(certificate.patient.date_naissance), "dd/MM/yyyy")
    : null;
  
  const patientAddress = certificate.patient?.adresse || "";

  const certType = CERTIFICATE_TYPES[certificate.type as keyof typeof CERTIFICATE_TYPES];
  const certDate = format(parseISO(certificate.date), "d MMMM yyyy", { locale: fr });

  // Generate certificate content based on type
  const getCertificateContent = () => {
    switch (certificate.type) {
      case 'repos':
        const dateDebut = certificate.date_debut 
          ? format(parseISO(certificate.date_debut), "d MMMM yyyy", { locale: fr })
          : certDate;
        const dateFin = certificate.date_fin
          ? format(parseISO(certificate.date_fin), "d MMMM yyyy", { locale: fr })
          : null;
        return (
          <>
            <p className="mb-4">
              Je soussigné, <strong>{doctorName}</strong>, {specialtyData.nameFrLong}, 
              certifie avoir examiné ce jour {patientBirthDate ? `M./Mme` : ''} <strong>{patientName}</strong>
              {patientBirthDate && <>, né(e) le {patientBirthDate}</>}.
            </p>
            <p className="mb-4">
              L'état de santé de l'intéressé(e) nécessite un repos médical de{' '}
              <strong>{certificate.duree_jours} jour{certificate.duree_jours && certificate.duree_jours > 1 ? 's' : ''}</strong>,
              {' '}du <strong>{dateDebut}</strong> au <strong>{dateFin}</strong> inclus.
            </p>
            {certificate.motif && (
              <p className="mb-4 text-sm">Motif : {certificate.motif}</p>
            )}
          </>
        );
      
      case 'aptitude':
        return (
          <>
            <p className="mb-4">
              Je soussigné, <strong>{doctorName}</strong>, {specialtyData.nameFrLong}, 
              certifie avoir examiné ce jour M./Mme <strong>{patientName}</strong>
              {patientBirthDate && <>, né(e) le {patientBirthDate}</>}.
            </p>
            <p className="mb-4">
              Après examen clinique complet, je certifie que l'intéressé(e) est{' '}
              <strong>apte</strong> à {certificate.motif || "la pratique sportive"}.
            </p>
            <p className="mb-4 text-sm">
              Ce certificat est valable pour une durée d'un an à compter de sa date d'établissement.
            </p>
          </>
        );
      
      case 'bonne_sante':
        return (
          <>
            <p className="mb-4">
              Je soussigné, <strong>{doctorName}</strong>, {specialtyData.nameFrLong}, 
              certifie avoir examiné ce jour M./Mme <strong>{patientName}</strong>
              {patientBirthDate && <>, né(e) le {patientBirthDate}</>}
              {patientAddress && <>, demeurant à {patientAddress}</>}.
            </p>
            <p className="mb-4">
              L'examen clinique de ce jour ne révèle aucune anomalie apparente.
              L'intéressé(e) est en <strong>bonne santé apparente</strong>.
            </p>
          </>
        );
      
      case 'custom':
        return (
          <div className="whitespace-pre-wrap">
            {certificate.contenu || "Contenu du certificat personnalisé"}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div 
      className="bg-white text-black p-8 shadow-lg border"
      style={{ 
        width: 210 * scale * 3.78, // A4 width in mm * scale * mm to px
        minHeight: 297 * scale * 3.78 * 0.7, // A4 height * scale * 70%
        fontFamily: "'Times New Roman', serif",
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-300">
        {/* Left - Doctor Info French */}
        <div className="text-left">
          <div className="flex items-center gap-3">
          {customLogo ? (
              <img src={customLogo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div 
                className="w-16 h-16 flex items-center justify-center text-primary"
                dangerouslySetInnerHTML={{ __html: specialtyIcon }}
              />
            )}
            <div>
              <p className="text-xl font-bold" style={{ color: '#2563eb' }}>{doctorName}</p>
              <p className="text-sm" style={{ color: '#c05621' }}>{specialtyData.nameFrLong}</p>
            </div>
          </div>
        </div>

        {/* Right - Arabic */}
        <div className="text-right" dir="rtl">
          {doctorNameArabic && (
            <p className="text-xl font-bold" style={{ color: '#2563eb' }}>{doctorNameArabic}</p>
          )}
          <p className="text-sm" style={{ color: '#c05621' }}>{specialtyData.nameAr}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ color: '#1e40af' }}>
          {certType.label}
        </h1>
        <p className="text-lg mt-1" style={{ color: '#1e40af', fontFamily: "'Arial', sans-serif" }} dir="rtl">
          {certType.labelAr}
        </p>
      </div>

      {/* Content */}
      <div className="text-justify leading-relaxed text-base mb-8 px-4">
        {getCertificateContent()}
      </div>

      {/* Footer */}
      <div className="text-right mt-12 pr-8">
        <p className="mb-2">Fait à {cabinetAddress.split(',')[0] || 'notre cabinet'}, le {certDate}</p>
        <div className="mt-8">
          <p className="font-semibold">{doctorName}</p>
          <p className="text-sm text-gray-600">{specialtyData.nameFrLong}</p>
        </div>
        <div className="mt-16 border-t border-gray-400 pt-2 w-48 ml-auto">
          <p className="text-xs text-gray-500">Signature et cachet</p>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500 border-t pt-4 mx-8">
        <p>{cabinetName} - {cabinetAddress}</p>
        {cabinetPhone && <p>Tél: {cabinetPhone}</p>}
      </div>
    </div>
  );
};

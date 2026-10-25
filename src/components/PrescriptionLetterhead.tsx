import { getSpecialtyLogo } from "@/data/specialties";

export interface PrescriptionLetterheadProps {
  doctorName: string;
  specialty: string;
  orderNumber: string;
  doctorNameArabic: string;
  specialtyArabic: string;
  specialtyIcon: string;
  customLogo: string;
  className?: string;
}

export const PrescriptionLetterhead = ({
  doctorName,
  specialty,
  orderNumber,
  doctorNameArabic,
  specialtyArabic,
  specialtyIcon,
  customLogo,
  className,
}: PrescriptionLetterheadProps) => (
  <div className={`prescription-header relative mb-2 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1.5 border-b-2 border-[#dce9e1] pb-2 before:absolute before:bottom-[-2px] before:left-0 before:h-0.5 before:w-16 before:bg-[#32745a] ${className ?? ""}`}>
    <div className="min-w-0 text-center">
      <h1 className="prescription-header-name text-base font-bold leading-tight" style={{ color: "#1a365d" }}>Dr {doctorName || "—"}</h1>
      <p className="prescription-header-detail mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: "#32745a" }}>{specialty || "Spécialité"}</p>
      {orderNumber && <p className="prescription-header-detail mt-0.5 text-[8px] leading-tight text-gray-500">N° d’ordre : {orderNumber}</p>}
    </div>
    <div className="prescription-header-logo mx-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-[#e4eee7] bg-[#f5faf6] p-1">
      {customLogo ? (
        <img src={customLogo} alt="Logo du cabinet" className="h-full w-full object-contain" />
      ) : (
        <div
          className="h-full w-full"
          style={{ color: "#32745a" }}
          dangerouslySetInnerHTML={{ __html: getSpecialtyLogo(specialtyIcon || "stethoscope") }}
        />
      )}
    </div>
    <div className="min-w-0 text-center" style={{ direction: "rtl" }}>
      {doctorNameArabic && (
        <p className="prescription-header-name text-base font-bold leading-tight" style={{ color: "#1a365d" }}>الدكتور {doctorNameArabic}</p>
      )}
      {specialtyArabic && (
        <p className="prescription-header-detail mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: "#32745a" }}>{specialtyArabic}</p>
      )}
    </div>
  </div>
);

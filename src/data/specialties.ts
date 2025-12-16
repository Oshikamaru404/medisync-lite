// Medical specialties with French/Arabic translations and icon suggestions
export interface Specialty {
  id: string;
  nameFr: string;
  nameAr: string;
  icon: string; // Lucide icon name or custom SVG
}

export const MEDICAL_SPECIALTIES: Specialty[] = [
  { id: "general", nameFr: "Médecine Générale", nameAr: "الطب العام", icon: "stethoscope" },
  { id: "orl", nameFr: "ORL", nameAr: "أخصائي في طب و جراحة الأذن، الأنف و الحنجرة", icon: "ear" },
  { id: "cardiology", nameFr: "Cardiologie", nameAr: "أمراض القلب والشرايين", icon: "heart-pulse" },
  { id: "dermatology", nameFr: "Dermatologie", nameAr: "الأمراض الجلدية", icon: "scan-face" },
  { id: "ophthalmology", nameFr: "Ophtalmologie", nameAr: "طب العيون", icon: "eye" },
  { id: "pediatrics", nameFr: "Pédiatrie", nameAr: "طب الأطفال", icon: "baby" },
  { id: "gynecology", nameFr: "Gynécologie", nameAr: "أمراض النساء والتوليد", icon: "heart" },
  { id: "neurology", nameFr: "Neurologie", nameAr: "طب الأعصاب", icon: "brain" },
  { id: "orthopedics", nameFr: "Orthopédie", nameAr: "جراحة العظام", icon: "bone" },
  { id: "gastroenterology", nameFr: "Gastro-entérologie", nameAr: "أمراض الجهاز الهضمي", icon: "pill" },
  { id: "pulmonology", nameFr: "Pneumologie", nameAr: "أمراض الرئة", icon: "wind" },
  { id: "urology", nameFr: "Urologie", nameAr: "طب المسالك البولية", icon: "droplets" },
  { id: "psychiatry", nameFr: "Psychiatrie", nameAr: "الطب النفسي", icon: "brain" },
  { id: "rheumatology", nameFr: "Rhumatologie", nameAr: "أمراض المفاصل والروماتيزم", icon: "activity" },
  { id: "endocrinology", nameFr: "Endocrinologie", nameAr: "أمراض الغدد الصماء والسكري", icon: "gauge" },
  { id: "nephrology", nameFr: "Néphrologie", nameAr: "أمراض الكلى", icon: "filter" },
  { id: "surgery", nameFr: "Chirurgie Générale", nameAr: "الجراحة العامة", icon: "scissors" },
  { id: "dentistry", nameFr: "Médecine Dentaire", nameAr: "طب الأسنان", icon: "smile" },
  { id: "radiology", nameFr: "Radiologie", nameAr: "الأشعة التشخيصية", icon: "scan" },
  { id: "anesthesiology", nameFr: "Anesthésie-Réanimation", nameAr: "التخدير والإنعاش", icon: "syringe" },
];

// Get specialty by ID
export const getSpecialtyById = (id: string): Specialty | undefined => {
  return MEDICAL_SPECIALTIES.find(s => s.id === id);
};

// Get specialty by French name
export const getSpecialtyByNameFr = (nameFr: string): Specialty | undefined => {
  return MEDICAL_SPECIALTIES.find(s => s.nameFr.toLowerCase() === nameFr.toLowerCase());
};

// SVG icons for specialties (inline for PDF generation)
export const SPECIALTY_LOGOS: Record<string, string> = {
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
    <path d="M35 40C40 42 45 42 50 40" stroke="currentColor" stroke-width="2"/>
    <path d="M50 40C55 42 60 42 65 40" stroke="currentColor" stroke-width="2"/>
    <path d="M35 55C40 57 45 57 50 55" stroke="currentColor" stroke-width="2"/>
    <path d="M50 55C55 57 60 57 65 55" stroke="currentColor" stroke-width="2"/>
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
    <path d="M75 25C80 20 85 25 85 32C85 38 80 40 78 42L42 78C40 80 38 85 32 85C25 85 20 80 25 75" stroke="currentColor" stroke-width="4" fill="none"/>
    <circle cx="20" cy="28" r="6" stroke="currentColor" stroke-width="3" fill="none"/>
    <circle cx="28" cy="20" r="6" stroke="currentColor" stroke-width="3" fill="none"/>
    <circle cx="80" cy="28" r="6" stroke="currentColor" stroke-width="3" fill="none"/>
    <circle cx="72" cy="20" r="6" stroke="currentColor" stroke-width="3" fill="none"/>
  </svg>`,
  "scan-face": `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 30V20C15 17 17 15 20 15H30" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M70 15H80C83 15 85 17 85 20V30" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M85 70V80C85 83 83 85 80 85H70" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M30 85H20C17 85 15 83 15 80V70" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="20" stroke="currentColor" stroke-width="3" fill="none"/>
  </svg>`,
  smile: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="4" fill="none"/>
    <circle cx="38" cy="42" r="4" fill="currentColor"/>
    <circle cx="62" cy="42" r="4" fill="currentColor"/>
    <path d="M35 60C40 70 60 70 65 60" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`,
};

// Get SVG logo for specialty
export const getSpecialtyLogo = (iconName: string): string => {
  return SPECIALTY_LOGOS[iconName] || SPECIALTY_LOGOS.stethoscope;
};

import prescriptionSample from "@/assets/prescription-print-preview-sample.png";
import prescriptionA4Sample from "@/assets/prescription-print-preview-a4.png";

interface PrescriptionStationeryPreviewProps {
  paperSize: "A5" | "A4";
}

export const PrescriptionStationeryPreview = ({ paperSize }: PrescriptionStationeryPreviewProps) => {
  const isA4 = paperSize === "A4";

  return (
    <div className="flex min-h-[430px] items-center justify-center overflow-hidden rounded-2xl bg-[#eff4f1] p-4">
      <div
        className="flex aspect-[210/297] w-full max-w-[270px] items-center justify-center"
        aria-label={`Aperçu à l’échelle relative du papier ${paperSize}`}
      >
        <div
          className={`relative shrink-0 overflow-hidden border border-[#dce5de] bg-white shadow-[0_14px_35px_-20px_rgba(24,65,50,0.4)] ${
            isA4 ? "h-full w-full" : "h-[70.707%] w-[70.476%]"
          }`}
        >
          <img
            src={isA4 ? prescriptionA4Sample : prescriptionSample}
            alt={`Ordonnance de démonstration en format ${paperSize}`}
            className="absolute inset-0 h-full w-full object-fill"
          />
        </div>
      </div>
    </div>
  );
};

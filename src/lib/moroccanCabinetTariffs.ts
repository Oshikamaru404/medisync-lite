export interface CabinetTariffPreset {
  amount: number;
  label: string;
  group: "cabinet" | "specialty";
}

export interface MoroccanCabinetTariffProfile {
  profileLabel: string;
  referenceAmount: number;
  referenceLabel: string;
  presets: CabinetTariffPreset[];
}

export function getMoroccanCabinetTariffProfile(
  specialtyId: string,
): MoroccanCabinetTariffProfile {
  if (specialtyId === "general") {
    return {
      profileLabel: "Médecine générale",
      referenceAmount: 80,
      referenceLabel: "Repère de remboursement communiqué",
      presets: [
        { amount: 150, label: "Tarif cabinet", group: "cabinet" },
        { amount: 200, label: "Tarif cabinet", group: "cabinet" },
      ],
    };
  }

  const presets: CabinetTariffPreset[] = [
    { amount: 200, label: "Tarif cabinet", group: "cabinet" },
    { amount: 250, label: "Tarif cabinet", group: "cabinet" },
    { amount: 300, label: "Tarif cabinet", group: "cabinet" },
  ];
  const normalizedSpecialty = specialtyId.toLocaleLowerCase("fr-MA");
  const isCardiologyOrDermatology = normalizedSpecialty === "cardiology"
    || normalizedSpecialty === "dermatology";

  if (isCardiologyOrDermatology) {
    presets.push(
      { amount: 350, label: "Tarif cabinet · spécifique", group: "specialty" },
      { amount: 500, label: "Tarif cabinet · spécifique", group: "specialty" },
      { amount: 700, label: "Tarif cabinet · spécifique", group: "specialty" },
    );
  }

  return {
    profileLabel: isCardiologyOrDermatology
      ? specialtyId === "cardiology" ? "Cardiologie" : "Dermatologie"
      : "Médecine spécialisée",
    referenceAmount: 150,
    referenceLabel: "Repère de remboursement communiqué",
    presets,
  };
}

export function getSuggestedPaymentAmounts(
  presets: CabinetTariffPreset[],
  remainingAmount: number,
): number[] {
  if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) return [];
  return [...new Set(presets.map(({ amount }) => amount))]
    .filter((amount) => amount > 0 && amount <= remainingAmount)
    .sort((first, second) => first - second);
}

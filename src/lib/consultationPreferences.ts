export type ConsultationMode = "simple" | "complete";

export const getConsultationDefaultModeSettingKey = (userId: string) =>
  `consultation_default_mode.${userId}`;

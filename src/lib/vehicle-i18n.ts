"use client";

import { useTranslations } from "next-intl";
import type { VehicleType } from "./pricing";

export function useVehicleLabels(): Record<VehicleType, string> {
  const t = useTranslations("vehicles.labels");
  return {
    sedan: t("sedan"),
    van: t("van"),
    luxury: t("luxury"),
  };
}

export function useVehicleDescriptions(): Record<VehicleType, string> {
  const t = useTranslations("vehicles.descriptions");
  return {
    sedan: t("sedan"),
    van: t("van"),
    luxury: t("luxury"),
  };
}
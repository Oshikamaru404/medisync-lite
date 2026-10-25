import allergensCsv from "@/data/allergy-reference/allergens.csv?raw";
import drugAllergenMapCsv from "@/data/allergy-reference/drug_allergen_map.csv?raw";
import crossReactivityCsv from "@/data/allergy-reference/cross_reactivity.csv?raw";
import { AllergyAlertService } from "./AllergyAlertService";

export const allergyAlertService = new AllergyAlertService({
  allergens: allergensCsv,
  drugAllergenMap: drugAllergenMapCsv,
  crossReactivity: crossReactivityCsv,
});

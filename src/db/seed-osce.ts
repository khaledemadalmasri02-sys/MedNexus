import { specialties, stationTypes } from "../db/index";
import type { DB } from "../db/index";

const SPECIALTIES = [
  "Internal Medicine",
  "Surgery",
  "Pediatrics",
  "Obstetrics and Gynecology",
  "Psychiatry",
  "Emergency Medicine",
  "Cardiology",
  "Neurology",
  "Gastroenterology",
  "Endocrinology",
  "Respiratory Medicine",
  "Oncology",
  "Rheumatology",
  "Infectious Disease",
  "Geriatrics",
  "Ophthalmology",
  "ENT",
  "Orthopedics",
  "Urology",
  "Nephrology",
];

const STATION_TYPES = [
  { name: "History", description: "History taking station - patient interview", icon: "🗣️" },
  { name: "Examination", description: "Clinical examination station - physical assessment", icon: "💊" },
  { name: "Counseling", description: "Patient counseling station - discussing treatments", icon: "🤝" },
  { name: "Communication", description: "Communication skills station - difficult conversations", icon: "🗨️" },
  { name: "Interpretation", description: "Data interpretation station - ECG, X-ray, labs", icon: "📊" },
  { name: "Emergency", description: "Emergency management station - acute scenarios", icon: "🚑" },
];

export async function seedOsceData(db: DB) {
  for (const specialty of SPECIALTIES) {
    await db.insert(specialties).values({
      name: specialty,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  for (const type of STATION_TYPES) {
    await db.insert(stationTypes).values({
      name: type.name,
      description: type.description,
      icon: type.icon,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }
}

export async function runSeed(): Promise<void> {
  // This function should be called during app initialization or via a migration
  console.log("OSCE seed data ready to be inserted");
}
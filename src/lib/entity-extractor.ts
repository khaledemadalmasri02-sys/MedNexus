import { type MedicalEntity, type ExtractedEntities, type EntityExtractionResult, type MedicalEntityType } from "./medical-entities";
import { AIService, type Message } from "./ai";
import { logger } from "./logger";

const ENTITY_EXTRACTION_PROMPT = `You are a medical AI assistant specializing in extracting medical entities from clinical text. Your task is to identify and classify medical concepts, terms, and relationships from the input text.

Extract the following types of entities:
- Disease/Condition: Medical conditions, diseases, syndromes
- Symptom: Patient-reported or observed symptoms
- Sign: Observable clinical findings
- Diagnosis: Diagnostic labels or categories
- Treatment: Therapeutic interventions, procedures
- Medication/Drug: Pharmaceuticals, medications
- Anatomy: Body parts, organs, structures
- Physiology: Physiological processes
- Pathology: Disease mechanisms, pathological processes
- Pharmacology: Drug mechanisms, pharmacological effects
- Microbiology: Infectious agents, pathogens
- Infection: Infectious conditions
- Procedure: Medical/surgical procedures
- Test/Lab/Imaging: Diagnostic tests, lab tests, imaging studies
- Finding: Clinical findings, radiologic findings
- Vaccine: Vaccines, immunizations
- Nutrition: Dietary recommendations, nutritional deficiencies
- Genetics: Genetic conditions, mutations, genetic markers
- Biochemistry: Biochemical markers, lab values
- Toxicology: Toxic exposures, poisons
- Surgery: Surgical specialties, operations
- Emergency: Emergency medicine topics
- Psychiatry: Psychiatric conditions, mental health
- Pediatrics: Pediatric-specific conditions
- Obstetrics/Gynecology: OB/GYN topics
- Geriatrics: Geriatric medicine topics
- Dermatology: Skin conditions
- Cardiology: Heart-related conditions
- Neurology: Brain, nervous system conditions
- Gastroenterology: GI conditions
- Endocrinology: Hormonal, metabolic conditions
- Urology: Urinary system conditions
- Orthopedics: Musculoskeletal conditions
- ENT: Ear, nose, throat conditions
- Ophthalmology: Eye conditions
- Hematology: Blood-related conditions
- Oncology: Cancer-related conditions
- Rheumatology: Autoimmune conditions
- Nephrology: Kidney conditions
- Pulmonology: Lung conditions
- Cardiothoracic: Cardiothoracic conditions
- Vascular: Vascular conditions
- Transplant: Transplant medicine
- Allergy: Allergic conditions
- Immunology: Immune-related conditions

Return format: A valid JSON array of objects with fields:
- name: The entity name (string)
- type: The entity type (string)
- description: Brief description or context (string, optional)
- confidence: Confidence score 0.0-1.0 (number, optional)

Return ONLY the JSON array, no additional text.`;

export class EntityExtractor {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async extractEntities(text: string, options?: {
    entityTypes?: MedicalEntityType[];
    minConfidence?: number;
    maxEntities?: number;
  }): Promise<EntityExtractionResult> {
    if (!text || text.trim().length === 0) {
      return {
        entities: [],
        confidence: 0,
      };
    }

    try {
      const messages: Message[] = [
        { role: "system", content: ENTITY_EXTRACTION_PROMPT },
        { role: "user", content: `Extract medical entities from the following text:\n\n${text}` },
      ];

      const response = await this.aiService.complete(messages, {
        temperature: 0.3,
        maxTokens: 4000,
      });

      const entities = this.parseEntities(response, options);
      return {
        entities,
        confidence: this.calculateConfidence(entities, text),
      };
    } catch (err) {
      logger.warn({ err: (err as Error)?.message, textLength: text.length }, "Entity extraction failed");
      return {
        entities: [],
        confidence: 0,
      };
    }
  }

  private parseEntities(response: string, options?: {
    entityTypes?: MedicalEntityType[];
    minConfidence?: number;
    maxEntities?: number;
  }): MedicalEntity[] {
    try {
      const parsed = JSON.parse(response.trim());
      if (!Array.isArray(parsed)) return [];

      let entities: MedicalEntity[] = parsed.map((item: any) => ({
        id: this.generateId(item.name, item.type),
        type: this.normalizeEntityType(item.type) as MedicalEntityType,
        name: item.name?.trim() || "",
        description: item.description?.trim(),
        confidence: typeof item.confidence === "number" ? item.confidence : 0.8,
      })).filter((e: MedicalEntity) => e.name.length > 0);

      if (options?.entityTypes && options.entityTypes.length > 0) {
        entities = entities.filter((e: MedicalEntity) => options.entityTypes!.includes(e.type as MedicalEntityType));
      }

      if (options?.minConfidence !== undefined) {
        entities = entities.filter((e: MedicalEntity) => (e.confidence ?? 0) >= options.minConfidence!);
      }

      if (options?.maxEntities !== undefined && entities.length > options.maxEntities) {
        entities = entities.slice(0, options.maxEntities);
      }

      return entities;
    } catch {
      return [];
    }
  }

  private normalizeEntityType(type: string): string {
    const normalized = type.toLowerCase().trim();
    const validTypes: MedicalEntityType[] = [
      "disease", "symptom", "sign", "diagnosis", "treatment", "medication",
      "drug", "anatomy", "physiology", "pathology", "pharmacology", "microbiology",
      "infection", "procedure", "test", "finding", "lab", "imaging", "vaccine",
      "nutrition", "genetics", "biochemistry", "toxicology", "surgery", "emergency",
      "psychiatry", "pediatrics", "obstetrics", "geriatrics", "dermatology",
      "cardiology", "neurology", "gastroenterology", "endocrinology", "urology",
      "urogynecology", "orthopedics", "ENT", "ophthalmology", "hematology",
      "oncology", "rheumatology", "nephrology", "pulmonology", "cardiothoracic",
      "vascular", "transplant", "allergy", "immunology"
    ];

    if (validTypes.includes(normalized as MedicalEntityType)) {
      return normalized;
    }

    if (normalized === "ent") {
      return "ENT";
    }

const typeMap: Record<string, MedicalEntityType> = {
      "condition": "disease",
      "syndrome": "disease",
      "disorder": "disease",
      "meds": "medication",
      "rx": "medication",
      "procedure": "procedure",
      "procedures": "procedure",
      "diagnoses": "diagnosis",
      "diagnosis": "diagnosis",
      "labs": "lab",
      "lab": "lab",
      "tests": "test",
      "imaging": "imaging",
      "radiology": "imaging",
      "ct": "imaging",
      "mri": "imaging",
      "xray": "imaging",
      "ultrasound": "imaging",
      "ecg": "test",
      "ekg": "test",
      "echo": "test",
      "blood": "lab",
      "biopsy": "procedure",
      "surgery": "surgery",
      "drug": "drug",
      "drugs": "drug",
      "antibiotic": "medication",
      "antiviral": "medication",
      "antifungal": "medication",
      "antiparasitic": "medication",
      "vaccine": "vaccine",
      "vaccines": "vaccine",
      "immunization": "vaccine",
      "allergy": "allergy",
      "immunology": "immunology",
      "immune": "immunology",
      "autoimmune": "disease",
      "cancer": "disease",
      "tumor": "disease",
      "carcinoma": "disease",
      "sarcoma": "disease",
      "leukemia": "disease",
      "lymphoma": "disease",
      "melanoma": "disease",
      "infection": "infection",
      "infectious": "infection",
      "pathogen": "microbiology",
      "bacteria": "microbiology",
      "virus": "microbiology",
      "fungus": "microbiology",
      "parasite": "microbiology",
      "ent": "ENT",
      "otolaryngology": "ENT",
      "metabolic": "disease",
      "endocrine": "endocrinology",
      "hormone": "endocrinology",
      "diabetes": "disease",
      "cardiac": "cardiology",
      "heart": "anatomy",
      "cardiovascular": "cardiology",
      "cerebrovascular": "neurology",
      "brain": "anatomy",
      "neurological": "neurology",
      "gastrointestinal": "gastroenterology",
      "gastro": "gastroenterology",
      "hepatic": "disease",
      "liver": "anatomy",
      "renal": "nephrology",
      "kidney": "anatomy",
      "urinary": "urology",
      "urologic": "urology",
      "pulmonary": "pulmonology",
      "lung": "anatomy",
      "respiratory": "pulmonology",
      "pediatric": "pediatrics",
      "obstetric": "obstetrics",
      "gynecologic": "obstetrics",
      "gynecology": "obstetrics",
      "maternal": "obstetrics",
      "neonatal": "pediatrics",
      "geriatric": "geriatrics",
      "elderly": "geriatrics",
      "dermatologic": "dermatology",
      "skin": "anatomy",
      "rheumatologic": "rheumatology",
      "joint": "anatomy",
      "arthritic": "rheumatology",
      "hematologic": "hematology",
      "oncologic": "oncology",
      "malignant": "disease",
      "malignancy": "disease",
      "carcinogenic": "disease",
      "toxic": "toxicology",
      "toxin": "toxicology",
      "poisoning": "toxicology",
      "nutritional": "nutrition",
      "dietary": "nutrition",
      "vitamin": "nutrition",
      "mineral": "nutrition",
      "deficiency": "disease",
      "biochemical": "biochemistry",
      "marker": "biochemistry",
      "enzyme": "biochemistry",
      "genetic": "genetics",
      "genomic": "genetics",
      "mutation": "genetics",
      "complex": "disease",
      "congenital": "disease",
      "developmental": "disease",
      "behavioral": "psychiatry",
      "psychiatric": "psychiatry",
      "mental": "psychiatry",
      "psychotic": "psychiatry",
      "mood": "psychiatry",
      "anxiety": "psychiatry",
      "substance": "toxicology",
      "addiction": "psychiatry",
      "trauma": "emergency",
      "acute": "disease",
      "acute_illness": "disease",
      "chronic_disease": "disease",
    };

    return typeMap[normalized] || "disease";
  }

  private generateId(name: string, type: string): string {
    const base = `${type}_${name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}`;
    return `${base}_${Date.now()}`;
  }

  private calculateConfidence(entities: MedicalEntity[], text: string): number {
    if (entities.length === 0) return 0;

    const avgConfidence = entities.reduce((sum, e) => sum + (e.confidence ?? 0.8), 0) / entities.length;
    const coverage = entities.length / Math.max(1, text.split(/\s+/).length);
    const coverageFactor = Math.min(1, coverage * 10);

    return Math.min(1, avgConfidence * coverageFactor);
  }

  async extractEntitiesBatch(texts: string[], options?: {
    entityTypes?: MedicalEntityType[];
    minConfidence?: number;
    maxEntities?: number;
  }): Promise<ExtractedEntities[]> {
    return Promise.all(texts.map(async (text: string) => {
      const result = await this.extractEntities(text, options);
      return {
        entities: result.entities,
        rawText: text,
        extractedAt: new Date(),
      };
    }));
  }
}

export function createEntityExtractor(aiService: AIService): EntityExtractor {
  return new EntityExtractor(aiService);
}
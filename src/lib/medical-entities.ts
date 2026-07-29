export type MedicalEntityType =
  | "disease"
  | "symptom"
  | "sign"
  | "diagnosis"
  | "treatment"
  | "medication"
  | "drug"
  | "anatomy"
  | "physiology"
  | "pathology"
  | "pharmacology"
  | "microbiology"
  | "infection"
  | "procedure"
  | "test"
  | "finding"
  | "lab"
  | "imaging"
  | "vaccine"
  | "nutrition"
  | "genetics"
  | "biochemistry"
  | "toxicology"
  | "surgery"
  | "emergency"
  | "psychiatry"
  | "pediatrics"
  | "obstetrics"
  | "geriatrics"
  | "dermatology"
  | "cardiology"
  | "neurology"
  | "gastroenterology"
  | "endocrinology"
  | "urology"
  | "urogynecology"
  | "orthopedics"
  | "ENT"
  | "ophthalmology"
  | "hematology"
  | "oncology"
  | "rheumatology"
  | "nephrology"
  | "pulmonology"
  | "cardiothoracic"
  | "vascular"
  | "transplant"
  | "allergy"
  | "immunology";

export interface MedicalEntity {
  id: string;
  type: MedicalEntityType;
  name: string;
  synonyms?: string[];
  description?: string;
  context?: string;
  confidence?: number;
  startPosition?: number;
  endPosition?: number;
}

export interface ExtractedEntities {
  entities: MedicalEntity[];
  rawText: string;
  extractedAt: Date;
}

export interface EntityRelationship {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  strength?: number;
  evidence?: string;
}

export interface KnowledgeGraphNodeData {
  id: string;
  type: "entity" | "concept" | "fact";
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  entities?: MedicalEntity[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeGraphEdgeData {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  weight?: number;
  evidence?: string;
  createdAt?: Date;
}

export type RelationshipType =
  | "causes"
  | "treats"
  | "manifests"
  | "associated_with"
  | "diagnosed_by"
  | "caused_by"
  | "precedes"
  | "follows"
  | "contraindicated_with"
  | "prevents"
  | "exacerbated_by"
  | "improved_by"
  | "measured_by"
  | "located_in"
  | "part_of"
  | "requires"
  | "produces"
  | "targets"
  | "metabolized_by"
  | "excreted_by";

export interface EntityExtractionResult {
  entities: MedicalEntity[];
  relationships?: EntityRelationship[];
  confidence: number;
}
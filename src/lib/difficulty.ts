import { logger } from "./logger";

export type CardDifficulty = "easy" | "medium" | "hard";

export interface DifficultyClassification {
  difficulty: CardDifficulty;
  confidence: number;
  factors: DifficultyFactor[];
}

export interface DifficultyFactor {
  type: "term_complexity" | "concept_abstraction" | "length" | "medical_term_density" | "question_format" | "specialty";
  weight: number;
  description: string;
}

export interface DifficultyConfig {
  thresholds?: {
    easy: number;
    medium: number;
  };
  weights?: {
    termComplexity: number;
    abstraction: number;
    length: number;
    medicalTermDensity: number;
    questionFormat: number;
    specialty: number;
  };
  specialties?: Record<string, CardDifficulty>;
}

export class DifficultyClassifier {
  private config: DifficultyConfig;

  constructor(config?: DifficultyConfig) {
    this.config = config || {
      thresholds: { easy: 0.4, medium: 0.7 },
      weights: {
        termComplexity: 1.0,
        abstraction: 1.2,
        length: 0.5,
        medicalTermDensity: 0.8,
        questionFormat: 0.6,
        specialty: 0.7,
      },
      specialties: {
        "cardiology": "medium",
        "neurology": "hard",
        "oncology": "hard",
        "pediatrics": "medium",
        "obstetrics": "medium",
        "surgery": "hard",
        "emergency": "hard",
        "psychiatry": "hard",
        "dermatology": "medium",
        "gastroenterology": "medium",
        "endocrinology": "hard",
        "nephrology": "hard",
        "pulmonology": "hard",
        "hematology": "hard",
        "infectious disease": "hard",
        "rheumatology": "hard",
        "urology": "hard",
        "ENT": "medium",
        "ophthalmology": "medium",
      },
    };
  }

  classify(front: string, back: string, options?: { subject?: string; organSystem?: string }): DifficultyClassification {
    const factors: DifficultyFactor[] = [];
    let score = 0;

    const termComplexity = this.analyzeTermComplexity(front, back);
    factors.push({
      type: "term_complexity",
      weight: termComplexity.score,
      description: termComplexity.description,
    });
    score += termComplexity.score * (this.config.weights?.termComplexity ?? 1.0);

    const abstraction = this.analyzeAbstraction(front, back);
    factors.push({
      type: "concept_abstraction",
      weight: abstraction.score,
      description: abstraction.description,
    });
    score += abstraction.score * (this.config.weights?.abstraction ?? 1.2);

    const length = this.analyzeLength(front, back);
    factors.push({
      type: "length",
      weight: length.score,
      description: length.description,
    });
    score += length.score * (this.config.weights?.length ?? 0.5);

    const termDensity = this.analyzeMedicalTermDensity(front, back);
    factors.push({
      type: "medical_term_density",
      weight: termDensity.score,
      description: termDensity.description,
    });
    score += termDensity.score * (this.config.weights?.medicalTermDensity ?? 0.8);

    const questionFormat = this.analyzeQuestionFormat(front);
    factors.push({
      type: "question_format",
      weight: questionFormat.score,
      description: questionFormat.description,
    });
    score += questionFormat.score * (this.config.weights?.questionFormat ?? 0.6);

    if (options?.subject || options?.organSystem) {
      const specialty = this.analyzeSpecialty(options.subject, options.organSystem);
      factors.push({
        type: "specialty",
        weight: specialty.score,
        description: specialty.description,
      });
      score += specialty.score * (this.config.weights?.specialty ?? 0.7);
    }

    const normalizedScore = Math.min(1, score / factors.reduce((sum, f) => sum + f.weight, 0));
    const difficulty = this.determineDifficulty(normalizedScore);
    const confidence = this.calculateConfidence(factors);

    return { difficulty, confidence, factors };
  }

  private analyzeTermComplexity(front: string, back: string): { score: number; description: string } {
    const complexTerms = [
      "myocardial infarction", "acute myocardial infarction", "ST elevation", "ST depression",
      "ventricular tachycardia", "ventricular fibrillation", "atrial fibrillation", "atrial flutter",
      "acute respiratory distress syndrome", "ARDS", "multiple organ failure", "MOF",
      "disseminated intravascular coagulation", "DIC", "acute kidney injury", "AKI",
      "chronic kidney disease", "CKD", "end stage renal disease", "ESRD",
      "systemic lupus erythematosus", "SLE", "rheumatoid arthritis", "RA",
      "inflammatory bowel disease", "IBD", "Crohn disease", "ulcerative colitis",
      "type 1 diabetes", "type 2 diabetes", "diabetes mellitus", "DM",
      "hypertension", "HTN", "hypotension", "hypertensive crisis",
      "heart failure", "HF", "left ventricular failure", "LVF",
      "myasthenia gravis", "MG", "Guillain-Barre syndrome", "GBS",
      "botulism", "botulism", "tetanus", "clostridium botulinum",
      "botulism toxin", "Botox", "abbot", "botulinum toxin",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
      "botulism", "botulism", "botulism", "botulism",
    ];

    const text = (front + " " + back).toLowerCase();
    const matches = complexTerms.filter(term => text.includes(term.toLowerCase()));

    if (matches.length >= 3) return { score: 0.9, description: "Highly complex medical terminology" };
    if (matches.length >= 1) return { score: 0.6, description: "Moderate medical terminology complexity" };
    return { score: 0.3, description: "Simple terminology" };
  }

  private analyzeAbstraction(front: string, back: string): { score: number; description: string } {
    const abstractIndicators = [
      "pathophysiology", "mechanism", "pathogenesis", "etiology", "pathophysiologic",
      "pharmacokinetics", "pharmacodynamics", "pharmacokinetic", "pharmacodynamic",
      "pathophysiology", "physiologic", "biochemical", "metabolic", "enzyme",
      "genetic", "mutation", "polymorphism", "allele", "locus", "chromosome",
      "molecular", "cellular", "subcellular", "intracellular", "extracellular",
      "pathway", "cascade", "signaling", "transduction", "apoptosis", "cell cycle",
      "mitosis", "meiosis", "differentiation", "proliferation", "angiogenesis",
      "hypertrophy", "atrophy", "hyperplasia", "metaplasia", "dysplasia",
      "oncogenesis", "tumorigenesis", "carcinogenesis", "neoplasia",
      "immunologic", "immune", "immunity", "immunopathology", "autoimmune",
      "allostasis", "homeostasis", "thermoregulation", "neurotransmission",
      "synapse", "neuroplasticity", "neurogenesis", "myelination",
      "hematopoiesis", "hematopoietic", "angiogenesis", "hematogenesis",
      "lipid metabolism", "carbohydrate metabolism", "protein metabolism",
      "oxidative phosphorylation", "kreb's cycle", "citric acid cycle", "TCA cycle",
    ];

    const text = (front + " " + back).toLowerCase();
    const matches = abstractIndicators.filter(indicator => text.includes(indicator.toLowerCase()));

    if (matches.length >= 2) return { score: 0.8, description: "Highly abstract concepts" };
    if (matches.length >= 1) return { score: 0.5, description: "Moderately abstract concepts" };
    return { score: 0.3, description: "Concrete, clinical concepts" };
  }

  private analyzeLength(front: string, back: string): { score: number; description: string } {
    const totalLength = front.length + back.length;

    if (totalLength < 100) return { score: 0.2, description: "Very short content" };
    if (totalLength < 300) return { score: 0.4, description: "Short content" };
    if (totalLength < 600) return { score: 0.6, description: "Medium-length content" };
    if (totalLength < 1000) return { score: 0.8, description: "Long content" };
    return { score: 0.9, description: "Very long content" };
  }

  private analyzeMedicalTermDensity(front: string, back: string): { score: number; description: string } {
    const medicalWords = [
      "diagnosis", "treatment", "symptom", "sign", "disease", "condition",
      "medication", "drug", "therapy", "management", "patient", "clinical",
      "history", "examination", "exam", "test", "lab", "imaging", "ct", "mri",
      "x-ray", "ultrasound", "ecg", "ekg", "echo", "scan", "biopsy", "procedure",
      "surgery", "operation", "hospital", "ward", "clinic", "emergency", "icu",
      "cardiac", "cardiology", "heart", "lung", "pulmonary", "neurological",
      "brain", "stroke", "seizure", "infarction", "infection", "fever", "pain",
      "bleeding", "hemorrhage", "injury", "fracture", "wound", "allergy",
      "anaphylaxis", "rash", "urticaria", "breathing", "respiratory", "asthma",
      "copd", "pneumonia", "tuberculosis", "hiv", "aids", "diabetes", "hypertension",
      "hypotension", "arrhythmia", "atrial fibrillation", "heart failure", "mi",
      "myocardial infarction", "stroke", "TIA", "dvt", "pe", "pulmonary embolism",
      "deep vein thrombosis", "cancer", "tumor", "malignancy", "carcinoma",
      "sarcoma", "leukemia", "lymphoma", "melanoma", "chemotherapy", "radiation",
      "surgery", "appendectomy", "cholecystectomy", "hysterectomy", "mastectomy",
      "angiography", "angiogram", "colonoscopy", "endoscopy", "catscan", "mri",
      "ct scan", "xray", "x-ray", "bone marrow", "biopsy", "culture", "smear",
      "strep", "staph", "germ", "bacteria", "virus", "fungus", "parasite",
      "antibiotic", "antiviral", "antifungal", "antiparasitic", "penicillin",
      "vancomycin", "gentamicin", "cef", "azith", "doxy", "rifampin", "ethambutol",
      "isoniazid", "pyrazinamide", "ribavirin", "acyclovir", "prednisone",
      "steroid", "immunosuppressant", "anticoagulant", "heparin", "warfarin",
      "apixaban", "rivaroxaban", "dabigatran", "aspirin", "plavix", "clopidogrel",
      "metoprolol", "lisinopril", "losartan", "metformin", "insulin", "digoxin",
      "amiodarone", "furosemide", "torasemide", "spironolactone", "eplerenone",
      "beta blocker", "ace inhibitor", "arb", "statin", "atorvastatin", "simvastatin",
      "rosuvastatin", "pravastatin", "lovastatin", "pitavastatin", "ezetimibe",
      "bempedoic acid", "inclisiran", "lomitapide", "colesevelam", "cholestyramine",
      "cholestyramine", "colestipol", "colesevelam", "orlistat", "phentermine",
      "semaglutide", "liraglutide", "exenatide", "pioglitazone", "rosiglitazone",
      "troglitazone", "pioglitazone", "rosiglitazone", "cigarette", "smoking",
      "alcohol", "drug", "substance", "addiction", "withdrawal", "detox",
      "analgesic", "opioid", "morphine", "oxycodone", "hydrocodone", "codeine",
      "fentanyl", "buprenorphine", "methadone", "naloxone", "naltrexone", "disulfiram",
      "benzodiazepine", "diazepam", "lorazepam", "alprazolam", "clonazepam", "phenytoin",
      "carbamazepine", "lamotrigine", "levetiracetam", "pregabalin", "gabapentin",
      "topiramate", "valproic acid", "phenobarbital", "ethosuximide", "zonisamide",
      "oxcarbazepine", "brivaracetam", "perampanel", "stripped", "stripped",
      "anxiety", "depression", "bipolar", "schizophrenia", "psychosis", "hallucination",
      "delusion", "paranoia", "obsessive", "compulsive", "ptsd", "pain", "suicide",
      "mood", "personality", "borderline", "antisocial", "narcissistic", "paranoid",
      "schizoid", "schizotypal", "avoidant", "dependent", "obsessive-compulsive",
      "epilepsy", "seizure", "status epilepticus", "headache", "migraine", "tension",
      "cluster", "encephalitis", "meningitis", "neuritis", "neuropathy", "palsy",
      "ataxia", "dysarthria", "dysphagia", "diplopia", "nystagmus", "athetosis",
      "chorea", "myoclonus", "tremor", "rigidity", "bradykinesia", "akinesia",
      "dystonia", "spasticity", "hemiplegia", "hemiparesis", "paralysis", "weakness",
      "fatigue", "weight loss", "weight gain", "fever", "chills", "night sweats",
      "anorexia", "nausea", "vomiting", "diarrhea", "constipation", "abdominal pain",
      "dyspepsia", "gastritis", "ulcer", "hepatitis", "pancreatitis", "cholecystitis",
      "cholelithiasis", "pancreatitis", "pancreatic enzyme", "peptic ulcer", "gastroesophageal",
      "reflux", "ulcerative colitis", "crohn disease", "celiac", "IBS", "IBD",
      "celiac disease", "gi bleed", "perforation", "obstruction", "ileus", "bowel",
      "appendicitis", "diverticulitis", "hernia", "inguinal", "femoral", "umbilical",
      "incisional", "spigelian", "hiatal", "hiatus hernia", "hiatal hernia",
      "pneumonia", "bronchitis", "pneumothorax", "empyema", "pleurisy", "pleuritis",
      "pulmonary edema", "heart failure", "cardiac tamponade", "myocarditis",
      "pericarditis", "endocarditis", "valvular disease", "aortic stenosis",
      "mitral regurgitation", "aortic valve disease", "infectious endocarditis",
      "valve replacement", "pacemaker", "icdr", "implantable cardioverter defibrillator",
      "cardiac resynchronization therapy", "ventricular assist device", "left ventricular assist device",
      "total artificial heart", "pediatric", "child", "infant", "neonate", "adolescent", "teenager",
      "school-age", "developmental milestone", "growth chart", "vaccination", "well-child visit",
      "routine care", "newborn", "congenital", "neonatal", "Congenital heart disease",
      "nephroblastoma", "hydronephrosis", "urogenital anomaly", "imperforate anus", "spina bifida",
      "myelomeningocele", "hydrocephalus", "craniosynostosis", "cleft lip", "cleft palate",
      "hirschsprung disease", "intestinal obstruction", "necrotizing enterocolitis", "feeds",
      "prematurity", "respiratory distress syndrome", "bronchopulmonary dysplasia",
      "retinopathy of prematurity", "rop", "developmental delay", "autism spectrum disorder",
      "down syndrome", "aveling", "williams syndrome", "turner syndrome", "klinefelter syndrome",
      "patau syndrome", "edwards syndrome", "trisomy 21", "trisomy 18", "trisomy 13",
      "adhd", "attention deficit hyperactivity disorder", "learning disability", "dyslexia",
      "dyscalculia", "dysgraphia", "speech delay", "language delay", "occupational therapy",
      "physical therapy", "speech therapy", "behavioral therapy", "applied behavior analysis",
      "psychopharmacology", "antipsychotic", "haloperidol", "risperidone", "olanzapine",
      "quetiapine", "clozapine", "aripiprazole", "lurasidone", "ziprasidone", "asenepine",
      "benzodiazepine", "diazepam", "lorazepam", "alprazolam", "clonazepam", "chlordiazepoxide",
      "zolpidem", "zopiclone", "eszopiclone", "ramelteon", "temazepam", "lorazepam",
      "barbiturate", "phenobarbital", "secobarbital", "pentobarbital", "thiopental",
      "barbiturate overdose", "respiratory depression", "narcotic antagonist", "naloxone",
      "naltrexone", "disulfiram", "acamprosate", "disulfiram", "alcohol withdrawal",
      "delirium", "delirium tremens", "seizures", "benzodiazepine", "phenobarbital",
      "antidepressant", "ssri", "sertraline", "fluoxetine", "paroxetine", "citalopram",
      "escitalopram", "venlafaxine", "duloxetine", "amitriptyline", "nortriptyline",
      "desipramine", "imipramine", "tricyclic antidepressant", "mao inhibitor", "phenelzine",
      "tranylcypromine", "isocarboxazid", "selegiline", "bupropion", "venlafaxine",
      "mirtazapine", "trazodone", "amitriptyline", "dosage", "side effect", "contraindication",
      "monitor", "follow up", "adverse", "reaction", "benefit", "risk", "therapeutic",
      "toxic", "overdose", "accidental", "intentional", "suicide attempt", "lethal dose",
      "body weight", "mg kg", "mcg kg", "dose", "frequency", "route", "oral", "iv",
      "subcutaneous", "intramuscular", "inhalation", "topical", "rectal", "vaginal",
      "intrathecal", "epidural", "spinal", "eye", "ear", "nose", "throat", "chest",
      "abdomen", "back", "limb", "joint", "muscle", "bone", "nerve", "vessel",
      "organ", "system", "body", "structure", "anatomy", "physiology", "embryology",
      "development", "maturation", "differentiation", "proliferation", "apoptosis",
      "angiogenesis", "hypertrophy", "atrophy", "hyperplasia", "metaplasia",
      "dysplasia", "carcinoma", "adenocarcinoma", "squamous cell carcinoma",
      "basal cell carcinoma", "melanoma", "sarcoma", "chondrosarcoma", "osteosarcoma",
      "leukemia", "lymphoma", "multiple myeloma", "plasma cell neoplasm", "myeloma",
      "leukemia", "chronic", "acute", "myeloid", "lymphoid", "CML", "CML", "CML",
      "ALL", "AML", "CML", "CLL", "MDS", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
      "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML",
      "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL",
      "AML", "CML", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
    ];

    const words = (front + " " + back).toLowerCase().split(/\s+/);
    const matches = words.filter(word => medicalWords.includes(word));

    if (matches.length >= 10) return { score: 0.9, description: "High medical term density" };
    if (matches.length >= 5) return { score: 0.7, description: "Moderate medical term density" };
    if (matches.length >= 2) return { score: 0.5, description: "Low medical term density" };
    return { score: 0.3, description: "Minimal medical terms" };
  }

  private analyzeQuestionFormat(front: string): { score: number; description: string } {
    const questionFormats = [
      "what", "which", "how", "why", "when", "where", "who", "most likely",
      "best describes", "most appropriate", "correct diagnosis", "diagnosis is",
      "treatment", "management", "next step", "most probable", "caused by",
      "associated with", "characterized by", "presenting with", "symptoms include",
      "findings show", "results in", "leads to", "difference between", "compare",
      "contrast", "distinguish", "mnemonic", "remember", "acronym",
      "identify", "recognize", "differentiate", "versus",
    ];

    const frontLower = front.toLowerCase();
    const matches = questionFormats.filter(fmt => frontLower.includes(fmt));

    if (matches.length >= 2) return { score: 0.3, description: "Complex question format" };
    if (matches.length >= 1) return { score: 0.5, description: "Standard question format" };
    return { score: 0.7, description: "Non-question format" };
  }

  private analyzeSpecialty(subject?: string, organSystem?: string): { score: number; description: string } {
    if (!subject && !organSystem) {
      return { score: 0.5, description: "No specialty specified" };
    }

    const specialty = (subject || organSystem || "").toLowerCase();
    const mappedDifficulty = this.config.specialties?.[specialty];

    if (mappedDifficulty) {
      const score = mappedDifficulty === "easy" ? 0.3 : mappedDifficulty === "medium" ? 0.6 : 0.9;
      return { score, description: `Specialty: ${specialty} (${mappedDifficulty})` };
    }

    return { score: 0.5, description: `Specialty: ${specialty}` };
  }

  private determineDifficulty(score: number): CardDifficulty {
    const thresholds = this.config.thresholds || { easy: 0.4, medium: 0.7 };

    if (score < thresholds.easy) return "easy";
    if (score < thresholds.medium) return "medium";
    return "hard";
  }

  private calculateConfidence(factors: DifficultyFactor[]): number {
    if (factors.length === 0) return 0.5;

    const weights = factors.map(f => f.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    return Math.min(1, avgWeight);
  }

  setConfig(config: Partial<DifficultyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createDifficultyClassifier(config?: DifficultyConfig): DifficultyClassifier {
  return new DifficultyClassifier(config);
}
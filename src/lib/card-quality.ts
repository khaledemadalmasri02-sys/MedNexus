export interface QualityIssue {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestion?: string;
}

export interface QualityScore {
  score: number;
  issues: QualityIssue[];
  passed: boolean;
}

export interface CardQualityConfig {
  minLength?: number;
  maxLength?: number;
  requireTags?: boolean;
  requireExplanation?: boolean;
  maxTags?: number;
  minTags?: number;
  checkDuplicates?: boolean;
  checkMedicalTerms?: boolean;
}

export class CardQualityService {
  private config: CardQualityConfig;

  constructor(config: CardQualityConfig = {}) {
    this.config = {
      minLength: 10,
      maxLength: 10000,
      requireTags: false,
      requireExplanation: false,
      maxTags: 10,
      minTags: 0,
      checkDuplicates: false,
      checkMedicalTerms: true,
      ...config,
    };
  }

  validateCard(front: string, back: string, tags?: string, explanation?: string): QualityScore {
    const issues: QualityIssue[] = [];

    const frontTrimmed = front?.trim() || "";
    const backTrimmed = back?.trim() || "";
    const explanationTrimmed = explanation?.trim() || "";
    const tagsValue = tags || "";

    if (frontTrimmed.length < this.config.minLength!) {
      issues.push({
        type: "front_too_short",
        severity: "medium",
        message: `Front is too short (${frontTrimmed.length} chars, minimum ${this.config.minLength})`,
        suggestion: "Add more detail to the question/prompt",
      });
    }

    if (frontTrimmed.length > this.config.maxLength!) {
      issues.push({
        type: "front_too_long",
        severity: "low",
        message: `Front is too long (${frontTrimmed.length} chars, maximum ${this.config.maxLength})`,
        suggestion: "Condense the question to be more concise",
      });
    }

    if (backTrimmed.length < this.config.minLength!) {
      issues.push({
        type: "back_too_short",
        severity: "medium",
        message: `Back is too short (${backTrimmed.length} chars, minimum ${this.config.minLength})`,
        suggestion: "Provide a more complete answer",
      });
    }

    if (backTrimmed.length > this.config.maxLength!) {
      issues.push({
        type: "back_too_long",
        severity: "low",
        message: `Back is too long (${backTrimmed.length} chars, maximum ${this.config.maxLength})`,
        suggestion: "Condense the answer to be more concise",
      });
    }

    if (this.config.requireTags && tagsValue.trim().length === 0) {
      issues.push({
        type: "missing_tags",
        severity: "medium",
        message: "Card is missing tags",
        suggestion: "Add relevant tags for organization and search",
      });
    }

    if (tagsValue && tagsValue.trim().length > 0) {
      const tagCount = tagsValue.split(",").filter((t: string) => t.trim().length > 0).length;
      if (tagCount < this.config.minTags!) {
        issues.push({
          type: "too_few_tags",
          severity: "low",
          message: `Card has too few tags (${tagCount}, minimum ${this.config.minTags})`,
          suggestion: "Add more descriptive tags",
        });
      }
      if (tagCount > this.config.maxTags!) {
        issues.push({
          type: "too_many_tags",
          severity: "low",
          message: `Card has too many tags (${tagCount}, maximum ${this.config.maxTags})`,
          suggestion: "Reduce tags to the most important ones",
        });
      }
    }

    if (this.config.requireExplanation && explanationTrimmed.length === 0) {
      issues.push({
        type: "missing_explanation",
        severity: "high",
        message: "Card is missing an explanation",
        suggestion: "Add a detailed explanation for the answer",
      });
    }

    const hasMedicalTerms = this.checkMedicalTermPresence(frontTrimmed, backTrimmed);
    if (this.config.checkMedicalTerms && !hasMedicalTerms) {
      issues.push({
        type: "no_medical_terms",
        severity: "medium",
        message: "Card does not contain medical terminology",
        suggestion: "Ensure the card covers actual medical content",
      });
    }

    const hasQuestionFormat = this.checkQuestionFormat(frontTrimmed);
    if (!hasQuestionFormat) {
      issues.push({
        type: "no_question_format",
        severity: "low",
        message: "Front does not appear to be a question or prompt",
        suggestion: "Reformat the front as a question (e.g., 'What is...', 'Which of the following...')",
      });
    }

    const score = this.calculateScore(issues);

    return {
      score,
      issues,
      passed: score >= 0.7,
    };
  }

  validateCardBatch(cards: Array<{ front: string; back: string; tags?: string; explanation?: string }>): QualityScore[] {
    return cards.map((card) => this.validateCard(card.front, card.back, card.tags, card.explanation));
  }

  private checkMedicalTermPresence(text: string, context: string): boolean {
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
      "appendectomy", "cholecystectomy", "hysterectomy", "mastectomy",
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
      "oxcarbazepine", "brivaracetam", "perampanel",
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
      "valve replacement", "pacemaker", "implantable cardioverter defibrillator",
      "cardiac resynchronization therapy", "ventricular assist device", "left ventricular assist device",
      "total artificial heart", "pediatric", "child", "infant", "neonate", "adolescent", "teenager",
      "school-age", "developmental milestone", "growth chart", "vaccination", "well-child visit",
      "routine care", "newborn", "congenital", "neonatal", "Congenital heart disease",
      "nephroblastoma", "hydronephrosis", "urogenital anomaly", "imperforate anus", "spina bifida",
      "myelomeningocele", "hydrocephalus", "craniosynostosis", "cleft lip", "cleft palate",
      "hirschsprung disease", "intestinal obstruction", "necrotizing enterocolitis", "feeds",
      "prematurity", "respiratory distress syndrome", "bronchopulmonary dysplasia",
      "retinopathy of prematurity", "rop", "developmental delay", "autism spectrum disorder",
      "down syndrome", "williams syndrome", "turner syndrome", "klinefelter syndrome",
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
      "leukemia", "chronic", "acute", "myeloid", "lymphoid", "CML", "ALL", "AML",
      "CLL", "MDS", "ALL", "AML", "CML", "ALL", "AML", "CML", "ALL", "AML",
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
    ];

    const words = (text + " " + context).toLowerCase().split(/\s+/);
    const matches = words.filter((word: string) => medicalWords.includes(word));

    if (matches.length >= 10) return true;
    if (matches.length >= 5) return true;
    if (matches.length >= 2) return true;
    return false;
  }

  private checkQuestionFormat(text: string): boolean {
    const questionIndicators = [
      "what", "which", "how", "why", "when", "where", "who", "most likely",
      "best describes", "most appropriate", "correct diagnosis", "diagnosis is",
      "treatment", "management", "next step", "most probable", "caused by",
      "associated with", "characterized by", "presenting with", "symptoms include",
      "findings show", "results in", "leads to", "difference between", "compare",
      "contrast", "distinguish", "mnemonic", "remember", "acronym",
      "identify", "recognize", "differentiate", "versus",
    ];

    const textLower = text.toLowerCase();
    return questionIndicators.some((indicator: string) => textLower.includes(indicator));
  }

  private calculateScore(issues: QualityIssue[]): number {
    if (issues.length === 0) return 1.0;

    const severityWeights: Record<string, number> = {
      critical: 0.0,
      high: 0.3,
      medium: 0.6,
      low: 0.8,
    };

    const maxPossibleScore = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);
    const actualScore = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);

    return Math.max(0, 1 - (maxPossibleScore - actualScore) / Math.max(1, issues.length));
  }

  setConfig(config: Partial<CardQualityConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createCardQualityService(config?: CardQualityConfig): CardQualityService {
  return new CardQualityService(config);
}
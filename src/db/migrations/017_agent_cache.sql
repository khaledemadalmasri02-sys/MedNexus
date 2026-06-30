-- Agent Cache Layer — Zero Changes to AI Providers or Models
-- Migration 017

-- Pre-saved knowledge base: curated Q&A pairs per agent
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  answer TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_knowledge_agent ON agent_knowledge(agent_id);
CREATE INDEX idx_knowledge_active ON agent_knowledge(is_active);
CREATE INDEX idx_knowledge_priority ON agent_knowledge(priority DESC);

-- AI response cache: stores generated answers for reuse
CREATE TABLE IF NOT EXISTS agent_response_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  question_original TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  confidence REAL NOT NULL DEFAULT 0.8,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_hit_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') + 86400)
);

CREATE INDEX idx_resp_cache_agent ON agent_response_cache(agent_id);
CREATE INDEX idx_resp_cache_hash ON agent_response_cache(question_hash);
CREATE INDEX idx_resp_cache_expires ON agent_response_cache(expires_at);

-- Cache analytics per agent per day
CREATE TABLE IF NOT EXISTS agent_cache_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  total_questions INTEGER NOT NULL DEFAULT 0,
  memory_hits INTEGER NOT NULL DEFAULT 0,
  knowledge_hits INTEGER NOT NULL DEFAULT 0,
  db_cache_hits INTEGER NOT NULL DEFAULT 0,
  api_calls INTEGER NOT NULL DEFAULT 0,
  avg_response_ms INTEGER NOT NULL DEFAULT 0,
  UNIQUE(agent_id, date)
);

CREATE INDEX idx_cache_analytics_date ON agent_cache_analytics(date);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA: 80+ pre-saved Q&As across all agents
-- These provide INSTANT answers — no API call needed
-- ═══════════════════════════════════════════════════════════

-- STUDY BUDDY (15 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('study-buddy', 'cardiology', 'What is heart failure?', '["heart", "failure", "cardiac", "chf"]', '## Heart Failure\n\nHF = heart cannot pump enough blood.\n\n### Types: HFrEF (EF<40%) and HFpEF (EF≥50%)\n### Most Common Cause: CAD\n### Symptoms: Dyspnea, orthopnea, edema, fatigue\n### Treatment: ACE inhibitors, beta-blockers, diuretics, SGLT2 inhibitors', 10),
('study-buddy', 'pharmacology', 'How do beta blockers work?', '["beta", "blocker", "mechanism", "drug"]', '## Beta Blockers\n\nBlock β-adrenergic receptors.\n- β1 (heart): ↓HR, ↓contractility\n- β2 (lungs): Bronchoconstriction (non-selective)\n\n### Selective: Metoprolol, Atenolol\n### Non-selective: Propranolol, Carvedilol\n### Uses: HTN, HF, angina, arrhythmias\n### Side Effects: Bradycardia, fatigue, bronchospasm', 10),
('study-buddy', 'pulmonology', 'What is COPD?', '["copd", "emphysema", "chronic", "bronchitis", "lung"]', '## COPD\n\nProgressive airflow limitation not fully reversible.\n\n### Types: Chronic bronchitis + Emphysema\n### Cause: Smoking (90%)\n### Dx: FEV1/FVC < 0.70\n### Treatment: Smoking cessation, bronchodilators (SABA/LAMA/LABA), steroids, O2', 10),
('study-buddy', 'nephrology', 'What is acute kidney injury?', '["aki", "kidney", "acute", "renal", "creatinine"]', '## AKI\n\nSudden ↓ kidney function over hours to days.\n\n### Criteria: ↑Cr ≥0.3 in 48h or ≥1.5× baseline\n### Causes: Prerenal (dehydration, HF), Intrinsic (ATN), Postrenal (BPH, stones)\n### Treatment: Fix cause, fluids, stop nephrotoxins, dialysis if severe', 9),
('study-buddy', 'endocrinology', 'What is type 2 diabetes?', '["diabetes", "type 2", "dm2", "insulin", "glucose"]', '## Type 2 Diabetes\n\nInsulin resistance + relative insulin deficiency.\n\n### Dx: FPG ≥126, HbA1c ≥6.5%\n### Treatment: Lifestyle → Metformin → SGLT2i/GLP-1 RA → Insulin\n### Complications: Retinopathy, nephropathy, neuropathy, CAD', 10),
('study-buddy', 'infectious', 'What is sepsis?', '["sepsis", "septic", "infection", "antibiotic"]', '## Sepsis\n\nLife-threatening organ dysfunction from dysregulated infection response.\n\n### qSOFA: RR≥22, GCS<15, SBP≤100 (≥2 = high risk)\n### Hour-1 Bundle: Lactate, cultures, antibiotics within 1h, 30mL/kg crystalloid, vasopressors for MAP≥65', 10),
('study-buddy', 'neurology', 'What is stroke?', '["stroke", "cva", "neuro", "ischemic", "hemorrhagic"]', '## Stroke\n\nSudden neurological deficit from vascular cause.\n\n### Ischemic (87%): tPA if <4.5h, thrombectomy if <24h\n### Hemorrhagic (13%): BP control, surgery\n### NIHSS: 0=none, 1-4=minor, 5-15=moderate, 16-20=mod-severe', 10),
('study-buddy', 'hematology', 'What is anemia?', '["anemia", "hemoglobin", "iron", "b12", "folate"]', '## Anemia\n\n↓ Hgb or RBC mass.\n\n### By MCV: Microcytic (<80): iron deficiency. Normocytic (80-100): blood loss. Macrocytic (>100): B12/folate.\n### Iron deficiency: ↓Ferritin, ↑TIBC\n### B12 deficiency: ↑MMA, neuro symptoms', 9),
('study-buddy', 'respiratory', 'What is pneumonia?', '["pneumonia", "lung", "infection", "cough", "xray"]', '## Pneumonia\n\nLung parenchyma infection.\n\n### CAP: S. pneumoniae most common. HAP: MRSA, Pseudomonas\n### CURB-65: Confusion, Urea>7, RR≥30, BP<90, age≥65 (0-1=out, 2=in, 3+=ICU)\n### Treatment: Amoxicillin (out), Ceftriaxone+Azithro (in)', 9),
('study-buddy', 'gastroenterology', 'What is hepatitis B?', '["hepatitis", "hbv", "liver", "jaundice"]', '## Hepatitis B\n\nDNA virus. Transmission: blood, sexual, vertical.\n\n### Serology: HBsAg=current, Anti-HBs=immunity, HBeAg=high infectivity\n### Treatment: Entecavir or Tenofovir\n### Prevention: Vaccine at 0,1,6 months', 9),
('study-buddy', 'musculoskeletal', 'What is rheumatoid arthritis?', '["rheumatoid", "arthritis", "ra", "joint", "rf"]', '## RA\n\nChronic symmetric inflammatory polyarthritis.\n\n### Features: MCP/PIP/wrist swelling, morning stiffness>1h, spares DIP\n### Dx: Anti-CCP (specific), RF (sensitive)\n### Treatment: Methotrexate → triple therapy → biologics', 8),
('study-buddy', 'dermatology', 'What is psoriasis?', '["psoriasis", "skin", "plaque", "scale"]', '## Psoriasis\n\nChronic inflammatory skin disease.\n\n### Features: Erythematous plaques, silvery scales, Auspitz sign\n### Treatment: Topical steroids (mild), phototherapy (moderate), biologics (severe)', 8),
('study-buddy', 'psychiatry', 'What is major depressive disorder?', '["depression", "mdd", "psychiatry", "ssri"]', '## MDD\n\n≥5 symptoms for ≥2 weeks including depressed mood or anhedonia.\n\n### Treatment: SSRIs (1st line), SNRIs, CBT. Resistant: ECT, ketamine', 8),
('study-buddy', 'immunology', 'What are hypersensitivity types?', '["hypersensitivity", "allergy", "ige", "type"]', '## Hypersensitivity (Gell & Coombs)\n\n- Type I (IgE): Anaphylaxis, minutes\n- Type II (IgG/IgM cytotoxic): Hemolytic disease, hours\n- Type III (Immune complex): SLE, hours-days\n- Type IV (T-cell): Contact dermatitis, 48-72h\n\n### Anaphylaxis: Epinephrine IM', 9);

-- DECK DOCTOR (10 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('deck-doctor', 'quality', 'What makes a good flashcard?', '["good", "flashcard", "quality", "tips"]', '## Good Flashcard Principles\n\n1. One concept per card\n2. Clear, specific questions\n3. Concise answers\n4. Use cloze deletion\n5. Add clinical context\n6. Include images\n7. Tag by topic\n\n❌ Bad: "Tell me about the heart"\n✅ Good: "What is the most common cause of heart failure?"', 10),
('deck-doctor', 'duplicates', 'How do I find duplicate cards?', '["duplicate", "same", "similar", "repeated"]', '## Finding Duplicates\n\n1. Go to Deck → Deck Doctor → Scan for Duplicates\n2. AI identifies similar cards with similarity score\n3. Review and merge or delete\n\n### Prevention: Search before adding, consistent naming, tag by topic', 9),
('deck-doctor', 'explanations', 'Should I add explanations?', '["explanation", "why", "understand"]', '## Yes! Explanations Improve Retention 40-60%\n\n### How: Click "Add Explanation" → Write 1-2 sentences → Use AI Generate\n### Modes: Full, Brief, Clinical, Mnemonic\n### Skip: Simple factual recall, already understood', 8),
('deck-doctor', 'card-count', 'How many cards per deck?', '["how many", "cards", "deck", "size"]', '## Optimal Deck Size\n\n- Subject review: 50-200 cards\n- Exam prep: 200-500 cards\n- Maximum: 1000 cards\n\n### Tips: Split large decks into sub-decks. 20-50 new/day. Quality > quantity.', 8),
('deck-doctor', 'mcq', 'How to create good MCQs?', '["mcq", "multiple", "choice", "options"]', '## Good MCQ Format\n\n- Stem: Clinical vignette\n- 4-5 plausible options\n- Single best answer\n- Explanation\n\n### Tips: Plausible options, no "all of above", similar length, test application', 9),
('deck-doctor', 'images', 'Should I add images?', '["image", "picture", "visual"]', '## Yes! Visual Memory Is 6x Better\n\n### Always: Histology, radiology, dermatology\n### Tips: High contrast, crop to relevant area, add labels, keep <500KB', 7),
('deck-doctor', 'review', 'How often to review?', '["review", "frequency", "spaced", "repetition"]', '## Review Schedule\n\n- New: 1 day | Learning: 1-6 days | Young: 6-14 days | Mature: 14-30+ days\n\n### Daily: Morning review (15-30min), afternoon new (10-20min), evening flagged (5-10min)\n### Key: Consistency > intensity. 20min/day > 3hrs/week.', 8),
('deck-doctor', 'import', 'How to import from Anki?', '["import", "anki", "apkg", "export"]', '## Import from Anki\n\n1. Anki: File → Export → Plain Text (.txt)\n2. AnkiGen: Library → Deck → Import\n3. Map fields: Front→Front, Back→Back, Tags→Tags\n4. Preview and confirm\n\n### Tips: Import in batches of 100-500. Run Deck Doctor after.', 7),
('deck-doctor', 'share', 'How to share decks?', '["share", "deck", "export", "classmate"]', '## Sharing Decks\n\n### Export: CSV, JSON, Markdown, PDF\n### How: Library → deck → Export → Choose format → Download\n### Coming: Shareable links, collaborative decks', 6),
('deck-doctor', 'tags', 'How to tag cards?', '["tag", "tags", "organize", "category"]', '## Tagging System\n\nUse: subject/topic/subtopic (e.g., cardiology/heart-failure)\n\n### Benefits: Filter by topic, identify weak areas, focused review\n### Best: Consistent naming, 2-5 tags per card, include subject + topic', 7);

-- EXAM SIMULATOR (8 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('exam-simulator', 'format', 'Best format for medical MCQs?', '["mcq", "format", "question", "exam", "usmle"]', '## Best MCQ Format: Clinical Vignette\n\n### Structure: Demographics → Chief complaint → History → Exam → Labs → Question\n\n### Example: A 65-year-old man with HTN+DM presents with crushing substernal chest pain radiating to left arm for 2h. ECG shows ST elevation in II, III, aVF. Troponin elevated.\n\n### Answer: Thrombolytic therapy (STEMI → immediate reperfusion)', 10),
('exam-simulator', 'difficulty', 'How to set question difficulty?', '["difficulty", "easy", "medium", "hard"]', '## Difficulty Levels\n\n- Easy: Direct recall — "What is the most common cause of X?"\n- Medium: Application — "A patient presents with... What is the diagnosis?"\n- Hard: Multi-step — "After treatment, they develop... What is the cause?"\n\n### Distribution: 40% Easy | 40% Medium | 20% Hard', 8),
('exam-simulator', 'timing', 'How long should an exam be?', '["time", "duration", "length", "exam"]', '## Exam Timing\n\n- 20 questions: 30 min (1.5 min/q)\n- 50 questions: 60 min (1.2 min/q)\n- 100 questions: 120 min (1.2 min/q)\n\n### USMLE: ~40q per 60min block', 8),
('exam-simulator', 'review', 'How to review exam results?', '["review", "result", "score", "performance"]', '## Reviewing Results\n\nAfter submission: Overall score, topic breakdown, question review with explanations.\n\n### Next Steps: Review incorrect, create new cards, focus on weak topics, retake', 7),
('exam-simulator', 'retake', 'Can I retake an exam?', '["retake", "retry", "again", "repeat"]', '## Yes! Retake Encouraged\n\n### Options: Same exam, similar exam (new questions), weak areas only\n### When: After reviewing incorrect (1-3 days) or studying weak topics (1 week)', 6),
('exam-simulator', 'custom', 'Can I create a custom exam?', '["custom", "create", "own", "exam"]', '## Custom Exams\n\n### Options: Select decks, set question count (10-100), set difficulty, set time limit, focus on weak areas\n### How: Exam → Generate → Select decks → Set count/difficulty → Generate', 7),
('exam-simulator', 'tips', 'Best exam-taking strategies?', '["strategy", "tips", "exam", "test"]', '## Exam Strategies\n\n1. Read carefully — Don''t rush\n2. Identify key words — "Most likely", "Best next step"\n3. Eliminate wrong answers\n4. Trust first instinct\n5. Manage time — ~1.2 min per question\n6. Flag and move on — Return to difficult questions', 8),
('exam-simulator', 'topics', 'How to choose exam topics?', '["topic", "subject", "coverage", "exam"]', '## Choosing Topics\n\n1. All Decks — Comprehensive review\n2. Specific Decks — Subject-specific exams\n3. Weak Areas Only — Targeted review\n4. AI-Generated Plan — AI analyzes progress and selects topics', 7);

-- CONTENT SUMMARIZER (6 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('content-summarizer', 'format', 'Best format for study notes?', '["format", "notes", "study", "structure"]', '## Best Note Format\n\n1. Title — Clear topic name\n2. Key Points — Bulleted main concepts\n3. Definitions — Term: Definition\n4. Clinical Pearls — High-yield facts\n5. Mnemonics — Memory aids\n6. Suggested Cards — Flashcards to create\n\n### Tips: Bullet points, bold key terms, 1-2 sentences per point, clinical relevance', 10),
('content-summarizer', 'length', 'How long should a summary be?', '["length", "long", "short", "summary"]', '## Summary Length\n\n- 1 page input → 5-10 bullet points\n- 5 pages → 10-20 bullets\n- 10+ pages → 20-40 bullets + sections\n\n### Quality > Quantity: 10 great points > 50 mediocre ones', 8),
('content-summarizer', 'file-types', 'What file types can I summarize?', '["file", "type", "upload", "pdf", "docx"]', '## Supported File Types\n\n- Documents: .pdf, .docx, .txt, .md\n- Images: .png, .jpg, .jpeg, .webp\n- Presentations: .pptx, .ppt\n- Spreadsheets: .xlsx, .xls, .csv\n\n### Max: 50MB per file, 20 files per upload', 7),
('content-summarizer', 'export', 'How to export summaries?', '["export", "download", "save", "summary"]', '## Export Formats\n\n- Markdown (editing), PDF (printing), JSON (importing), Plain Text (copying)\n\n### Create Deck: Click "Create Deck from Summary" → Review → Edit → Save', 6),
('content-summarizer', 'quality', 'How to improve summary quality?', '["quality", "better", "improve", "summary"]', '## Improving Quality\n\n### Input: Provide context, specify focus, set length, include key terms\n### Post-Processing: Review and edit, add notes, create cards for missed topics', 7),
('content-summarizer', 'batch', 'Can I summarize multiple files?', '["batch", "multiple", "files", "summarize"]', '## Yes! Batch Summarization\n\nUpload up to 20 files. AI processes each and generates a combined summary with sections per file.\n\n### Best For: Lecture series, multiple textbook chapters, comprehensive study guides', 6);

-- MNEMONIC GENERATOR (8 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('mnemonic-generator', 'cranial-nerves', 'Mnemonic for cranial nerves?', '["cranial", "nerves", "mnemonic", "12"]', '## Cranial Nerves\n\n**O**h **O**h **O**o **T**o **T**ouch **A**nd **F**eel **V**ery **G**ood **V**elvet **S**o **H**eavenly\n\n| # | Nerve | Type |\n|---|-------|------|\n| I | Olfactory | S |\n| II | Optic | S |\n| III | Oculomotor | M |\n| IV | Trochlear | M |\n| V | Trigeminal | B |\n| VI | Abducens | M |\n| VII | Facial | B |\n| VIII | Vestibulocochlear | S |\n| IX | Glossopharyngeal | B |\n| X | Vagus | B |\n| XI | Spinal Accessory | M |\n| XII | Hypoglossal | M |\n\n### S/M/B: **S**ome **S**ay **M**arry **M**oney **B**ut **M**y **B**rother **S**ays **B**ig **B**rains **M**atter **M**ore', 10),
('mnemonic-generator', 'carpal-bones', 'Mnemonic for carpal bones?', '["carpal", "bones", "wrist", "mnemonic"]', '## Carpal Bones\n\n**S**ome **L**overs **T**ry **P**ositions **T**hat **T**hey **C**an''t **H**andle\n\n- **S**caphoid, **L**unate, **T**riquetrum, **P**isiform\n- **T**rapezium, **T**rapezoid, **C**apitate, **H**amate\n\n💡 Scaphoid = most commonly fractured', 9),
('mnemonic-generator', 'brachial-plexus', 'Mnemonic for brachial plexus?', '["brachial", "plexus", "arm", "nerve"]', '## Brachial Plexus\n\n**M**y **A**unt **R**uby **T**ore **M**y **U**ncle''s **M**otorcycle\n\n- **M**usculocutaneous, **A**xillary, **R**adial, **T**horacodorsal, **M**edian, **U**lnar, **M**edial cutaneous', 9),
('mnemonic-generator', 'heart-sounds', 'Mnemonic for heart sounds?', '["heart", "sounds", "s1", "s2", "valve"]', '## Heart Sounds\n\n### Valve Order: "**M**y **B**rother **A**te **P**izza" = Mitral, Bicuspid, Aortic, Pulmonic\n\n### S1/S2: "**M**y **T**ry **A**t **P**umping" = Mitral+Tricuspid (S1), Aortic+Pulmonic (S2)\n\n### Extra: S3="Ken-tuc-ky", S4="Ten-nes-see"', 8),
('mnemonic-generator', 'tips', 'How to create mnemonics?', '["create", "own", "mnemonic", "tips"]', '## Creating Mnemonics\n\n### Techniques: Acronyms, Acrostics, Visual Association, Rhymes, Story Method, Memory Palace\n\n### Tips: Weird=Funny=Personal=Visual=Short = Memorable', 9),
('mnemonic-generator', 'pharmacology', 'Pharmacology mnemonics?', '["pharmacology", "drug", "medication", "pharma"]', '## Pharma Mnemonics\n\n### ACE Inhibitors — "CAPTOPRIL"\nCough, Angioedema, Potassium↑, Taste changes, Orthostatic hypotension, Pregnancy CI, Renal impairment, Impotence, Leukopenia\n\n### Beta Blockers: "B Blockers block B receptors"', 8),
('mnemonic-generator', 'anatomy', 'Anatomy mnemonics?', '["anatomy", "body", "bones"]', '## Anatomy Mnemonics\n\n### Skull: "STEP OF 6" = Sphenoid, Temporal, Ethmoid, Parietal, Occipital, Frontal\n\n### Vertebrae: "Breakfast 7, Lunch 12, Dinner 5" = C7, T12, L5', 7),
('mnemonic-generator', 'pathology', 'Pathology mnemonics?', '["pathology", "disease", "path"]', '## Pathology Mnemonics\n\n### Pancreatitis: "I GET SMASHED" = Idiopathic, Gallstones, Ethanol, Trauma, Steroids, Mumps, Autoimmune, Scorpion, Hyperlipidemia, ERCP, Drugs\n\n### Microcytic Anemia: "TAILS" = Thalassemia, ACD, Iron deficiency, Lead, Sideroblastic', 8);

-- PROGRESS COACH (6 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('progress-coach', 'getting-started', 'I just started. What to do first?', '["start", "begin", "new", "first"]', '## First Steps\n\n1. Create deck → Library → "+ New Deck"\n2. Generate cards → Upload PDF or paste notes\n3. Study → Go to Study → Start\n4. Set goals → Settings → Study Preferences\n5. Enable notifications\n\n### Tips: 10-20 new cards/day, study daily, rate honestly', 10),
('progress-coach', 'streak', 'How to build a study streak?', '["streak", "daily", "consistency", "habit"]', '## Building Streaks\n\n### Tips: Start small (5min), fixed time, reminders, don''t break chain, use streak freezes\n\n### Milestones: 7d=Week Warrior, 30d=Month Master, 100d=Century Club', 9),
('progress-coach', 'motivation', 'Losing motivation?', '["motivation", "bored", "tired", "give up"]', '## Staying Motivated\n\n### Strategies: Set specific goals, track progress, celebrate milestones, study with friends, mix up modes, take breaks\n\n### Quick Boosters: Check mastery, review streak, see achievements', 8),
('progress-coach', 'weak-areas', 'How to improve weak areas?', '["weak", "weakness", "improve", "struggle"]', '## Improving Weak Areas\n\n1. Identify: Dashboard → Mastery, Deck Stats\n2. Practice: Smart Review, filter by tag, increase frequency\n3. Track: Re-take exams, watch mastery increase', 8),
('progress-coach', 'time-management', 'How to manage study time?', '["time", "management", "schedule", "pomodoro"]', '## Time Management\n\n### Pomodoro: 25min study + 5min break. After 4 cycles → 15-30min break\n\n### Daily: Morning review (15-30min), afternoon new (10-20min), evening flagged (5-10min)\n\n### When Busy: 5min counts, speed mode, phone study, voice mode', 7),
('progress-coach', 'goals', 'How to set realistic goals?', '["goal", "target", "realistic", "daily"]', '## Setting Goals\n\n### Daily: Beginner (10-15 new, 20-30 review, 20-30min), Intermediate (20-30 new, 40-60 review, 30-45min), Advanced (40-50 new, 80-100 review, 45-60min)\n\n### How: Settings → Study Preferences → Set daily limits\n### Tips: Start low, be consistent, adjust as needed', 7);

-- IMAGE ANALYZER (4 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('image-analyzer', 'supported', 'What image types are supported?', '["image", "types", "supported", "upload", "medical"]', '## Supported Image Types\n\n- Histology, Radiology (X-ray/CT/MRI/US), Dermatology, Ophthalmology, Pathology, ECGs, Diagrams\n- Formats: PNG, JPG, JPEG, WebP (max 50MB)', 10),
('image-analyzer', 'how-it-works', 'How does image analysis work?', '["how", "work", "process", "image"]', '## How It Works\n\n1. Upload image\n2. AI analyzes (uses configured vision model)\n3. Generates 3-5 flashcards\n4. Review and save to deck\n\n### Tips: High-res, good lighting, crop to relevant area. Always verify AI content.', 8),
('image-analyzer', 'tips', 'How to get best results?', '["tips", "best", "results", "image"]', '## Best Results\n\n- High resolution (≥1024x1024)\n- Good lighting and contrast\n- Crop to relevant area\n- Include labels if present', 7),
('image-analyzer', 'common-issues', 'Common issues?', '["issue", "problem", "error", "image"]', '## Common Issues\n\n- Blurry images → AI may miss details\n- Low contrast → Structures not visible\n- Too much text → AI focuses on text not image\n\n### Solution: Upload clear, high-contrast, cropped images', 6);

-- VOICE TUTOR (4 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('voice-tutor', 'setup', 'How to set up voice tutor?', '["setup", "voice", "tutor", "start"]', '## Voice Tutor Setup\n\n1. Go to Study → Voice Mode\n2. Allow microphone access\n3. Adjust voice speed in Settings\n4. Start studying!\n\n### Requirements: Chrome/Edge, microphone permission, stable internet', 10),
('voice-tutor', 'commands', 'What voice commands are available?', '["command", "voice", "say", "speak"]', '## Voice Commands\n\n- "Next" — Next card\n- "Repeat" — Repeat question\n- "Explain" — Hear explanation\n- "I don''t know" — Reveal answer\n- "Known" / "Unknown" — Rate card\n- "Stop" — End session', 8),
('voice-tutor', 'tips', 'Tips for voice study?', '["tips", "voice", "study"]', '## Voice Study Tips\n\n- Speak clearly at normal pace\n- Use headphones to reduce echo\n- Study in quiet environment\n- Use "Explain" for detailed explanations', 7),
('voice-tutor', 'troubleshooting', 'Voice tutor not working?', '["not working", "problem", "issue", "voice"]', '## Troubleshooting\n\n1. Check microphone permission\n2. Refresh page\n3. Try Chrome or Edge\n4. Check internet connection\n5. Reduce background noise\n\n### Alternative: Use text-based study mode', 6);

-- COLLABORATIVE STUDY (4 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('collaborative-study', 'setup', 'How to create a study room?', '["setup", "create", "room", "collaborative", "group"]', '## Creating a Study Room\n\n1. Go to Collaborative Study\n2. Click "Create Room"\n3. Select decks to study\n4. Share room code with friends\n5. Start when everyone joins', 10),
('collaborative-study', 'rules', 'How does group study work?', '["rules", "how", "work", "group"]', '## How It Works\n\n1. AI generates questions one at a time\n2. Each participant answers (Known/Unknown)\n3. AI tracks group performance\n4. Identifies topics everyone struggles with\n5. End-of-session summary with recommendations', 8),
('collaborative-study', 'tips', 'Tips for group study?', '["tips", "group", "study"]', '## Group Study Tips\n\n- 2-6 participants is ideal\n- Choose decks everyone has studied\n- Discuss difficult questions together\n- Use summary to plan next session\n- Make it regular — same time each week', 7),
('collaborative-study', 'troubleshooting', 'Room connection issues?', '["connection", "issue", "problem", "room"]', '## Troubleshooting\n\n1. Check internet connection\n2. Refresh page\n3. Re-enter room code\n4. Try Chrome or Edge\n5. Check if room expired (24h inactivity)', 6);

-- SMART REVIEW (6 Q&As)
INSERT INTO agent_knowledge (agent_id, category, question, keywords, answer, priority) VALUES
('smart-review', 'how-it-works', 'How does smart review work?', '["how", "work", "smart", "review", "adaptive"]', '## Smart Review\n\nAI analyzes your study history and generates targeted review sessions.\n\n### Analyzes: Weak topics (low accuracy), overdue topics (7+ days), at-risk cards\n### Output: Prioritized 20-50 cards with reasoning and estimated time', 10),
('smart-review', 'vs-standard', 'Difference from standard review?', '["difference", "standard", "regular", "vs"]', '## Smart vs Standard\n\n### Standard: Follows SM-2 only, cards due by date\n### Smart: Analyzes patterns, targets weak areas, identifies overdue topics, prioritizes at-risk cards', 8),
('smart-review', 'when-to-use', 'When to use smart review?', '["when", "use", "smart", "review"]', '## When to Use\n\n- Before exams (targeted preparation)\n- When many due cards\n- When you want to focus on weak areas\n- After a break (catch up efficiently)', 7),
('smart-review', 'customize', 'Can I customize smart review?', '["customize", "settings", "configure"]', '## Customization\n\n- Select specific decks\n- Set session size (10-100 cards)\n- Focus on specific topics/tags\n- Set time limit\n- Include/exclude new cards', 7),
('smart-review', 'frequency', 'How often to use smart review?', '["often", "frequency", "how"]', '## Recommended Frequency\n\n- Daily for regular study\n- Before exams for intensive review\n- After breaks to catch up\n- 2-3 times per week mixed with standard review', 6),
('smart-review', 'accuracy', 'How accurate is smart review?', '["accurate", "accuracy", "smart"]', '## Accuracy\n\nHighly effective because it uses your actual study data, identifies real patterns, adapts to your weaknesses, and improves over time.\n\n### Tip: Rate cards honestly for best results', 6);

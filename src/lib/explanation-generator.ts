import { aiService, Message } from "./ai.js";
import { logger } from "./logger.js";

export type ExplanationMode = "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap";

interface ExplanationResult {
  mode: ExplanationMode;
  content: string;
}

// Mode prompts for generating explanations
const MODE_PROMPTS: Record<ExplanationMode, string> = {
  full: `Generate a comprehensive and detailed breakdown of this medical concept, suitable for in-depth learning and understanding.

## Structure and Content Guidelines

### Title
The title should clearly state "Full Explanation" and the specific topic.

### Introduction
Begin with a concise introduction that briefly defines the topic.

### Core Content Sections
Organize the main body into logical sections using Markdown headings:

- **Overview**: Provide a general understanding and context
- **Etiology/Pathophysiology**: Discuss causes and mechanisms
- **Clinical Presentation**: Describe signs, symptoms, and manifestations
- **Diagnosis**: Detail methods and criteria used to diagnose
- **Management/Treatment**: Outline therapeutic approaches
- **Complications**: Discuss potential adverse outcomes
- **Key Takeaways**: Conclude with critical information as bullet points

### Formatting
- Use appropriate Markdown headings (##, ###)
- Write detailed, well-structured paragraphs
- Utilize bullet points or numbered lists
- Use **bold** text for key terms
- Use Markdown blockquotes (>) for important notes, clinical pearls, or warnings
- Use Markdown pipe tables for data presentation`,

  revision: `Generate concise revision notes for medical exam preparation.

## EXACT OUTPUT FORMAT - Copy this structure exactly:

# Revision Notes: [Topic Name]

## Introduction
These revision notes focus on the critical aspects of [topic], designed for rapid recall and exam preparation.

## Key Concepts
* **[Term]**: [Definition]
* **[Term]**: [Definition]
* **[Term]**: [Definition]

## Must-Know Information
> **Crucial Distinction**: [Important fact]
> **Misconception**: [Common misconception correction]

## High-Frequency Exam Topics

| Question | Answer |
| :------- | :----- |
| [Question] | [Answer] |
| [Question] | [Answer] |
| [Question] | [Answer] |

## Common Pitfalls
* **[Pitfall]**: [Warning]
* **[Pitfall]**: [Warning]

## CRITICAL RULES:
- Start with "# Revision Notes: [Topic]"
- Use ONLY these section headings: ## Introduction, ## Key Concepts, ## Must-Know Information, ## High-Frequency Exam Topics, ## Common Pitfalls
- Use * for bullet points (not - or +)
- Use > for blockquotes
- Use pipe table with "Question" and "Answer" columns
- Use **bold** for important terms
- Do NOT add any other sections
- Do NOT use code blocks or emojis
- Return ONLY the Markdown content

EXAMPLE OUTPUT:
# Revision Notes: Myocardial Infarction

## Introduction
These revision notes focus on the critical aspects of myocardial infarction, designed for rapid recall and exam preparation.

## Key Concepts
* **Definition**: Necrosis of myocardial tissue due to prolonged ischemia
* **Most common cause**: Coronary artery thrombosis
* **Key biomarker**: Troponin I or T elevation

## Must-Know Information
> **Crucial Distinction**: STEMI shows ST elevation on ECG; NSTEMI shows ST depression or T wave inversion
> **Misconception**: MI always presents with chest pain - atypical presentations are common in elderly and diabetics

## High-Frequency Exam Topics

| Question | Answer |
| :------- | :----- |
| What is the gold standard for MI diagnosis? | Coronary angiography |
| What is the first-line treatment for STEMI? | Primary PCI within 90 minutes |
| Which MI location has the worst prognosis? | Anterior wall MI |

## Common Pitfalls
* **Atypical presentations**: Women and diabetics may present without chest pain
* **Timing of biomarkers**: Troponin may not elevate until 4-6 hours after symptom onset`,

  osce: `Generate a structured clinical scenario suitable for an Objective Structured Clinical Examination (OSCE) station. The content should guide the user through a realistic patient encounter, focusing on clinical reasoning, examination skills, and management planning.

## Structure and Content Guidelines

### Title
The title should clearly state the study mode and the clinical case or topic. For example: "OSCE Scenario: Patient Presenting with Shortness of Breath (Hypoxemia)".

### Introduction
Provide a brief overview setting the stage for the clinical scenario, outlining the context of the encounter (e.g., Emergency Department, General Practice clinic).

### Core Content Sections

#### Patient Presentation
Detail the patient's demographics (age, gender), chief complaint, and relevant history of presenting illness. Include pertinent past medical history, medications, and social history.

#### Examination Findings
Describe the relevant physical examination findings. This should include vital signs and specific findings related to the chief complaint (e.g., respiratory rate, oxygen saturation, presence of cyanosis).

#### Investigations
List key diagnostic tests that should be ordered and provide expected results relevant to the scenario (e.g., Arterial Blood Gas results, Chest X-ray findings).

#### Differential Diagnoses
Present a table of potential diagnoses, including the most likely diagnosis and other important considerations, with brief justifications for each.

#### Management Plan
Outline the initial steps for managing the patient, including immediate interventions and further management strategies.

#### Communication Skills Focus
Highlight specific points for patient interaction, such as explaining the diagnosis, discussing treatment options, or addressing patient concerns.

### Formatting Instructions
- Use appropriate Markdown headings (##, ###) to structure the scenario logically
- Use clear paragraphs for the patient presentation and examination findings
- Use bullet points for investigations, management steps, and communication focus points
- Use a Markdown pipe table for the Differential Diagnoses section
- Use **bold** text to highlight critical findings, vital signs, or key management steps

## Example Output Structure:

# OSCE Scenario: Patient Presenting with Chest Pain

## Introduction
You are a junior doctor in the Emergency Department. A patient has just been triaged with acute chest pain. You are required to assess and manage this patient.

## Patient Presentation
**Patient:** Mr. John Doe, a 55-year-old male.
**Chief Complaint:** Severe central chest pain radiating to the left arm.
**History of Presenting Illness:** The pain started 30 minutes ago while exercising. He describes it as "crushing" and rates it 8/10.
**Past Medical History:** Hypertension, Type 2 Diabetes.
**Medications:** Metformin, Lisinopril.
**Social History:** Smokes 20 cigarettes per day.

## Examination Findings
**Vital Signs:**
* Heart Rate: 105 bpm (tachycardic)
* Blood Pressure: 160/95 mmHg
* Respiratory Rate: 22 breaths/min
* Oxygen Saturation: 94% on room air
* Temperature: 36.8°C

**General Appearance:** The patient appears diaphoretic and in visible distress.
**Cardiovascular Examination:** Tachycardic, regular rhythm. Normal heart sounds.

## Investigations
* **ECG:** Expected to show ST elevation in leads II, III, aVF (inferior STEMI)
* **Troponin:** Expected to be elevated
* **Chest X-ray:** May show pulmonary edema
* **Echocardiogram:** May show regional wall motion abnormalities

## Differential Diagnoses

| Diagnosis | Justification |
| :--- | :--- |
| **STEMI** | Most likely given crushing chest pain, radiation, risk factors, and expected ECG changes |
| **Aortic Dissection** | Must be considered with chest pain and hypertension |
| **Pulmonary Embolism** | Can present with chest pain and tachycardia |
| **Pericarditis** | Can cause chest pain, but typically pleuritic |

## Management Plan
* **Immediate:** Administer aspirin 300mg, morphine for pain, and high-flow oxygen if hypoxic
* **Primary PCI:** Arrange urgent cardiac catheterization if STEMI confirmed
* **Monitoring:** Continuous cardiac monitoring

## Communication Skills Focus
* Explain the suspected diagnosis (heart attack) clearly to the patient
* Discuss the need for urgent treatment (angioplasty)
* Address the patient's anxiety and provide reassurance

IMPORTANT: Return ONLY the formatted Markdown content following the exact structure above.`,

  brief: `Provide a brief, bullet-point summary of the key points.

Format as concise bullet points focusing on:
- Core concept
- Key facts
- Clinical relevance
- Quick recall points`,

  mnemonic: `Generate a memorable mnemonic device and its explanation for the given medical concept or list, aiding in recall and retention of complex information.

## Structure and Content Guidelines

### Title
The title should clearly state the study mode and the concept or list the mnemonic is designed for. For example: "Mnemonic: Cranial Nerves (Oh Oh Oh To Touch And Feel Very Good Velvet, Ah Heaven!)".

### Introduction
Briefly introduce the purpose of the mnemonic, explaining that it is a tool to simplify the memorization of a specific piece of medical information.

### Core Content Sections

#### The Mnemonic
Present the actual mnemonic device. This could be an acronym, an acrostic, a rhyme, or any other memory aid. It should be distinct and easy to remember.

#### Explanation
Provide a clear breakdown of how the mnemonic works. For acrostics, detail what each letter or word in the mnemonic stands for. For other types, explain the logic or association behind it.

#### Application
Illustrate how to use the mnemonic in practice. This might involve listing the items it helps to remember in order, or providing a brief example of its utility.

### Formatting Instructions
- Use appropriate Markdown headings (##, ###) for clear organization
- Use **bold** text to highlight the mnemonic itself and the key terms it represents
- Use bullet points or numbered lists to present the items that the mnemonic helps to recall
- Ensure the explanation is straightforward and easy to understand

## Example Output Structure:

# Mnemonic: Cranial Nerves

## Introduction
This mnemonic is designed to help medical students and professionals easily recall the 12 cranial nerves in their anatomical order.

## The Mnemonic
**O**h **O**h **O**h **T**o **T**ouch **A**nd **F**eel **V**ery **G**ood **V**elvet, **A**h **H**eaven!

## Explanation
Each capitalized letter in the mnemonic corresponds to the first letter of the 12 cranial nerves, in order from I to XII:

* **O**h - Olfactory (I)
* **O**h - Optic (II)
* **O**h - Oculomotor (III)
* **T**o - Trochlear (IV)
* **T**ouch - Trigeminal (V)
* **A**nd - Abducens (VI)
* **F**eel - Facial (VII)
* **V**ery - Vestibulocochlear (VIII)
* **G**ood - Glossopharyngeal (IX)
* **V**elvet - Vagus (X)
* **A**h - Accessory (XI)
* **H**eaven! - Hypoglossal (XII)

## Application
When trying to remember the cranial nerves, simply recite the mnemonic and associate each word with the corresponding cranial nerve in sequence.

IMPORTANT: Return ONLY the formatted Markdown content following the exact structure above.`,

  clinical: `Generate a high-yield clinical insight or practical tip that offers valuable, concise guidance for medical practice or understanding. The content should be impactful and easily applicable.

## Structure and Content Guidelines

### Title
The title should clearly state the study mode and the specific insight or tip. For example: "Clinical Pearl: The Importance of Early Mobilization Post-Surgery".

### Introduction
Begin with a brief introduction that sets the context for the clinical pearl, explaining its relevance or the common scenario it addresses.

### Core Content Sections

#### The Pearl
Present the core clinical insight or tip. This should be a concise, memorable statement, highlighted using a blockquote to draw immediate attention.

#### Clinical Significance
Explain *why* this pearl is important. Discuss the underlying physiological, pathological, or practical reasons that make this insight valuable in a clinical setting.

#### Practical Application
Describe *how* to apply this pearl in practice. Provide concrete examples or scenarios where this tip would be particularly useful or make a difference in patient care.

### Formatting Instructions
- Use appropriate Markdown headings (##) for clear organization
- The Pearl section MUST be presented within a Markdown blockquote (>)
- Use **bold** text for key terms, the pearl itself, or critical aspects
- Ensure the entire content is concise and to the point

## Example Output Structure:

# Clinical Pearl: The Silent Killer of Post-Op Patients

## Introduction
This clinical pearl highlights a critical, yet often overlooked, complication in post-operative patients that can have severe consequences if not recognized and managed promptly.

## The Pearl
> **Always consider Pulmonary Embolism (PE) in any post-operative patient with unexplained dyspnea, tachycardia, or sudden onset chest pain, even if vital signs are initially stable.**

## Clinical Significance
Post-operative patients are at significantly increased risk for venous thromboembolism (VTE), including deep vein thrombosis (DVT) and pulmonary embolism (PE), due to immobility, surgical trauma, and systemic inflammatory responses. PE can be rapidly fatal, and its symptoms can be subtle or mimic other post-operative complications (e.g., atelectasis, pneumonia). A high index of suspicion is crucial for early diagnosis and intervention.

## Practical Application
* **Routine Assessment:** Incorporate a focused assessment for PE risk factors and symptoms into daily post-operative rounds.
* **Early Mobilization:** Actively encourage and facilitate early ambulation as per surgical protocols to reduce stasis.
* **Prophylaxis:** Ensure appropriate VTE prophylaxis (pharmacological and/or mechanical) is prescribed and administered.
* **Investigate New Symptoms:** Do not dismiss new onset dyspnea or chest pain lightly. Consider D-dimer, ABG, and potentially a CT pulmonary angiogram (CTPA) if clinical suspicion is moderate to high.
* **Patient Education:** Educate patients on symptoms of DVT/PE and encourage them to report any concerns promptly.

IMPORTANT: Return ONLY the formatted Markdown content following the exact structure above.`,

  testtrap: `Generate content that highlights common exam pitfalls, trick questions, or frequent misconceptions related to a medical concept, along with strategies to avoid them.

## Structure and Content Guidelines

### Title
The title should clearly state the study mode and the specific concept or scenario that is a common test trap. For example: "Test Trap: Differentiating Between Hypoxia and Hypoxemia".

### Introduction
Begin with a brief introduction explaining that this section is designed to expose common errors and guide students on how to navigate tricky exam questions or concepts.

### Core Content Sections

#### The Trap
Describe the common misconception, trick question, or area where students frequently make errors. This should clearly articulate what the trap is.

#### Why it's a Trap
Explain the underlying reason for the error. This could be due to similar-sounding terms, subtle differences in definitions, common misunderstandings, or deliberate misdirection in question phrasing.

#### How to Avoid
Provide clear, actionable strategies and correct understanding to prevent falling into the trap. This section should offer practical advice for students.

#### Example Question (Optional)
Include a simple example question that illustrates the test trap, followed by an explanation of the correct answer and why other options are incorrect.

### Formatting Instructions
- Use appropriate Markdown headings (##) for clear organization
- Use clear paragraphs to describe The Trap and Why it's a Trap
- Use bullet points for How to Avoid strategies
- Use **bold** text to highlight key terms, the trap itself, or critical distinctions
- Use blockquotes (>) for the Example Question and its explanation

## Example Output Structure:

# Test Trap: Differentiating Between Hypoxia and Hypoxemia

## Introduction
This section addresses a common source of confusion in medical exams: the precise distinction between hypoxia and hypoxemia.

## The Trap
Students often use the terms **hypoxia** and **hypoxemia** interchangeably, or incorrectly assume they always occur together.

## Why it's a Trap
**Hypoxemia** refers specifically to a *low partial pressure of oxygen in the arterial blood*. **Hypoxia** is a broader term referring to *inadequate oxygen supply to the tissues*. Hypoxemia is a common cause of hypoxia, but hypoxia can occur without hypoxemia.

## How to Avoid
* **Memorize Definitions:** Clearly define and differentiate between hypoxemia (low blood oxygen) and hypoxia (low tissue oxygen)
* **Understand Causes:** Recognize that hypoxemia is a *cause* of hypoxic hypoxia, but other types of hypoxia exist
* **Context is Key:** Pay close attention to the clinical scenario and question phrasing

## Example Question
> A patient presents with normal arterial blood gas values but has severe anemia and tissue ischemia. Which best describes the condition?
> A) Hypoxemia B) Hypoxic Hypoxia C) Anemic Hypoxia D) Circulatory Hypoxia

> **Correct Answer: C) Anemic Hypoxia.**
> **Explanation:** The patient has normal PaO2, ruling out hypoxemia. The issue is reduced oxygen-carrying capacity due to anemia.

IMPORTANT: Return ONLY the formatted Markdown content following the exact structure above.`,
};

/**
 * Generate explanation for a specific mode
 */
async function generateExplanation(
  front: string,
  back: string,
  mode: ExplanationMode
): Promise<string> {
  const systemPrompt = `You are an expert medical educator creating comprehensive study materials for medical students. ${MODE_PROMPTS[mode]}

IMPORTANT: Return ONLY the formatted Markdown content. Do not include any meta-commentary.`;

  const userPrompt = `Generate a ${mode} explanation for this medical concept:

Question/Front: ${front}
Answer/Back: ${back}`;

  return aiService.complete([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.7, maxTokens: mode === "full" ? 16384 : 8192 });
}

/**
 * Generate all study mode explanations for a card
 * Returns an object with all explanations
 */
export async function generateAllExplanations(
  front: string,
  back: string
): Promise<{
  full: string;
  revision: string;
  osce: string;
  brief: string;
  mnemonic: string;
  clinical: string;
  testtrap: string;
}> {
  const modes: ExplanationMode[] = ["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"];
  const results: Record<ExplanationMode, string> = {
    full: "",
    revision: "",
    osce: "",
    brief: "",
    mnemonic: "",
    clinical: "",
    testtrap: "",
  };

  // Generate explanations in parallel for speed
  const promises = modes.map(async (mode) => {
    try {
      const content = await generateExplanation(front, back, mode);
      return { mode, content };
    } catch (err) {
      logger.error({ err, mode }, `Failed to generate ${mode} explanation`);
      return { mode, content: "" };
    }
  });

  const completed = await Promise.all(promises);
  
  for (const { mode, content } of completed) {
    results[mode] = content;
  }

  return results;
}

/**
 * Generate explanations for multiple cards
 * Returns a map of card index to explanations
 */
export async function generateExplanationsForCards(
  cards: Array<{ front: string; back: string }>
): Promise<Array<{
  full: string;
  revision: string;
  osce: string;
  brief: string;
  mnemonic: string;
  clinical: string;
}>> {
  const results: Array<{
    full: string;
    revision: string;
    osce: string;
    brief: string;
    mnemonic: string;
    clinical: string;
  }> = [];

  // Generate explanations for each card sequentially to avoid rate limits
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    logger.info({ cardIndex: i + 1, total: cards.length }, "Generating explanations for card");
    
    try {
      const explanations = await generateAllExplanations(card.front, card.back);
      results.push(explanations);
    } catch (err) {
      logger.error({ err, cardIndex: i }, "Failed to generate explanations for card");
      // Push empty explanations on error
      results.push({
        full: "",
        revision: "",
        osce: "",
        brief: "",
        mnemonic: "",
        clinical: "",
      });
    }
  }

  return results;
}

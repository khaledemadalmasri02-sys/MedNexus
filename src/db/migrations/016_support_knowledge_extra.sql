-- Additional support knowledge base entries
-- Migration 016

INSERT OR IGNORE INTO support_knowledge (category, question, keywords, answer, answer_plain) VALUES
('study', 'How do I use Study Buddy?',
  '["study buddy", "ai", "chat", "tutor", "ask", "question", "help"]',
  '## Study Buddy AI Tutor\n\nStudy Buddy is your AI-powered study companion.\n\n### How to Use:\n1. Go to **Chat** page (or click the support bubble)\n2. Type any question about your studies\n3. Study Buddy responds instantly with explanations\n\n### What It Can Do:\n- **Explain concepts** in simple terms\n- **Create clinical vignettes** for practice\n- **Quiz you** on topics from your decks\n- **Identify weak areas** from your study history\n- **Generate mnemonics** for memorization\n\n### Tips:\n- Be specific with your questions for better answers\n- Reference your deck context for personalized help\n- Use the quick prompts for common tasks\n\nStudy Buddy uses the same AI models as the card generation system.',
  'Study Buddy: Go to Chat page, type any question. It explains concepts, creates vignettes, quizzes you, identifies weak areas, and generates mnemonics. Be specific for better answers. Uses same AI models as card generation.'),

('study', 'What is the Deck Doctor?',
  '["deck doctor", "health", "issues", "fix", "improve", "quality", "analyze"]',
  '## Deck Doctor\n\nThe Deck Doctor analyzes your flashcard decks and suggests improvements.\n\n### What It Checks:\n- **Duplicate cards** - Finds similar questions\n- **Missing explanations** - Cards without study notes\n- **Vague questions** - Cards that are too short or unclear\n- **Poor MCQs** - Multiple choice with too few options\n- **Overall health score** - 0-100 rating\n\n### How to Use:\n1. Go to **Deck Doctor** page\n2. Select a deck to analyze\n3. Review the issues found\n4. Click **"Fix"** to auto-resolve each issue\n\n### Auto-Fix Options:\n- **Generate explanation** - AI creates study notes\n- **Rewrite** - Makes questions more specific\n- **Merge** - Combines duplicate cards\n- **Add clinical vignette** - Converts to case-based format\n\nAll fixes use AI to improve your deck quality automatically.',
  'Deck Doctor: Analyzes decks for duplicates, missing explanations, vague questions, poor MCQs. Gives a 0-100 health score. Go to Deck Doctor page, select deck, review issues, click Fix. Auto-fixes: generate explanation, rewrite, merge duplicates, add clinical vignette.'),

('features', 'How do I create an exam?',
  '["exam", "mock", "test", "quiz", "generate", "practice", "simulator"]',
  '## Exam Simulator\n\nCreate AI-powered mock exams from your flashcard decks.\n\n### How to Create an Exam:\n1. Go to **Exam** page\n2. Select one or more decks\n3. Set number of questions (10-100)\n4. Set duration (10-180 minutes)\n5. Click **"Generate Exam"**\n6. The AI creates clinical vignette-style MCQs\n\n### Exam Features:\n- **Timed mode** - Realistic exam conditions\n- **Topic breakdown** - See performance by subject\n- **Detailed explanations** - Learn from mistakes\n- **Weak topic identification** - Know what to study\n- **Score history** - Track improvement over time\n\n### Question Difficulty:\n- 40% Easy\n- 40% Medium\n- 20% Hard\n\nAll questions include detailed explanations for the correct answer.',
  'Exam Simulator: Go to Exam page, select decks, set question count and duration, click Generate Exam. Features: timed mode, topic breakdown, explanations, weak topic ID, score history. Difficulty: 40% easy, 40% medium, 20% hard. All questions have explanations.'),

('troubleshooting', 'How do I contact support?',
  '["contact", "support", "help", "email", "chat", "feedback", "report"]',
  '## Contacting Support\n\n### AI Support Chat (Fastest)\n1. Go to **Chat** page\n2. Ask any question\n3. Get instant AI-powered answers\n\n### Help Center\n1. Go to **Help** page\n2. Search the knowledge base\n3. Browse FAQ, Pricing, and About tabs\n\n### Feedback\n1. After any AI response, click the **thumbs up/down** buttons\n2. Or use the feedback form in the Help Center\n\n### Email\nFor account-specific issues, use the feedback form with your email and account details.\n\n### Response Times:\n- **AI Chat**: Instant\n- **Help Center**: Self-service, instant\n- **Email/Feedback**: Within 24 hours',
  'Contact support: AI Chat (fastest) - go to Chat page. Help Center - search knowledge base at Help page. Feedback - use thumbs up/down after AI responses or feedback form. Email - use feedback form for account issues. Response: AI Chat instant, email within 24 hours.'),

('getting-started', 'What are the keyboard shortcuts?',
  '["keyboard", "shortcuts", "hotkeys", "space", "keys", "fast", "quick"]',
  '## Keyboard Shortcuts\n\n### Study Mode\n| Key | Action |\n|-----|--------|\n| Space | Reveal answer |\n| 1 | Rate: Again (reset) |\n| 2 | Rate: Hard |\n| 3 | Rate: Good |\n| 4 | Rate: Easy |\n| Left Arrow | Previous card |\n| Right Arrow | Next card |\n| ? | Show all shortcuts |\n\n### Global\n| Key | Action |\n|-----|--------|\n| Ctrl/Cmd + K | Quick search |\n| Ctrl/Cmd + N | New deck |\n| Ctrl/Cmd + G | Generate cards |\n| Esc | Close modal |\n\nYou can customize shortcuts in **Settings -> Keyboard**.',
  'Keyboard shortcuts: Study mode - Space=reveal, 1-4=rate, arrows=navigate, ?=help. Global - Ctrl+K=search, Ctrl+N=new deck, Ctrl+G=generate, Esc=close modal. Customize in Settings -> Keyboard.');

-- Support Knowledge Base + Conversations
-- Migration 015

CREATE TABLE IF NOT EXISTS support_knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  answer TEXT NOT NULL,
  answer_plain TEXT NOT NULL,
  related_questions TEXT DEFAULT '[]',
  views INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  not_helpful_count INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_support_knowledge_category ON support_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_support_knowledge_active ON support_knowledge(is_active);
CREATE INDEX IF NOT EXISTS idx_support_knowledge_pinned ON support_knowledge(is_pinned);

CREATE TABLE IF NOT EXISTS support_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  rating INTEGER,
  feedback TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_user ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);

CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES support_conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'knowledge',
  knowledge_id INTEGER REFERENCES support_knowledge(id),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id);

-- Seed knowledge base with 12 Q&A pairs across 6 categories
INSERT INTO support_knowledge (category, question, keywords, answer, answer_plain) VALUES
('getting-started', 'How do I create my first deck?',
 '["create", "first", "deck", "new", "start", "begin"]',
 '## Creating Your First Deck\n\n1. Go to **Library** -> Click **"+ New Deck"**\n2. Enter a name (e.g., "Cardiology")\n3. Optionally add a description\n4. Click **Create**\n\nTip: You can also create decks directly from the **Generate** page by uploading a PDF or pasting text. The AI will create a deck with generated flashcards automatically.',
 'Creating Your First Deck: Go to Library, click "+ New Deck", enter a name, optionally add a description, click Create. Tip: You can also create decks from the Generate page by uploading a PDF or pasting text.'),

('getting-started', 'How do I generate flashcards with AI?',
 '["generate", "ai", "flashcards", "create", "cards", "magic"]',
 '## AI Flashcard Generation\n\n1. Go to **Generate** page\n2. Choose mode: **Flashcards** or **Question Bank**\n3. Either:\n   - **Paste text** directly into the input area\n   - **Upload files** (PDF, DOCX, TXT, images)\n4. Set the number of cards (5-100)\n5. Click **Generate**\n6. Review the generated cards, edit if needed\n7. Click **Save to Deck**\n\nThe AI supports multiple providers: OpenRouter, OpenAI, Groq, Mistral, and Google.',
 'AI Flashcard Generation: Go to Generate page, choose Flashcards or Question Bank mode, paste text or upload files, set card count, click Generate, review cards, save to deck.'),

('getting-started', 'What file types can I upload?',
 '["upload", "file", "types", "pdf", "docx", "image", "supported"]',
 '## Supported File Types\n\n| Type | Extensions |\n|------|------------|\n| Documents | .pdf, .docx, .txt, .md |\n| Images | .png, .jpg, .jpeg, .webp |\n| Presentations | .pptx, .ppt |\n| Spreadsheets | .xlsx, .xls, .csv |\n\nMax file size: 50MB per file\nMax files per upload: 20',
 'Supported file types: Documents (PDF, DOCX, TXT, MD), Images (PNG, JPG, JPEG, WEBP), Presentations (PPTX, PPT), Spreadsheets (XLSX, XLS, CSV). Max 50MB per file, 20 files per upload.'),

('study', 'How does spaced repetition work?',
 '["spaced", "repetition", "sm-2", "algorithm", "review", "schedule"]',
 '## Spaced Repetition (SM-2 Algorithm)\n\nAnkiGen uses the **SM-2 algorithm** to schedule card reviews:\n\n1. **New cards** -> shown after 1 day\n2. **Correct answer** -> interval increases (1d -> 6d -> 14d -> 30d...)\n3. **Incorrect answer** -> interval resets to 0 (relearn)\n4. **Ease factor** adjusts based on your performance\n\n### Rating System\n- **Again** - Complete reset, review in <1 day\n- **Hard** - Short interval increase\n- **Good** - Normal interval increase\n- **Easy** - Large interval increase\n\nYour **mastery percentage** is calculated from review history.',
 'Spaced Repetition uses the SM-2 algorithm. New cards shown after 1 day. Correct answers increase the interval (1d, 6d, 14d, 30d). Incorrect answers reset to 0. Ease factor adjusts based on performance. Rating system: Again (reset), Hard (short increase), Good (normal), Easy (large increase).'),

('study', 'What are the different study modes?',
 '["study", "modes", "quiz", "type", "voice", "speed", "flashcard"]',
 '## Study Modes\n\n| Mode | Description |\n|------|-------------|\n| **Normal** | Standard flip card - tap to reveal answer |\n| **Quiz** | Multiple choice for MCQ cards |\n| **Type** | Type the answer (great for drug names) |\n| **Voice** | AI reads questions aloud, listens to your answer |\n| **Speed** | Rapid-fire, 10 seconds per card |\n\nSelect your mode before starting a study session.\n\nKeyboard shortcuts during study:\n- **Space** - Reveal answer\n- **1-5** - Rate difficulty\n- **Left/Right** - Navigate cards\n- **?** - Show all shortcuts',
 'Study modes: Normal (flip card), Quiz (multiple choice), Type (type the answer), Voice (AI reads aloud), Speed (rapid-fire 10s per card). Keyboard shortcuts: Space=reveal, 1-5=rate, arrows=navigate, ?=help.'),

('study', 'How do I track my progress?',
 '["progress", "stats", "analytics", "dashboard", "tracking", "mastery"]',
 '## Progress Tracking\n\n### Dashboard Widgets\n- **Smart Hero** - Shows your current state (reviews due, streak, milestones)\n- **Streak Calendar** - GitHub-style activity heatmap\n- **Mastery Ring** - Overall mastery percentage\n- **Focus Queue** - Cards due for review\n- **Quick Stats** - Total cards, study time, accuracy\n\n### Detailed Stats\nGo to **Settings -> Profile** for:\n- Study time per day/week/month\n- Accuracy by topic\n- Cards created vs studied\n- Longest streak\n- Achievement badges\n\nAll stats update in real-time as you study.',
 'Progress tracking: Dashboard shows Smart Hero, Streak Calendar, Mastery Ring, Focus Queue, Quick Stats. Detailed stats in Settings -> Profile: study time, accuracy by topic, cards created vs studied, longest streak, achievements. All stats update in real-time.'),

('account', 'How do I change my password?',
 '["password", "change", "reset", "forgot", "account", "security"]',
 '## Changing Your Password\n\n1. Go to **Settings -> Profile**\n2. Click **"Change Password"**\n3. Enter your current password\n4. Enter your new password (min 8 characters)\n5. Confirm new password\n6. Click **Save**\n\nSecurity tips:\n- Use at least 8 characters\n- Mix uppercase, lowercase, numbers, and symbols\n- Do not reuse passwords from other sites\n\n### Forgot Password?\nClick **"Forgot Password"** on the login page. We will send a reset link to your email.',
 'Changing password: Go to Settings -> Profile, click Change Password, enter current and new password, save. Security tips: 8+ characters, mix cases/numbers/symbols, do not reuse passwords. Forgot password: Click Forgot Password on login page for email reset link.'),

('account', 'How do I delete my account?',
 '["delete", "account", "remove", "close", "data", "privacy"]',
 '## Deleting Your Account\n\nWarning: This action is **permanent** and cannot be undone. All your decks, cards, study history, and data will be permanently deleted.\n\n### Steps:\n1. Go to **Settings -> Profile**\n2. Scroll to **"Danger Zone"**\n3. Click **"Delete My Account"**\n4. Type **"DELETE"** to confirm\n5. Click **"Permanently Delete"**\n\n### What gets deleted:\n- All decks and cards\n- Study history and progress\n- Generated summaries\n- Account information\n\n### What we keep (anonymized):\n- Aggregated usage statistics\n- Error logs (without personal data)\n\nYou will receive a confirmation email after deletion.',
 'Deleting account: Go to Settings -> Profile, scroll to Danger Zone, click Delete My Account, type DELETE to confirm. This permanently deletes all decks, cards, study history, summaries, and account info. Aggregated anonymous stats are retained.'),

('troubleshooting', 'Why are my cards not showing up?',
 '["cards", "not", "showing", "missing", "empty", "disappeared", "where"]',
 '## Cards Not Showing?\n\n### Common Causes:\n\n1. **Wrong deck selected** - Check you are in the right deck/folder\n2. **Filter active** - Clear any search or tag filters\n3. **Study queue empty** - All cards may be scheduled for future review\n4. **Sync issue** - Try refreshing the page (Ctrl+R / Cmd+R)\n5. **Browser cache** - Clear browser cache and reload\n\n### Quick Fixes:\n- **Refresh** the page\n- **Clear search** and filters\n- **Check sub-decks** - cards might be in a sub-deck\n- **Check internet** - some features need connectivity\n\n### Still stuck?\nContact support with:\n- Your browser and OS\n- Screenshot of the issue\n- Steps to reproduce',
 'Cards not showing? Common causes: wrong deck selected, filter active, study queue empty, sync issue, browser cache. Quick fixes: refresh page, clear search/filters, check sub-decks, check internet. Still stuck? Contact support with browser/OS info, screenshot, and steps to reproduce.'),

('troubleshooting', 'The AI generation is slow or failing',
 '["ai", "slow", "generation", "failing", "error", "timeout", "not working"]',
 '## AI Generation Issues\n\n### If generation is slow:\n1. **Check your internet connection**\n2. **Reduce card count** - Try 10 cards instead of 50\n3. **Shorter input text** - Break large documents into smaller chunks\n4. **Try a different AI model** - Go to Settings -> AI\n\n### If generation fails:\n1. **Check API keys** - Ensure at least one AI provider is configured\n2. **Check file format** - Only supported formats work (PDF, DOCX, TXT, MD, images)\n3. **File too large** - Max 50MB per file\n4. **Server load** - Try again in a few minutes\n\n### AI Providers:\n- OpenRouter (default)\n- OpenAI (GPT-4)\n- Groq (fastest)\n- Mistral\n- Google AI',
 'AI generation slow? Check internet, reduce card count, use shorter text, try different model. AI failing? Check API keys, file format, file size (max 50MB), server load. Providers: OpenRouter, OpenAI, Groq (fastest), Mistral, Google AI.'),

('features', 'Can I share my decks with others?',
 '["share", "deck", "others", "collaborate", "friend", "classmate", "export"]',
 '## Sharing Decks\n\n### Export Options:\n1. **CSV** - Import into Anki or other apps\n2. **JSON** - Full data export\n3. **Markdown** - Human-readable format\n4. **PDF** - Printable format\n\n### How to Export:\n1. Go to **Library** -> Select a deck\n2. Click **"Export"** button\n3. Choose format\n4. Download the file\n\n### Import into Anki:\n1. Open Anki -> File -> Import\n2. Select the CSV file\n3. Map fields (Front, Back, Tags)\n4. Click Import\n\n### Coming Soon:\n- **Shareable links** - Generate a link to share with classmates\n- **Collaborative decks** - Edit decks together in real-time\n- **Deck marketplace** - Browse and import community decks',
 'Sharing decks: Export as CSV, JSON, Markdown, or PDF from Library -> deck -> Export. Import CSV into Anki via File -> Import. Coming soon: shareable links, collaborative decks, deck marketplace.'),

('features', 'How do I use the Planner?',
 '["planner", "schedule", "study plan", "calendar", "exam", "plan"]',
 '## Study Planner\n\nThe Planner helps you organize your study schedule.\n\n### Features:\n- **Weekly calendar** - Drag-and-drop study sessions\n- **Daily goals** - Set minutes/cards per day\n- **Analytics** - Track completion and performance\n- **AI generation** - Auto-create a study plan from your exam date\n- **Deck linking** - Attach decks to specific sessions\n\n### Creating a Plan:\n1. Go to **Planner** page\n2. Click **"+ New Session"**\n3. Set day, time, duration\n4. Link a deck (optional)\n5. Save\n\n### AI-Powered Plan:\n1. Click **"AI Generate Plan"**\n2. Enter your exam date\n3. Select available study days\n4. Set hours per day\n5. Choose source decks\n6. Click **Generate**\n\nThe AI creates an optimal spaced study schedule!',
 'Study Planner: Weekly calendar with drag-and-drop, daily goals, analytics, AI generation, deck linking. Create manually via Planner -> + New Session. Or use AI: click AI Generate Plan, enter exam date, select study days, set hours, choose decks, generate.'),

('billing', 'Is AnkiGen free?',
  '["free", "pricing", "cost", "pay", "subscription", "pro", "premium"]',
  '## Pricing\n\n### Free Tier\n- Up to **10 decks**\n- Up to **100 cards per deck**\n- AI card generation (limited)\n- Basic study modes\n- Community support\n\n### Pro Tier (Coming Soon)\n- **Unlimited decks and cards**\n- **Unlimited AI generation**\n- **Advanced AI features** (Deck Doctor, Smart Review, Exam Simulator)\n- **Priority support**\n- **Deck sharing & collaboration**\n- **Custom themes**\n- **API access**\n\n### Student Discount\nStudents with a valid .edu email get **50% off** Pro tier.\n\nContact support for institutional licenses.',
  'Free tier: 10 decks, 100 cards per deck, limited AI generation, basic study modes, community support. Pro (coming soon): unlimited decks/cards, unlimited AI, advanced features, priority support, deck sharing, custom themes, API access. Student discount: 50% off with .edu email.'),

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

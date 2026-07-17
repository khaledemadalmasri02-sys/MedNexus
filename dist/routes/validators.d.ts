import { z } from "zod";
import { Request, Response, NextFunction } from "express";
export type ValidatedRequest<T> = Request & {
    validated: T;
};
export declare function validate<T extends z.ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare const createDeckSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodOptional<z.ZodEnum<["deck", "qbank"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    parentId?: number | undefined;
    kind?: "deck" | "qbank" | undefined;
}, {
    name: string;
    description?: string | undefined;
    parentId?: number | undefined;
    kind?: "deck" | "qbank" | undefined;
}>;
export declare const updateDeckSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodOptional<z.ZodEnum<["deck", "qbank"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    parentId?: number | undefined;
    kind?: "deck" | "qbank" | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    parentId?: number | undefined;
    kind?: "deck" | "qbank" | undefined;
}>;
export declare const mergeDecksSchema: z.ZodObject<{
    deckIds: z.ZodArray<z.ZodNumber, "many">;
    newDeckName: z.ZodString;
    parentId: z.ZodOptional<z.ZodNumber>;
    deleteOriginals: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    deckIds: number[];
    newDeckName: string;
    parentId?: number | undefined;
    deleteOriginals?: boolean | undefined;
}, {
    deckIds: number[];
    newDeckName: string;
    parentId?: number | undefined;
    deleteOriginals?: boolean | undefined;
}>;
export declare const createCardSchema: z.ZodObject<{
    deckId: z.ZodNumber;
    front: z.ZodString;
    back: z.ZodString;
    cardType: z.ZodOptional<z.ZodEnum<["basic", "mcq"]>>;
    tags: z.ZodOptional<z.ZodString>;
    choices: z.ZodOptional<z.ZodString>;
    correctIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    deckId: number;
    front: string;
    back: string;
    tags?: string | undefined;
    cardType?: "basic" | "mcq" | undefined;
    choices?: string | undefined;
    correctIndex?: number | undefined;
}, {
    deckId: number;
    front: string;
    back: string;
    tags?: string | undefined;
    cardType?: "basic" | "mcq" | undefined;
    choices?: string | undefined;
    correctIndex?: number | undefined;
}>;
export declare const updateCardSchema: z.ZodObject<{
    front: z.ZodOptional<z.ZodString>;
    back: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
    cardType: z.ZodOptional<z.ZodEnum<["basic", "mcq"]>>;
    choices: z.ZodOptional<z.ZodString>;
    correctIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    front?: string | undefined;
    back?: string | undefined;
    tags?: string | undefined;
    cardType?: "basic" | "mcq" | undefined;
    choices?: string | undefined;
    correctIndex?: number | undefined;
}, {
    front?: string | undefined;
    back?: string | undefined;
    tags?: string | undefined;
    cardType?: "basic" | "mcq" | undefined;
    choices?: string | undefined;
    correctIndex?: number | undefined;
}>;
export declare const regenerateBatchSchema: z.ZodObject<{
    cardIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    cardIds: number[];
}, {
    cardIds: number[];
}>;
export declare const createQBankSchema: z.ZodObject<{
    name: z.ZodString;
    parentId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    parentId?: number | undefined;
}, {
    name: string;
    parentId?: number | undefined;
}>;
export declare const updateQBankSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    parentId?: number | undefined;
}, {
    name?: string | undefined;
    parentId?: number | undefined;
}>;
export declare const addQuestionSchema: z.ZodObject<{
    front: z.ZodString;
    back: z.ZodString;
    choices: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    correctIndex: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    front: string;
    back: string;
    tags?: string | undefined;
    choices?: string[] | undefined;
    correctIndex?: number | undefined;
}, {
    front: string;
    back: string;
    tags?: string | undefined;
    choices?: string[] | undefined;
    correctIndex?: number | undefined;
}>;
export declare const updateQuestionSchema: z.ZodObject<{
    front: z.ZodOptional<z.ZodString>;
    back: z.ZodOptional<z.ZodString>;
    choices: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    correctIndex: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    front?: string | undefined;
    back?: string | undefined;
    tags?: string | undefined;
    choices?: string[] | undefined;
    correctIndex?: number | undefined;
}, {
    front?: string | undefined;
    back?: string | undefined;
    tags?: string | undefined;
    choices?: string[] | undefined;
    correctIndex?: number | undefined;
}>;
export declare const importFromDeckSchema: z.ZodObject<{
    deckId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    deckId: number;
}, {
    deckId: number;
}>;
export declare const generateSchema: z.ZodObject<{
    text: z.ZodString;
    deckName: z.ZodString;
    cardCount: z.ZodOptional<z.ZodNumber>;
    deckType: z.ZodOptional<z.ZodEnum<["deck", "qbank"]>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    deckName: string;
    cardCount?: number | undefined;
    deckType?: "deck" | "qbank" | undefined;
}, {
    text: string;
    deckName: string;
    cardCount?: number | undefined;
    deckType?: "deck" | "qbank" | undefined;
}>;
export declare const explainSchema: z.ZodObject<{
    front: z.ZodString;
    back: z.ZodString;
    mode: z.ZodOptional<z.ZodEnum<["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"]>>;
}, "strip", z.ZodTypeAny, {
    front: string;
    back: string;
    mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap" | undefined;
}, {
    front: string;
    back: string;
    mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap" | undefined;
}>;
export declare const fullExplainSchema: z.ZodObject<{
    front: z.ZodString;
    back: z.ZodString;
    topic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    front: string;
    back: string;
    topic?: string | undefined;
}, {
    front: string;
    back: string;
    topic?: string | undefined;
}>;
export declare const batchExplainSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        front: string;
        back: string;
    }, {
        front: string;
        back: string;
    }>, "many">;
    mode: z.ZodOptional<z.ZodEnum<["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"]>>;
}, "strip", z.ZodTypeAny, {
    cards: {
        front: string;
        back: string;
    }[];
    mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap" | undefined;
}, {
    cards: {
        front: string;
        back: string;
    }[];
    mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap" | undefined;
}>;
export declare const extractTextSchema: z.ZodObject<{
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
}, {
    text: string;
}>;
export declare const idParamSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, number, string>;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: string;
}>;
export declare const deckIdQuerySchema: z.ZodObject<{
    deckId: z.ZodEffects<z.ZodString, number, string>;
}, "strip", z.ZodTypeAny, {
    deckId: number;
}, {
    deckId: string;
}>;
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type MergeDecksInput = z.infer<typeof mergeDecksSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type CreateQBankInput = z.infer<typeof createQBankSchema>;
export type UpdateQBankInput = z.infer<typeof updateQBankSchema>;
export type AddQuestionInput = z.infer<typeof addQuestionSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type ExplainInput = z.infer<typeof explainSchema>;
export declare const startStudySessionSchema: z.ZodObject<{
    planId: z.ZodOptional<z.ZodNumber>;
    deckId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    deckId?: number | undefined;
    planId?: number | undefined;
}, {
    deckId?: number | undefined;
    planId?: number | undefined;
}>;
export declare const updateStudySessionSchema: z.ZodObject<{
    cardsStudied: z.ZodOptional<z.ZodNumber>;
    knownCount: z.ZodOptional<z.ZodNumber>;
    unknownCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    cardsStudied?: number | undefined;
    knownCount?: number | undefined;
    unknownCount?: number | undefined;
}, {
    cardsStudied?: number | undefined;
    knownCount?: number | undefined;
    unknownCount?: number | undefined;
}>;
export declare const endStudySessionSchema: z.ZodObject<{
    cardsStudied: z.ZodOptional<z.ZodNumber>;
    knownCount: z.ZodOptional<z.ZodNumber>;
    unknownCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    cardsStudied?: number | undefined;
    knownCount?: number | undefined;
    unknownCount?: number | undefined;
}, {
    cardsStudied?: number | undefined;
    knownCount?: number | undefined;
    unknownCount?: number | undefined;
}>;
export declare const createPlannerSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    dayOfWeek: z.ZodNumber;
    startHour: z.ZodNumber;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
    deckId: z.ZodOptional<z.ZodNumber>;
    recurrence: z.ZodOptional<z.ZodEnum<["none", "weekly", "daily"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    dayOfWeek: number;
    startHour: number;
    description?: string | undefined;
    deckId?: number | undefined;
    color?: string | undefined;
    durationMinutes?: number | undefined;
    recurrence?: "none" | "weekly" | "daily" | undefined;
}, {
    title: string;
    dayOfWeek: number;
    startHour: number;
    description?: string | undefined;
    deckId?: number | undefined;
    color?: string | undefined;
    durationMinutes?: number | undefined;
    recurrence?: "none" | "weekly" | "daily" | undefined;
}>;
export declare const updatePlannerSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    dayOfWeek: z.ZodOptional<z.ZodNumber>;
    startHour: z.ZodOptional<z.ZodNumber>;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
    deckId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    recurrence: z.ZodOptional<z.ZodEnum<["none", "weekly", "daily"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    deckId?: number | null | undefined;
    title?: string | undefined;
    color?: string | undefined;
    dayOfWeek?: number | undefined;
    startHour?: number | undefined;
    durationMinutes?: number | undefined;
    recurrence?: "none" | "weekly" | "daily" | undefined;
}, {
    description?: string | undefined;
    deckId?: number | null | undefined;
    title?: string | undefined;
    color?: string | undefined;
    dayOfWeek?: number | undefined;
    startHour?: number | undefined;
    durationMinutes?: number | undefined;
    recurrence?: "none" | "weekly" | "daily" | undefined;
}>;
export declare const createNotificationSchema: z.ZodObject<{
    type: z.ZodString;
    title: z.ZodString;
    message: z.ZodString;
    actionUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    type: string;
    message: string;
    actionUrl?: string | undefined;
}, {
    title: string;
    type: string;
    message: string;
    actionUrl?: string | undefined;
}>;
export declare const reviewCardSchema: z.ZodObject<{
    quality: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quality: number;
}, {
    quality: number;
}>;
export declare const updateSettingsSchema: z.ZodObject<{
    dailyGoalMinutes: z.ZodOptional<z.ZodNumber>;
    dailyGoalCards: z.ZodOptional<z.ZodNumber>;
    reminderTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    accentColor: z.ZodOptional<z.ZodString>;
    dashboardLayout: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    density: z.ZodOptional<z.ZodEnum<["compact", "comfortable", "spacious"]>>;
    soundEnabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodEnum<["light", "dark", "system"]>>;
    animationsEnabled: z.ZodOptional<z.ZodBoolean>;
    fontSize: z.ZodOptional<z.ZodEnum<["small", "medium", "large"]>>;
    defaultStyle: z.ZodOptional<z.ZodString>;
    defaultMode: z.ZodOptional<z.ZodEnum<["combined", "separate"]>>;
    autoTts: z.ZodOptional<z.ZodBoolean>;
    chunkSize: z.ZodOptional<z.ZodNumber>;
    cardOrder: z.ZodOptional<z.ZodEnum<["sequential", "random"]>>;
    autoReveal: z.ZodOptional<z.ZodBoolean>;
    autoRevealSeconds: z.ZodOptional<z.ZodNumber>;
    showExplanation: z.ZodOptional<z.ZodBoolean>;
    streakFreeze: z.ZodOptional<z.ZodBoolean>;
    emailNotifications: z.ZodOptional<z.ZodBoolean>;
    emailWeeklySummary: z.ZodOptional<z.ZodBoolean>;
    emailStreakAlert: z.ZodOptional<z.ZodBoolean>;
    pushNotifications: z.ZodOptional<z.ZodBoolean>;
    pushReminderTime: z.ZodOptional<z.ZodString>;
    pushReviewDue: z.ZodOptional<z.ZodBoolean>;
    pushSessionComplete: z.ZodOptional<z.ZodBoolean>;
    inAppSounds: z.ZodOptional<z.ZodBoolean>;
    soundVolume: z.ZodOptional<z.ZodNumber>;
    ambientEnabled: z.ZodOptional<z.ZodBoolean>;
    customCursorEnabled: z.ZodOptional<z.ZodBoolean>;
    ripplesEnabled: z.ZodOptional<z.ZodBoolean>;
    animationSpeed: z.ZodOptional<z.ZodNumber>;
    reduceMotion: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dailyGoalMinutes?: number | undefined;
    dailyGoalCards?: number | undefined;
    reminderTime?: string | null | undefined;
    accentColor?: string | undefined;
    dashboardLayout?: string | null | undefined;
    density?: "comfortable" | "compact" | "spacious" | undefined;
    soundEnabled?: boolean | undefined;
    theme?: "dark" | "light" | "system" | undefined;
    animationsEnabled?: boolean | undefined;
    fontSize?: "small" | "medium" | "large" | undefined;
    defaultStyle?: string | undefined;
    defaultMode?: "combined" | "separate" | undefined;
    autoTts?: boolean | undefined;
    chunkSize?: number | undefined;
    cardOrder?: "sequential" | "random" | undefined;
    autoReveal?: boolean | undefined;
    autoRevealSeconds?: number | undefined;
    showExplanation?: boolean | undefined;
    streakFreeze?: boolean | undefined;
    emailNotifications?: boolean | undefined;
    emailWeeklySummary?: boolean | undefined;
    emailStreakAlert?: boolean | undefined;
    pushNotifications?: boolean | undefined;
    pushReminderTime?: string | undefined;
    pushReviewDue?: boolean | undefined;
    pushSessionComplete?: boolean | undefined;
    inAppSounds?: boolean | undefined;
    soundVolume?: number | undefined;
    ambientEnabled?: boolean | undefined;
    customCursorEnabled?: boolean | undefined;
    ripplesEnabled?: boolean | undefined;
    animationSpeed?: number | undefined;
    reduceMotion?: boolean | undefined;
}, {
    dailyGoalMinutes?: number | undefined;
    dailyGoalCards?: number | undefined;
    reminderTime?: string | null | undefined;
    accentColor?: string | undefined;
    dashboardLayout?: string | null | undefined;
    density?: "comfortable" | "compact" | "spacious" | undefined;
    soundEnabled?: boolean | undefined;
    theme?: "dark" | "light" | "system" | undefined;
    animationsEnabled?: boolean | undefined;
    fontSize?: "small" | "medium" | "large" | undefined;
    defaultStyle?: string | undefined;
    defaultMode?: "combined" | "separate" | undefined;
    autoTts?: boolean | undefined;
    chunkSize?: number | undefined;
    cardOrder?: "sequential" | "random" | undefined;
    autoReveal?: boolean | undefined;
    autoRevealSeconds?: number | undefined;
    showExplanation?: boolean | undefined;
    streakFreeze?: boolean | undefined;
    emailNotifications?: boolean | undefined;
    emailWeeklySummary?: boolean | undefined;
    emailStreakAlert?: boolean | undefined;
    pushNotifications?: boolean | undefined;
    pushReminderTime?: string | undefined;
    pushReviewDue?: boolean | undefined;
    pushSessionComplete?: boolean | undefined;
    inAppSounds?: boolean | undefined;
    soundVolume?: number | undefined;
    ambientEnabled?: boolean | undefined;
    customCursorEnabled?: boolean | undefined;
    ripplesEnabled?: boolean | undefined;
    animationSpeed?: number | undefined;
    reduceMotion?: boolean | undefined;
}>;
export declare const generatePlanSchema: z.ZodObject<{
    examDate: z.ZodString;
    studyDays: z.ZodArray<z.ZodNumber, "many">;
    hoursPerDay: z.ZodNumber;
    deckIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    examDate: string;
    studyDays: number[];
    hoursPerDay: number;
    deckIds?: number[] | undefined;
}, {
    examDate: string;
    studyDays: number[];
    hoursPerDay: number;
    deckIds?: number[] | undefined;
}>;
export declare const batchCreatePlansSchema: z.ZodObject<{
    sessions: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        dayOfWeek: z.ZodNumber;
        startHour: z.ZodNumber;
        durationMinutes: z.ZodOptional<z.ZodNumber>;
        deckId: z.ZodOptional<z.ZodNumber>;
        recurrence: z.ZodOptional<z.ZodEnum<["none", "weekly", "daily"]>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        dayOfWeek: number;
        startHour: number;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
        recurrence?: "none" | "weekly" | "daily" | undefined;
    }, {
        title: string;
        dayOfWeek: number;
        startHour: number;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
        recurrence?: "none" | "weekly" | "daily" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    sessions: {
        title: string;
        dayOfWeek: number;
        startHour: number;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
        recurrence?: "none" | "weekly" | "daily" | undefined;
    }[];
}, {
    sessions: {
        title: string;
        dayOfWeek: number;
        startHour: number;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
        recurrence?: "none" | "weekly" | "daily" | undefined;
    }[];
}>;
export declare const createTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    sessions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        durationMinutes: z.ZodOptional<z.ZodNumber>;
        deckId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
    }, {
        title: string;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
    }>, "many">>;
    scheduleType: z.ZodOptional<z.ZodEnum<["weekly", "daily"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sessions?: {
        title: string;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
    }[] | undefined;
    description?: string | undefined;
    scheduleType?: "weekly" | "daily" | undefined;
}, {
    name: string;
    sessions?: {
        title: string;
        deckId?: number | undefined;
        color?: string | undefined;
        durationMinutes?: number | undefined;
    }[] | undefined;
    description?: string | undefined;
    scheduleType?: "weekly" | "daily" | undefined;
}>;
export declare const deckTagsSchema: z.ZodObject<{
    tagIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    tagIds: number[];
}, {
    tagIds: number[];
}>;
export declare const terminalExecSchema: z.ZodObject<{
    command: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    command: string;
    sessionId?: string | undefined;
    timeout?: number | undefined;
}, {
    command: string;
    sessionId?: string | undefined;
    timeout?: number | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    rememberMe?: boolean | undefined;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const sendVerificationSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const verifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const oauthSchema: z.ZodObject<{
    idToken: z.ZodOptional<z.ZodString>;
    accessToken: z.ZodOptional<z.ZodString>;
    identityToken: z.ZodOptional<z.ZodString>;
    fullName: z.ZodOptional<z.ZodObject<{
        givenName: z.ZodOptional<z.ZodString>;
        familyName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        givenName?: string | undefined;
        familyName?: string | undefined;
    }, {
        givenName?: string | undefined;
        familyName?: string | undefined;
    }>>;
    email: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    rememberMe?: boolean | undefined;
    idToken?: string | undefined;
    accessToken?: string | undefined;
    identityToken?: string | undefined;
    fullName?: {
        givenName?: string | undefined;
        familyName?: string | undefined;
    } | undefined;
}, {
    email?: string | undefined;
    rememberMe?: boolean | undefined;
    idToken?: string | undefined;
    accessToken?: string | undefined;
    identityToken?: string | undefined;
    fullName?: {
        givenName?: string | undefined;
        familyName?: string | undefined;
    } | undefined;
}>;
//# sourceMappingURL=validators.d.ts.map
# Plan: AI Consent Modal Implementation (TODO 2)

## Context

GDPR requires explicit user consent before sending personal data to third-party AI services (Claude API). This plan implements a consent modal that must be accepted before any AI analysis of job offers.

**Source**: PRD.md section 2.8 "Privacy & GDPR Compliance"

---

## Implementation Overview

### Files to Modify

1. **`supabase-schema.sql`** - Add `ai_consent` column to `job_preferences` table
2. **`app/types.ts`** - Add `aiConsent` field to `JobPreferences` interface
3. **`lib/job-intelligence-db.ts`** - Handle `aiConsent` field in CRUD operations
4. **`app/components/jobs/AIConsentModal.tsx`** (NEW) - Consent modal component
5. **`app/components/jobs/JobImportModal.tsx`** - Check consent before AI analysis

---

## Detailed Implementation Steps

### Step 1: Database Schema Update

Add column to `job_preferences` table:

```sql
ALTER TABLE job_preferences
ADD COLUMN ai_consent BOOLEAN DEFAULT FALSE;
```

Apply via migration in Supabase dashboard or local CLI.

---

### Step 2: Update Types (`app/types.ts`)

Add `aiConsent` to `JobPreferences` interface:

```typescript
export interface JobPreferences {
  // ... existing fields
  aiConsent: boolean;  // NEW: User has consented to AI analysis
}
```

---

### Step 3: Update DB Layer (`lib/job-intelligence-db.ts`)

**In `loadJobPreferences()`:**
- Map `data.ai_consent` → `aiConsent: boolean`

**In `saveJobPreferences()`:**
- Map `prefs.aiConsent` → `ai_consent` in upsert payload

**In `createDefaultJobPreferences()`:**
- Set default `aiConsent: false`

---

### Step 4: Create AIConsentModal (`app/components/jobs/AIConsentModal.tsx`)

**Design Guidelines** (per BRAND-IDENTITY.md):
- Neutral, factual tone - no exclamation marks
- Calming color palette (primary blues/grays)
- Clear, concise copy explaining what data is sent
- Two buttons: "Accept" (accent) and "Decline" (secondary)

**Content to display:**
1. Title: "AI Analysis Consent"
2. Description explaining:
   - Your profile and job description will be sent to Claude AI
   - Purpose: to calculate match scores and generate insights
   - Data is processed but not stored by the AI service
3. Link to privacy policy (if available)
4. Checkbox: "Don't show this again" (persists consent)

**Props:**
```typescript
interface AIConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}
```

---

### Step 5: Integrate in JobImportModal (`app/components/jobs/JobImportModal.tsx`)

**Flow:**
1. Before `analyzeJobOffer()` is called in `handleSave()`
2. Check if `preferences.aiConsent === true`
3. If false, show AIConsentModal instead of proceeding
4. On accept: save consent to DB, then continue with analysis
5. On decline: save job without analysis, close modal

**State changes:**
- Add `showConsentModal` state
- Add `handleConsentAccept()` and `handleConsentDecline()` handlers

---

## Verification

1. **Manual Testing:**
   - Create new user → Import first job → Should see consent modal
   - Accept consent → Job should be analyzed
   - Import second job → Should NOT see modal again
   - Reset consent in DB → Should see modal again

2. **Build Check:**
   - Run `npm run build` to ensure no type errors

3. **Database Verification:**
   - Check `job_preferences.ai_consent` column exists
   - Verify RLS policies still work

---

## Copy for Modal

```
Title: AI Analysis Consent

Body:
To provide personalized job matching and insights, we analyze your profile
against job descriptions using Claude AI (by Anthropic).

This means your professional profile and the job description will be
processed by an external AI service.

Your data:
• Is used only for this analysis
• Is not stored by the AI service
• Remains under your control

You can withdraw consent at any time in Account settings.

[Decline] [Accept and Continue]
```

---

## Order of Implementation

1. Apply database migration (add `ai_consent` column)
2. Update `app/types.ts`
3. Update `lib/job-intelligence-db.ts`
4. Create `AIConsentModal.tsx`
5. Integrate in `JobImportModal.tsx`
6. Build and test

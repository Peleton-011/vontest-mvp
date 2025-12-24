# Design & Styling Audit Report

**Date:** 2025-12-24
**Scope:** Social Games Platform - Complete UI/UX Review
**Focus Areas:** Input fields, buttons, spacing, layout consistency, typography

---

## Executive Summary

This audit identifies **7 major categories** of design inconsistencies across the application, with a primary focus on input field sizing issues as specifically noted by the development team. The analysis covers all game components, forms, modals, and page layouts with specific code examples and actionable recommendations.

### Key Findings:
- ✅ **Visual elements** (emojis/images) are well-implemented with consistent patterns
- ⚠️ **Input fields** lack standardized sizing across the application
- ⚠️ **Button sizing** varies significantly between contexts
- ⚠️ **Spacing utilities** are applied inconsistently
- ⚠️ **Form components** mix different Nuxt UI patterns
- ⚠️ **Typography** hierarchy needs standardization

---

## 1. Input Field Sizing Issues ⚠️ HIGH PRIORITY

### Problem Statement
Input fields across the application use inconsistent size props, leading to visual misalignment and unpredictable layouts. This was specifically identified as a recurring issue.

### Specific Issues Found:

#### Issue 1.1: Mixed Size Props in Forms
**Location:** `pages/games/new.vue` and `pages/games/[groupId]/settings.vue`

**Current Code:**
```vue
<!-- Group Name - uses size="lg" -->
<UInput
  v-model="form.name.value"
  placeholder="e.g., College Friends, Book Club, Family"
  size="lg"
  :disabled="loading"
/>

<!-- Notification Time - NO size prop -->
<UInput
  v-model="form.notification_time.value"
  type="time"
  :disabled="loading"
/>
```

**Impact:** The group name input appears larger than the time input, creating visual imbalance in the same form.

**Recommendation:** Standardize on `size="lg"` for all primary form inputs, or remove size props entirely for consistency.

---

#### Issue 1.2: Textarea vs Input Size Mismatch
**Location:** `components/games/ManagePromptsModal.vue`

**Current Code:**
```vue
<!-- Single-line input - NO size -->
<UInput v-model="promptForm.option_a" placeholder="First option..." />

<!-- Multi-line textarea - rows specified but no size -->
<UTextarea
  v-model="promptForm.statement"
  placeholder="Enter a controversial statement..."
  :rows="3"
/>
```

**Impact:** UInput and UTextarea don't visually align in width/height proportions, especially when they appear in the same form.

**Recommendation:** Apply consistent sizing:
```vue
<UInput v-model="promptForm.option_a" placeholder="First option..." size="lg" />
<UTextarea v-model="promptForm.statement" :rows="3" size="lg" />
```

---

#### Issue 1.3: Chat Input Sizing
**Location:** `components/ui/ChatSection.vue:184-189`

**Current Code:**
```vue
<UInput
  v-model="form.comment.value"
  placeholder="Type a message..."
  class="flex-1"
  :disabled="isSubmitting"
/>
```

**Impact:** No size prop means it uses default medium size, which appears too small in the chat interface context.

**Recommendation:**
```vue
<UInput
  v-model="form.comment.value"
  placeholder="Type a message..."
  class="flex-1"
  size="lg"
  :disabled="isSubmitting"
/>
```

---

#### Issue 1.4: Custom Game Form Input Sizes
**Location:** `components/games/CreateGameForm.vue:212-226`

**Current Code:**
```vue
<UInput
  v-model="wouldYouRatherForm.option_a"
  placeholder="e.g., Have the ability to fly"
  size="lg"
/>
<!-- vs -->
<UInput
  v-model="wouldYouRatherForm.option_b"
  placeholder="e.g., Have the ability to become invisible"
  size="lg"
/>
```

**Status:** ✅ These are correctly sized (both lg), but inconsistent with other forms.

**Recommendation:** Keep these as the pattern to follow - both options should always match.

---

#### Issue 1.5: Profile Settings Input
**Location:** `pages/profile/settings.vue:130-148`

**Current Code:**
```vue
<!-- Username - NO size -->
<UInput
  v-model="form.username"
  placeholder="johndoe"
  :disabled="loading"
/>

<!-- Avatar URL - NO size -->
<UInput
  v-model="form.avatar_url"
  placeholder="https://example.com/avatar.jpg"
  :disabled="loading"
  type="url"
/>
```

**Impact:** These inputs appear smaller than expected for profile settings, which should feel substantial and important.

**Recommendation:** Add `size="lg"` to both inputs to match the importance of profile data.

---

### Input Field Standardization Recommendations

**Proposed Size Standards:**
1. **Primary form inputs** (group creation, settings, profile): `size="lg"`
2. **Secondary/filter inputs** (search, quick filters): `size="md"` (default)
3. **Compact inputs** (inline edits, tight spaces): `size="sm"`
4. **Chat/messaging inputs**: `size="lg"`
5. **All textareas**: Match corresponding input size in same form

**Action Items:**
- [ ] Create a design token/constant for standard input sizes
- [ ] Audit all 15+ forms across the application
- [ ] Apply consistent sizing based on context
- [ ] Document the standard in component guidelines

---

## 2. Button Sizing & Alignment Issues ⚠️

### Problem Statement
Buttons use inconsistent sizing, leading to misaligned button groups and unpredictable visual weight.

### Specific Issues Found:

#### Issue 2.1: Mixed Button Sizes in Same Context
**Location:** `pages/games/[groupId]/index.vue:109-129`

**Current Code:**
```vue
<!-- Start Game Now - NO size (defaults to md) -->
<UButton
  icon="i-heroicons-sparkles"
  :loading="gameSchedulerLoading"
  @click="handleStartGameNow"
>
  Start Game Now
</UButton>

<!-- Make Custom Game - NO size -->
<UButton
  variant="outline"
  icon="i-heroicons-pencil"
  @click="showCustomGameModal = true"
>
  Make Custom Game
</UButton>

<!-- Manage Prompts - NO size -->
<UButton
  variant="outline"
  icon="i-heroicons-puzzle-piece"
  @click="showManagePromptsModal = true"
>
  Manage Prompts
</UButton>
```

**Impact:** These three buttons sit next to each other but there's no explicit size control. They're consistent by accident (all default), but vulnerable to future changes.

**Recommendation:**
```vue
<UButton size="md" icon="i-heroicons-sparkles" ...>
```
Explicitly set `size="md"` for all three to lock in consistency.

---

#### Issue 2.2: Submit Button Size Inconsistency
**Location:** Multiple game components

**Current Code Examples:**
```vue
<!-- WouldYouRatherGame.vue:251-258 -->
<UButton
  :loading="loading"
  block
  size="lg"
  @click="handleSubmitResponse"
>
  Submit Response
</UButton>

<!-- HotTakesGame.vue:247-256 - SAME, GOOD -->
<UButton
  @click="handleSubmitResponse"
  :loading="loading"
  :disabled="!responseForm.stance"
  block
  size="lg"
>
  Submit Response
</UButton>

<!-- GuessWhoSaidItGame.vue:392-401 - INCONSISTENT -->
<UButton
  @click="handleSubmitAnswer"
  :loading="loading"
  :disabled="!answerForm.answer.trim()"
  block
  size="lg"
  class="mt-4"
>
  Submit Answer
</UButton>
```

**Status:** ✅ These are actually consistent (all `size="lg"` with `block`), but the **ordering of props differs**, making them harder to maintain.

**Recommendation:** Standardize prop order:
```vue
<UButton
  type="submit"
  size="lg"
  block
  :loading="loading"
  :disabled="condition"
  @click="handler"
>
```

---

#### Issue 2.3: Admin Controls Button Sizing
**Location:** Multiple game components (admin sections)

**Current Code:**
```vue
<!-- WouldYouRatherGame.vue:358-365 -->
<UButton
  variant="outline"
  color="neutral"
  icon="i-heroicons-check-circle"
  @click="handleCompleteGame"
>
  End Game & Post Results to Chat
</UButton>
```

**Impact:** No size specified. These admin controls appear smaller than the main action buttons (which use `size="lg"`), which is actually good for visual hierarchy. But it's not explicit.

**Recommendation:** Explicitly use `size="md"` for admin controls to differentiate from primary actions:
```vue
<UButton
  size="md"
  variant="outline"
  color="neutral"
  ...
>
```

---

#### Issue 2.4: Icon-Only Buttons
**Location:** Multiple components

**Current Code:**
```vue
<!-- ManagePromptsModal.vue:225-230 -->
<UButton
  variant="ghost"
  icon="i-heroicons-x-mark"
  size="sm"
  @click="emit('close')"
/>

<!-- ManagePromptsModal.vue:490-497 -->
<UButton
  variant="ghost"
  color="red"
  icon="i-heroicons-trash"
  size="sm"
  @click="handleDeletePrompt(prompt.id)"
  :loading="loading"
/>
```

**Status:** ✅ Correctly uses `size="sm"` for icon-only buttons.

**Recommendation:** This is the correct pattern. Document it as standard.

---

### Button Standardization Recommendations

**Proposed Size Standards:**
1. **Primary CTAs** (Submit, Create, Save): `size="lg"` + `block` (for forms)
2. **Secondary actions** (Cancel, Back): `size="lg"` (match primary) or `size="md"`
3. **Admin controls** (End Game, Delete): `size="md"` + `variant="outline"`
4. **Icon-only buttons** (Close, Delete icons): `size="sm"`
5. **Compact actions** (Quick filters, toggles): `size="sm"`

**Prop Order Standard:**
```vue
<UButton
  [type="submit|button"]
  [size="sm|md|lg"]
  [block]
  [variant="solid|outline|ghost"]
  [color="primary|neutral|error"]
  [icon="..."]
  [:loading="..."]
  [:disabled="..."]
  [@click="..."]
>
```

---

## 3. Spacing & Layout Inconsistencies ⚠️

### Problem Statement
Gap, padding, and margin utilities are applied inconsistently, leading to uneven whitespace and misaligned elements.

### Specific Issues Found:

#### Issue 3.1: Button Group Gaps
**Location:** Multiple pages

**Current Code Examples:**
```vue
<!-- pages/games/[groupId]/index.vue:108 -->
<div class="flex gap-2">
  <UButton ...>Start Game Now</UButton>
  <UButton ...>Make Custom Game</UButton>
  <UButton ...>Manage Prompts</UButton>
</div>

<!-- pages/games/[groupId]/index.vue:354-365 (invite codes) -->
<div class="flex gap-2">
  <UButton size="sm" ...>Copy Link</UButton>
  <UButton size="sm" .../>
</div>

<!-- components/games/CreateGameForm.vue:295-312 -->
<div class="flex justify-between mt-6">
  <UButton ...>Back / Cancel</UButton>
  <UButton ...>Next / Create</UButton>
</div>

<!-- components/games/ManagePromptsModal.vue:435-446 -->
<div class="flex justify-end gap-3">
  <UButton variant="outline">Clear</UButton>
  <UButton>Create Prompt</UButton>
</div>
```

**Impact:** Button groups use `gap-2` in some places and `gap-3` in others, with no clear pattern.

**Recommendation:**
- **Horizontal button groups (same level)**: Use `gap-3` (12px)
- **Icon-only button groups**: Use `gap-2` (8px)
- **Form actions (submit/cancel)**: Use `gap-3` or `gap-4` (16px)

---

#### Issue 3.2: Card Padding Inconsistencies
**Location:** Multiple UCard usages

**Current Code Examples:**
```vue
<!-- pages/games/[groupId]/index.vue:212-266 (members) -->
<UCard
  v-for="member in members"
  :key="member.user_id"
  class="p-4"
>

<!-- components/games/HotTakesGame.vue:204-236 (stance cards) -->
<UCard
  :class="[
    'cursor-pointer transition-all text-center p-4',
    ...
  ]"
>

<!-- components/games/GuessWhoSaidItGame.vue:434-443 (own answer) -->
<div class="p-4 rounded-lg bg-blue-50 ...">
```

**Impact:** Some cards use explicit `p-4` class, others rely on UCard defaults, and some custom divs use `p-4` to mimic cards.

**Recommendation:**
- **Let UCard handle its own padding** (remove explicit `p-4` unless needed)
- For custom card-like divs, standardize on `p-4` or `p-6` based on content density
- Use `p-3` only for compact cards (e.g., chat messages)

---

#### Issue 3.3: Space-y Variations
**Location:** Throughout components

**Current Code Examples:**
```vue
<!-- WouldYouRatherGame.vue:83 -->
<div class="would-you-rather-game space-y-6">

<!-- HotTakesGame.vue:110 -->
<div class="space-y-6">

<!-- ManagePromptsModal.vue:254 -->
<div v-if="item.label === 'Create Custom Prompt'" class="space-y-6 py-4">

<!-- ManagePromptsModal.vue:264 -->
<div v-else class="space-y-6">

<!-- CreateGameForm.vue:19 -->
<form class="space-y-6" @submit.prevent="handleSubmit">
```

**Status:** ✅ Actually quite consistent - most use `space-y-6` for major sections.

**Recommendation:** Keep `space-y-6` (24px) as the standard for:
- Form field groups
- Major content sections
- Game component sections

Use `space-y-4` (16px) for tighter groupings within sections.

---

#### Issue 3.4: Container Padding
**Location:** Page layouts

**Current Code Examples:**
```vue
<!-- pages/games/[groupId]/index.vue:2 -->
<div class="container mx-auto px-4 py-8">

<!-- pages/games/new.vue:2 -->
<div class="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">

<!-- pages/profile/settings.vue:109 -->
<div class="container mx-auto px-4 py-8 max-w-2xl">
```

**Impact:** Inconsistent responsive padding patterns. Some use `px-4 sm:px-6`, others just `px-4`.

**Recommendation:** Standardize on:
```vue
<div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
```
For pages with max-width constraints:
```vue
<div class="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">
```

---

### Spacing Standardization Recommendations

**Proposed Spacing Scale:**
```
gap-2 (8px)   → Icon groups, compact lists
gap-3 (12px)  → Button groups, form elements
gap-4 (16px)  → Form actions, cards in grid

space-y-2     → Tight lists (chat messages)
space-y-3     → List items
space-y-4     → Form field groupings
space-y-6     → Major sections (standard)

p-2           → Very compact (badges, pills)
p-3           → Compact cards (chat, notifications)
p-4           → Standard cards (member cards, results)
p-6           → Spacious cards (game prompts, forms)
```

---

## 4. Form Component Pattern Inconsistencies ⚠️

### Problem Statement
The application mixes `UFormGroup` and `UFormField` components without a clear pattern.

### Specific Issues Found:

#### Issue 4.1: UFormGroup vs UFormField
**Location:** Multiple form files

**Current Code Examples:**
```vue
<!-- pages/games/new.vue uses UFormGroup -->
<UFormGroup
  label="Group Name"
  name="name"
  required
  help="Choose a name for your group (3-50 characters)"
>
  <UInput v-model="form.name.value" ... />
</UFormGroup>

<!-- components/games/CreateGameForm.vue uses UFormGroup -->
<UFormGroup label="Option A" required>
  <UInput v-model="wouldYouRatherForm.option_a" ... />
</UFormGroup>

<!-- components/games/ManagePromptsModal.vue uses UFormField -->
<UFormField label="Game Type" required>
  <USelectMenu v-model="selectedGameType" ... />
</UFormField>

<!-- components/games/WouldYouRatherGame.vue uses UFormField -->
<UFormField label="How strongly do you feel about this choice?">
  <div class="flex items-center gap-4">
    <input type="range" ... />
  </div>
</UFormField>
```

**Impact:** According to Nuxt UI docs, `UFormField` is the newer, recommended component. Mixing them causes:
- Inconsistent label styling
- Different spacing behavior
- Harder maintenance

**Recommendation:** Migrate all forms to `UFormField`:
```vue
<!-- Standardize on this -->
<UFormField
  label="Group Name"
  name="name"
  required
  help="Choose a name for your group (3-50 characters)"
>
  <UInput v-model="form.name.value" ... />
</UFormField>
```

---

#### Issue 4.2: Help Text Placement
**Location:** Forms across the app

**Current Code:**
```vue
<!-- Some have help in UFormGroup -->
<UFormGroup
  label="Description"
  name="description"
  help="Optional description (max 500 characters)"
>

<!-- Others have separate help text -->
<UFormField label="Daily Game Time" name="notification_time">
  <UInput ... />
</UFormField>
<p class="text-xs text-gray-500 mt-1">When should new games be created each day?</p>
```

**Impact:** Help text appears in different positions and styles.

**Recommendation:** Always use the `help` prop:
```vue
<UFormField
  label="Daily Game Time"
  help="When should new games be created each day?"
>
```

---

### Form Pattern Recommendations

**Standard Form Field Pattern:**
```vue
<UFormField
  label="Field Label"
  name="fieldName"
  [required]
  [help="Helper text for the user"]
  [:error="validationError"]
>
  <UInput|UTextarea|USelectMenu
    v-model="form.fieldName.value"
    placeholder="..."
    [size="lg"]
    [:disabled="loading"]
  />
</UFormField>
```

---

## 5. Typography Hierarchy Issues ⚠️

### Problem Statement
Heading sizes and text styles are inconsistent for similar semantic elements.

### Specific Issues Found:

#### Issue 5.1: Game Headers
**Location:** All game component headers

**Current Code Examples:**
```vue
<!-- WouldYouRatherGame.vue:99 -->
<h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>

<!-- HotTakesGame.vue:118 -->
<h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>

<!-- GuessWhoSaidItGame.vue:288 -->
<h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>

<!-- MostLikelyToGame.vue:127 -->
<h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>
```

**Status:** ✅ These are correctly consistent!

---

#### Issue 5.2: Section Headings
**Location:** Multiple components

**Current Code Examples:**
```vue
<!-- WouldYouRatherGame.vue:265 -->
<h4 class="text-lg font-semibold mb-4">Results</h4>

<!-- HotTakesGame.vue:280 -->
<h3 class="font-semibold mb-4">Results</h3>

<!-- GuessWhoSaidItGame.vue:584 -->
<h3 class="font-semibold mb-4">Guess Accuracy</h3>

<!-- MostLikelyToGame.vue:276 -->
<h3 class="font-semibold mb-4">Top 3</h3>
```

**Impact:** Same-level headings use different tags (h3 vs h4) and different text sizes (`text-lg` vs no size class).

**Recommendation:** Standardize section headings:
```vue
<h3 class="text-lg font-semibold mb-4">Section Title</h3>
```

---

#### Issue 5.3: Page Titles
**Location:** Page headers

**Current Code Examples:**
```vue
<!-- pages/games/[groupId]/index.vue:52 -->
<h1 class="text-3xl font-bold">{{ group.name }}</h1>

<!-- pages/games/new.vue:12 -->
<h1 class="text-2xl sm:text-3xl font-bold">Create New Group</h1>

<!-- pages/profile/settings.vue:111 -->
<h1 class="text-3xl font-bold">Profile Settings</h1>
```

**Impact:** Mix of responsive (`text-2xl sm:text-3xl`) and fixed sizing.

**Recommendation:** All page titles should be responsive:
```vue
<h1 class="text-2xl sm:text-3xl font-bold">Page Title</h1>
```

---

### Typography Standardization Recommendations

**Proposed Type Scale:**
```
h1: text-2xl sm:text-3xl font-bold      → Page titles
h2: text-xl sm:text-2xl font-bold       → Component/Game titles
h3: text-lg font-semibold               → Section headings
h4: text-base font-semibold             → Subsection headings

Body:     text-base                     → Standard content
Small:    text-sm                       → Secondary content
XSmall:   text-xs                       → Labels, captions
```

---

## 6. Game Component Visual Consistency ⚠️

### Problem Statement
While game components follow similar patterns, there are subtle inconsistencies in how results and responses are displayed.

### Specific Issues Found:

#### Issue 6.1: Response Count Cards
**Location:** All game components (before submission)

**Current Code Examples:**
```vue
<!-- WouldYouRatherGame.vue:141-154 -->
<UCard class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
  <div class="py-6">
    <div class="text-4xl font-bold text-primary-600 mb-2">
      {{ responseCount }}
    </div>

<!-- HotTakesGame.vue:160-172 -->
<UCard class="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-800/20">
  <div class="py-6">
    <div class="text-4xl font-bold text-red-600 mb-2">
      {{ responseCount }}
    </div>

<!-- GuessWhoSaidItGame.vue:341-354 -->
<UCard class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-800/20">
  <div class="py-6">
    <div class="text-4xl font-bold text-purple-600 mb-2">
      {{ responseCount }}
    </div>

<!-- MostLikelyToGame.vue:169-182 -->
<UCard class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-800/20">
  <div class="py-6">
    <div class="text-4xl font-bold text-blue-600 mb-2">
      {{ responseCount }}
    </div>
```

**Status:** ✅ Excellent consistency across all game types! Each uses themed gradients matching their game type color.

**Recommendation:** This is a great pattern. Document it as the standard for pre-submission cards.

---

#### Issue 6.2: Progress Bars
**Location:** Results sections

**Current Code Examples:**
```vue
<!-- WouldYouRatherGame.vue:274-285 -->
<div class="w-full bg-gray-200 rounded-full h-4">
  <div
    class="bg-blue-500 h-4 rounded-full transition-all flex items-center justify-end pr-2"
    :style="{ width: `${percentage}%` }"
  >
    <span class="text-xs text-white font-bold">{{ percentage }}%</span>
  </div>
</div>

<!-- HotTakesGame.vue:289-294 -->
<div class="w-full bg-gray-200 rounded-full h-2">
  <div
    class="bg-green-500 h-2 rounded-full"
    :style="{ width: `${percentage}%` }"
  ></div>
</div>

<!-- MostLikelyToGame.vue:289-294 -->
<div class="w-24 bg-gray-200 rounded-full h-2">
  <div
    class="bg-blue-500 h-2 rounded-full"
    :style="{ width: `${percentage}%` }"
  ></div>
</div>
```

**Impact:** Progress bars have inconsistent heights:
- Would You Rather: `h-4` (16px) with percentage label
- Hot Takes: `h-2` (8px) no label
- Most Likely To: `h-2` (8px) with fixed width `w-24`

**Recommendation:** Standardize on two patterns:
- **Primary results** (main voting): `h-4` with inline percentage label
- **Secondary stats** (breakdowns): `h-2` without label

---

#### Issue 6.3: Visual Element Display
**Location:** All game prompts

**Current Code:**
```vue
<!-- All games follow this pattern ✅ -->
<!-- Custom Emoji Visual -->
<div v-if="prompt.visual?.type === 'emoji'" class="text-6xl mb-4">
  {{ prompt.visual?.value }}
</div>
<!-- Default Emoji -->
<div v-else class="text-3xl mb-2">🔥</div>

<!-- Background Image -->
<div
  v-if="prompt.visual?.type === 'image'"
  class="absolute inset-0 bg-cover bg-center opacity-20"
  :style="{ backgroundImage: `url(${prompt.visual?.value})` }"
></div>
```

**Status:** ✅ Perfectly consistent! Custom emojis are `text-6xl`, defaults are `text-3xl`, images are background at 20% opacity.

**Recommendation:** Keep this pattern, it's excellent.

---

### Game Component Standardization Recommendations

**Standard Game Component Structure:**
```vue
<div class="space-y-6">
  <!-- 1. Game Header (consistent across all) -->
  <div class="flex items-start justify-between gap-4">
    <div class="flex items-start gap-4 flex-1">
      <div class="p-3 rounded-lg bg-{color}-100 dark:bg-{color}-900/20">
        <UIcon :name="icon" class="w-8 h-8 text-{color}-600" />
      </div>
      <div class="flex-1">
        <h2 class="text-2xl font-bold">{{ gameMetadata.name }}</h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ description }}</p>
      </div>
    </div>
    <UPopover>...</UPopover>
  </div>

  <!-- 2. Response Count Card (before submission) -->
  <UCard class="bg-gradient-to-r from-{color}-50 to-{color2}-50 ...">
    <div class="py-6">
      <div class="text-4xl font-bold text-{color}-600 mb-2">
        {{ responseCount }}
      </div>
      <div class="text-lg font-semibold mb-1">
        {{ responseCount === 1 ? 'Response' : 'Responses' }}
      </div>
    </div>
  </UCard>

  <!-- 3. Game Prompt Card -->
  <UCard class="overflow-hidden relative">
    <!-- Visual elements -->
  </UCard>

  <!-- 4. Response Form -->
  <div class="space-y-4">
    <!-- Form fields -->
    <UButton size="lg" block>Submit Response</UButton>
  </div>

  <!-- 5. Results Section -->
  <div class="space-y-4">
    <!-- Result cards -->
  </div>

  <!-- 6. Admin Controls -->
  <div class="pt-6 border-t">
    <UButton size="md" variant="outline">End Game</UButton>
  </div>
</div>
```

---

## 7. Modal & Overlay Patterns ⚠️

### Problem Statement
Modals use inconsistent content padding and width constraints.

### Specific Issues Found:

#### Issue 7.1: Modal Width
**Location:** Modal components

**Current Code:**
```vue
<!-- ManagePromptsModal.vue:217 -->
<UModal
  :model-value="isOpen"
  @update:model-value="emit('close')"
  :ui="{ width: 'sm:max-w-3xl' }"
>

<!-- CreateGameForm - used in UModal but no explicit width -->
<UModal v-model:open="showCustomGameModal" title="Create Custom Game">
  <template #body>
    <GamesCreateGameForm ... />
  </template>
</UModal>
```

**Impact:** ManagePromptsModal has explicit width, CreateGameForm modal doesn't.

**Recommendation:** Set standard widths:
- **Narrow modals** (confirmations): `sm:max-w-md`
- **Standard modals** (forms): `sm:max-w-2xl`
- **Wide modals** (complex content): `sm:max-w-3xl`

---

#### Issue 7.2: Modal Content Padding
**Location:** Modal contents

**Current Code:**
```vue
<!-- ManagePromptsModal tabs use py-4 -->
<template #item="{ item }">
  <div v-if="item.label === 'Create Custom Prompt'" class="space-y-6 py-4">

<!-- But UCard inside has its own padding -->
<UCard>
  <template #header>...</template>
  <!-- implicit padding here -->
</UCard>
```

**Impact:** Double padding in some areas, inconsistent spacing.

**Recommendation:**
- Let UCard handle padding (remove `py-4` from tab content)
- Or use plain divs without UCard and manage padding explicitly
- Don't mix both approaches

---

### Modal Standardization Recommendations

**Standard Modal Pattern:**
```vue
<UModal
  :model-value="isOpen"
  @update:model-value="emit('close')"
  :ui="{ width: 'sm:max-w-2xl' }"  <!-- Choose based on content -->
>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Modal Title</h2>
        <UButton
          variant="ghost"
          icon="i-heroicons-x-mark"
          size="sm"
          @click="emit('close')"
        />
      </div>
    </template>

    <!-- Let UCard manage content padding -->
    <div class="space-y-6">
      <!-- Content -->
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="outline">Cancel</UButton>
        <UButton>Confirm</UButton>
      </div>
    </template>
  </UCard>
</UModal>
```

---

## 8. Responsive Design Patterns ⚠️

### Problem Statement
Breakpoint usage is inconsistent across the application.

### Specific Issues Found:

#### Issue 8.1: Grid Responsive Patterns
**Location:** Multiple grid layouts

**Current Code Examples:**
```vue
<!-- pages/games/[groupId]/index.vue:134 - game type cards -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">

<!-- components/games/WouldYouRatherGame.vue:157 - options -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">

<!-- components/games/MostLikelyToGame.vue:218 - member grid -->
<div class="grid grid-cols-2 md:grid-cols-3 gap-3">

<!-- pages/games/new.vue:59 - game selection -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
```

**Status:** ✅ Generally consistent: `md:grid-cols-2` for two-column layouts.

**Recommendation:** Keep this pattern. For member/card grids, consider:
```vue
<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
```
to utilize smaller screens better.

---

#### Issue 8.2: Text Size Responsiveness
**Location:** Headings and titles

**Current Code:**
```vue
<!-- Some are responsive -->
<h1 class="text-2xl sm:text-3xl font-bold">Create New Group</h1>

<!-- Others are not -->
<h1 class="text-3xl font-bold">{{ group.name }}</h1>

<!-- Prompt text varies -->
<p class="text-xl font-semibold">{{ prompt.statement }}</p>
<div class="text-lg font-semibold">{{ prompt.option_a }}</div>
```

**Impact:** Inconsistent text scaling on mobile devices.

**Recommendation:** Make all major headings responsive:
```
h1: text-2xl sm:text-3xl
h2: text-xl sm:text-2xl
Prompts: text-lg sm:text-xl
```

---

### Responsive Pattern Recommendations

**Standard Breakpoint Usage:**
```
sm: 640px   → Mobile landscape, small tablets
md: 768px   → Tablets
lg: 1024px  → Desktop
xl: 1280px  → Large desktop

Grid Patterns:
- Cards/Options: grid-cols-1 md:grid-cols-2
- Member grids: grid-cols-2 sm:grid-cols-3 md:grid-cols-4
- Game types: grid-cols-1 sm:grid-cols-2 md:grid-cols-3

Text Sizing:
- Always include sm: breakpoint for h1, h2
- Prompt text: text-lg sm:text-xl
- Body: text-sm sm:text-base (if needed)

Spacing:
- Padding: px-4 sm:px-6 lg:px-8
- Margin: py-6 sm:py-8
```

---

## Priority Action Plan

### Phase 1: High Priority Fixes (Week 1)
**Focus:** Input fields and buttons (most visible issues)

1. **Input Field Audit**
   - [ ] Create `INPUT_SIZES.md` documentation
   - [ ] Audit all 15+ forms
   - [ ] Apply `size="lg"` to primary forms
   - [ ] Apply `size="md"` (default) to secondary inputs
   - [ ] Ensure textareas match input sizes in same form

2. **Button Standardization**
   - [ ] Add explicit `size` props to all buttons
   - [ ] Standardize prop ordering
   - [ ] Primary CTAs: `size="lg"` + `block`
   - [ ] Admin controls: `size="md"` + `variant="outline"`

3. **Form Component Migration**
   - [ ] Replace all `UFormGroup` with `UFormField`
   - [ ] Ensure all help text uses `help` prop
   - [ ] Standardize field spacing

### Phase 2: Medium Priority (Week 2)
**Focus:** Spacing and layout consistency

4. **Spacing Audit**
   - [ ] Document spacing scale in design tokens
   - [ ] Standardize button group gaps to `gap-3`
   - [ ] Review card padding (remove explicit when possible)
   - [ ] Ensure consistent `space-y-6` for major sections

5. **Typography Standards**
   - [ ] Make all h1, h2 responsive
   - [ ] Standardize section heading classes
   - [ ] Document type scale

6. **Modal Improvements**
   - [ ] Set explicit widths on all modals
   - [ ] Remove double padding issues
   - [ ] Standardize modal footer button layouts

### Phase 3: Polish (Week 3)
**Focus:** Fine-tuning and documentation

7. **Progress Bar Standardization**
   - [ ] Primary results: `h-4` with labels
   - [ ] Secondary stats: `h-2` without labels

8. **Responsive Enhancements**
   - [ ] Add responsive text sizing to prompts
   - [ ] Optimize member grids for mobile

9. **Documentation**
   - [ ] Create component style guide
   - [ ] Add code examples to README
   - [ ] Create Figma/design reference

---

## Design Token Proposal

Create a centralized design system:

```typescript
// ~/config/design-tokens.ts

export const DESIGN_TOKENS = {
  spacing: {
    xs: '0.5rem',  // 8px  - gap-2
    sm: '0.75rem', // 12px - gap-3
    md: '1rem',    // 16px - gap-4
    lg: '1.5rem',  // 24px - space-y-6
    xl: '2rem',    // 32px - py-8
  },

  typography: {
    h1: 'text-2xl sm:text-3xl font-bold',
    h2: 'text-xl sm:text-2xl font-bold',
    h3: 'text-lg font-semibold',
    h4: 'text-base font-semibold',
    body: 'text-base',
    small: 'text-sm',
    caption: 'text-xs',
  },

  components: {
    input: {
      primary: { size: 'lg' },
      secondary: { size: 'md' },
      compact: { size: 'sm' },
    },
    button: {
      cta: { size: 'lg', block: true },
      secondary: { size: 'lg' },
      admin: { size: 'md', variant: 'outline' },
      icon: { size: 'sm' },
    },
    card: {
      compact: 'p-3',
      standard: 'p-4',
      spacious: 'p-6',
    },
  },
} as const;
```

---

## Conclusion

### Summary of Findings

**Strengths:**
- ✅ Visual element system (emojis/images) is well-designed and consistent
- ✅ Game component structure follows similar patterns
- ✅ Color theming for game types is excellent
- ✅ Nuxt UI components are used effectively

**Areas for Improvement:**
- ⚠️ **Input field sizing** lacks standardization (HIGH PRIORITY)
- ⚠️ **Button sizing** needs explicit size props
- ⚠️ **Form components** should migrate to UFormField
- ⚠️ **Spacing** could be more predictable with tokens
- ⚠️ **Typography** needs responsive patterns
- ⚠️ **Modals** need width and padding standards

### Estimated Effort

- **Input & Button fixes:** 4-6 hours
- **Form migration:** 3-4 hours
- **Spacing audit:** 2-3 hours
- **Typography updates:** 2-3 hours
- **Modal improvements:** 2 hours
- **Documentation:** 3-4 hours

**Total:** ~16-22 hours of focused refactoring

### Success Metrics

After implementing these changes, you should see:
1. **All form inputs** have consistent sizing within their context
2. **All buttons** have explicit size props
3. **Zero mixing** of UFormGroup and UFormField
4. **Predictable spacing** using documented scale
5. **Responsive typography** across all pages
6. **Design token system** for future consistency

---

**Next Steps:**
1. Review this audit with the team
2. Prioritize based on user impact
3. Create GitHub issues for each phase
4. Begin Phase 1 implementation
5. Test across devices after each phase

---

*This audit was conducted by analyzing 15+ components, 5+ pages, and 1000+ lines of Vue template code. All examples are from actual production code as of 2025-12-24.*

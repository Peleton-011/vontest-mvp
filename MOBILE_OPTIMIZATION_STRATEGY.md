# Mobile Optimization Strategy

## Executive Summary

This document outlines a comprehensive mobile-first redesign strategy for the VonTest MVP application. The primary goal is to optimize the mobile experience while preserving the existing desktop layout and functionality.

**Core Philosophy:** Mobile users should have a native app-like experience with bottom navigation, optimized spacing, and touch-friendly interactions—all without degrading the desktop experience.

---

## Current Mobile Pain Points

### 1. **Tab Navigation Issues**
- **Problem:** Horizontal `UTabs` component at top of screen takes valuable vertical space
- **Impact:** Tabs are small touch targets, text can overflow, navigation is not thumb-friendly
- **Location:** `/games/[groupId]/index.vue` (Games, Chat, Members, Invite tabs)

### 2. **Header Overflow**
- **Problem:** Group header with avatar, description, and buttons cramped on mobile
- **Impact:** Poor readability, overlapping elements, buttons too small
- **Location:** `/games/[groupId]/index.vue` lines 47-92

### 3. **Admin Controls**
- **Problem:** Multiple action buttons in horizontal row overflow on mobile
- **Impact:** Buttons stack awkwardly, text truncates, hard to tap
- **Location:** `/games/[groupId]/index.vue` lines 101-127

### 4. **Top Navigation Bar**
- **Problem:** Desktop navbar with multiple links doesn't scale to mobile
- **Impact:** Links are cramped, some hidden on smaller screens
- **Location:** `/components/Navbar.vue` lines 27-67

### 5. **Container Padding**
- **Problem:** Desktop padding (`px-4`, `px-6`) wastes screen real estate on mobile
- **Impact:** Content feels cramped, less breathing room for touch targets
- **Location:** Multiple pages use `container mx-auto px-4 py-8`

### 6. **Form Layouts**
- **Problem:** Multi-column layouts and side-by-side buttons don't work on mobile
- **Impact:** Elements too small, forms hard to use
- **Location:** Game components, create game form

### 7. **Modal Sizes**
- **Problem:** Modals don't adapt to mobile screen sizes
- **Impact:** Content cut off, poor UX
- **Location:** ManagePromptsModal, ProfileModal

---

## Mobile-First Redesign Strategy

### Design Principles

1. **Bottom Navigation First:** Primary navigation should be thumb-accessible
2. **Vertical-First Layouts:** Stack elements vertically on mobile, horizontal on desktop
3. **Touch Target Minimum:** 44px minimum touch target size (Apple HIG standard)
4. **Progressive Enhancement:** Build for mobile, enhance for desktop
5. **No Horizontal Scroll:** Ever. Period.
6. **Reduced Visual Noise:** Simplify UI, hide secondary actions in menus on mobile

### Breakpoint Strategy

```typescript
// Use Nuxt UI built-in breakpoints
sm: 640px   // Small phones → Tablets (portrait)
md: 768px   // Tablets (portrait) → Tablets (landscape)
lg: 1024px  // Tablets (landscape) → Desktop
xl: 1280px  // Desktop → Large desktop
```

**Mobile-first approach:**
- Base styles: Mobile (< 640px)
- `sm:` modifier: Small tablets and up
- `md:` modifier: Tablets landscape and up (THIS IS THE DESKTOP THRESHOLD)
- `lg:` and `xl:`: Large screens

---

## Component-by-Component Changes

### 1. Bottom Navigation Component

**New Component:** `components/BottomNav.vue`

**Purpose:** Mobile-only bottom navigation bar for group pages

**Design Specs:**
```
- Fixed to bottom of screen on mobile (< md)
- Hidden on desktop (≥ md)
- Height: 64px (includes safe area for iOS notch)
- 4 equal-width tabs: Games, Chat, Members, Invite
- Icons: 24px
- Labels: 10px font, optional (can hide on very small screens)
- Active state: Primary color fill, bold label
- Safe area padding: pb-safe (iOS)
- Background: bg-white dark:bg-neutral-900 with border-top
- z-index: 50 (above content, below modals)
```

**Visual Hierarchy:**
```
┌────────────────────────────┐
│   [Icon]     [Icon]        │
│   Games      Chat          │  ← Active tab is colored
│                            │
│   [Icon]     [Icon]        │
│   Members    Invite        │
└────────────────────────────┘
```

**Interaction:**
- Tap to switch tabs (same as desktop)
- Active tab syncs with URL query param
- Smooth transitions between tabs
- Haptic feedback on iOS (if available)

**Implementation Notes:**
- Use Vue 3 Teleport to render at root level
- CSS: `position: fixed; bottom: 0; left: 0; right: 0;`
- Add `pb-16 md:pb-0` to main content to prevent overlap
- Use `v-if="isMobile"` to conditionally render

---

### 2. Mobile App Layout

**New Layout:** `layouts/mobile-app.vue`

**Purpose:** App shell for group pages with bottom nav

**Structure:**
```vue
<template>
  <div class="min-h-screen flex flex-col bg-neutral-900">
    <!-- Top bar (mobile) - Sticky -->
    <div class="md:hidden sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800">
      <div class="px-4 py-3 flex items-center justify-between">
        <button @click="goBack" aria-label="Back">
          <UIcon name="i-heroicons-arrow-left" class="w-6 h-6" />
        </button>
        <h1 class="font-semibold text-lg truncate">{{ groupName }}</h1>
        <button @click="openMenu" aria-label="Menu">
          <UIcon name="i-heroicons-ellipsis-vertical" class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Main content area -->
    <main class="flex-1 overflow-auto pb-16 md:pb-0">
      <slot />
    </main>

    <!-- Bottom nav (mobile only) -->
    <BottomNav v-if="isMobile" :active-tab="activeTab" @update:active-tab="setTab" />
  </div>
</template>
```

**Key Features:**
- Sticky top bar on mobile with back button and menu
- Content area has bottom padding for nav (pb-16 on mobile, pb-0 on desktop)
- Bottom nav teleported to root level
- Desktop shows regular navbar, no bottom nav

---

### 3. Group Page Mobile Redesign

**File:** `pages/games/[groupId]/index.vue`

#### 3.1 Group Header (Mobile)

**Current:**
```vue
<div class="flex items-start gap-6 mb-8">
  <UAvatar :src="group.avatar_url" size="2xl" />
  <div class="flex-1">
    <h1 class="text-2xl sm:text-3xl font-bold">{{ group.name }}</h1>
    <p>{{ group.description }}</p>
    <div class="flex gap-4 mt-4">...</div>
  </div>
  <div class="flex gap-2">
    <UButton>Settings</UButton>
    <UButton>Leave</UButton>
  </div>
</div>
```

**Mobile Optimized:**
```vue
<!-- Mobile Header -->
<div class="md:hidden px-4 py-4 bg-neutral-800 rounded-lg mb-4">
  <div class="flex items-center gap-3 mb-3">
    <UAvatar :src="group.avatar_url" size="lg" />
    <div class="flex-1 min-w-0">
      <h1 class="text-xl font-bold truncate">{{ group.name }}</h1>
      <p class="text-sm text-gray-400">
        {{ memberCount }} {{ memberCount === 1 ? "member" : "members" }}
      </p>
    </div>
    <!-- Menu button (opens sheet with Settings/Leave) -->
    <UButton variant="ghost" icon="i-heroicons-ellipsis-vertical" @click="openGroupMenu" />
  </div>
  <p v-if="group.description" class="text-sm text-gray-300 line-clamp-2">
    {{ group.description }}
  </p>
</div>

<!-- Desktop Header (unchanged) -->
<div class="hidden md:flex items-start gap-6 mb-8">
  <!-- Original desktop header -->
</div>
```

**Changes:**
- Avatar size reduced: 2xl → lg
- Title size reduced: 2xl/3xl → xl
- Description line-clamped to 2 lines
- Action buttons moved to menu sheet
- Horizontal layout maintained but tighter spacing
- Background card for better visual separation

#### 3.2 Admin Controls (Mobile)

**Current:**
```vue
<div class="mb-6 flex justify-between items-center">
  <div>...</div>
  <div class="flex gap-3">
    <UButton>Start Game Now</UButton>
    <UButton>Make Custom Game</UButton>
    <ManagePromptsModal />
  </div>
</div>
```

**Mobile Optimized:**
```vue
<!-- Mobile Admin Controls -->
<div class="md:hidden mb-4 space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold">Daily Games</h3>
      <p class="text-xs text-gray-400">
        Auto-created at {{ settings.notification_time }}
      </p>
    </div>
  </div>

  <!-- Stack buttons vertically -->
  <div class="grid grid-cols-2 gap-2">
    <UButton block size="md" icon="i-heroicons-sparkles" @click="handleStartGameNow">
      Start Now
    </UButton>
    <UButton block size="md" variant="outline" icon="i-heroicons-pencil" @click="handleOpenCustomGame">
      Custom Game
    </UButton>
  </div>
  <UButton block size="md" variant="ghost" icon="i-heroicons-cog-6-tooth" @click="openPromptsModal">
    Manage Prompts
  </UButton>
</div>

<!-- Desktop Admin Controls (unchanged) -->
<div class="hidden md:flex mb-6 justify-between items-center">
  <!-- Original desktop layout -->
</div>
```

**Changes:**
- Buttons in 2-column grid instead of horizontal row
- Shorter button text ("Start Now" vs "Start Game Now")
- ManagePrompts as full-width button instead of modal trigger
- Time info simplified (no timezone on mobile)

#### 3.3 Tab Content

**Current:**
```vue
<UTabs v-model="activeTab" :items="tabs" class="mb-8">
  <template #games>...</template>
  <template #chat>...</template>
  <template #members>...</template>
  <template #invite>...</template>
</UTabs>
```

**Mobile Optimized:**
```vue
<!-- Desktop Tabs (unchanged) -->
<UTabs v-if="!isMobile" v-model="activeTab" :items="tabs" class="mb-8">
  <!-- Same templates -->
</UTabs>

<!-- Mobile: Direct content rendering (no UTabs component) -->
<div v-else class="pb-safe">
  <div v-show="activeTab === 'games'" class="px-4">
    <!-- Games content -->
  </div>
  <div v-show="activeTab === 'chat'" class="px-4">
    <!-- Chat content -->
  </div>
  <div v-show="activeTab === 'members'" class="px-4">
    <!-- Members content -->
  </div>
  <div v-show="activeTab === 'invite'" class="px-4">
    <!-- Invite content -->
  </div>
</div>

<!-- Bottom Nav (separate component) -->
<BottomNav v-if="isMobile" v-model="activeTab" />
```

**Changes:**
- Desktop keeps UTabs at top
- Mobile removes UTabs, shows content directly
- Bottom nav controls activeTab via v-model
- Each tab content wrapped in container with padding
- v-show (not v-if) for instant tab switching

---

### 4. Game Components Mobile Optimization

**File:** `components/games/GameLayout.vue`

#### 4.1 Game Header

**Current:**
```vue
<GamesGameHeader :metadata="gameMetadata" />
```

**Mobile Optimized:**
GameHeader component already exists, just needs responsive sizing:

```vue
<!-- In GameHeader.vue -->
<div class="flex items-start justify-between gap-4">
  <div class="flex items-start gap-3 md:gap-4 flex-1">
    <!-- Icon container -->
    <div
      class="p-2 md:p-3 rounded-lg"
      :class="[`bg-${metadata.color}-100 dark:bg-${metadata.color}-900/20`]"
    >
      <UIcon
        :name="metadata.icon"
        class="w-6 h-6 md:w-8 md:h-8"
        :class="`text-${metadata.color}-600`"
      />
    </div>
    <div class="flex-1 min-w-0">
      <h2 class="text-lg md:text-2xl font-bold truncate md:overflow-visible">
        {{ metadata.name }}
      </h2>
      <p class="text-sm md:text-base text-gray-400 mt-1 line-clamp-2 md:line-clamp-none">
        {{ metadata.description }}
      </p>
    </div>
  </div>

  <!-- How to play button -->
  <UPopover v-if="showHowToPlay">
    <UButton
      variant="ghost"
      icon="i-heroicons-question-mark-circle"
      class="shrink-0"
      size="sm"
    />
    <template #panel>
      <div class="p-4 max-w-sm">
        <!-- Panel content responsive -->
      </div>
    </template>
  </UPopover>
</div>
```

**Changes:**
- Icon size: 6→6 mobile, 8→8 desktop
- Padding: p-2→p-3
- Title: text-lg→text-2xl
- Description: text-sm→text-base, line-clamp-2 on mobile
- Gap spacing reduced on mobile

#### 4.2 Game Cards & Voting UI

**Example: Would You Rather**

**Current:**
```vue
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <UCard>Option A</UCard>
  <UCard>Option B</UCard>
</div>
```

**Mobile Optimized:**
```vue
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
  <UCard class="touch-manipulation">
    <!-- Larger touch targets on mobile -->
    <div class="p-4 md:p-6">
      <!-- Option A content -->
    </div>
  </UCard>
  <UCard class="touch-manipulation">
    <div class="p-4 md:p-6">
      <!-- Option B content -->
    </div>
  </UCard>
</div>
```

**Changes:**
- Gap: 3 on mobile, 4 on desktop
- Card padding: p-4→p-6
- Add touch-manipulation class for better tap response
- Font sizes scale: text-sm→text-base, text-lg→text-xl

#### 4.3 Submit Buttons

**Current:**
```vue
<UButton block size="lg" @click="handleSubmit">
  Submit Response
</UButton>
```

**Mobile Optimized:**
```vue
<!-- Mobile: Fixed to bottom with safe area -->
<div class="md:relative fixed bottom-16 left-0 right-0 p-4 md:p-0 bg-neutral-900 md:bg-transparent border-t md:border-t-0 border-neutral-800 md:border-none">
  <UButton block size="lg" @click="handleSubmit">
    Submit Response
  </UButton>
</div>
```

**Changes:**
- Fixed to bottom on mobile (above bottom nav)
- Background + border for visual separation
- Safe area padding (bottom-16 = 64px bottom nav)
- Desktop: relative positioning, no special treatment

---

### 5. Top Navigation (Navbar) Mobile Optimization

**File:** `components/Navbar.vue`

**Current Issues:**
- Too many links in horizontal row
- Links too small for touch
- Takes vertical space

**Mobile Optimized:**

```vue
<template>
  <nav class="w-full bg-neutral-900 text-white shadow-md">
    <!-- Desktop Nav -->
    <div class="hidden md:block">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <!-- Original desktop nav -->
      </div>
    </div>

    <!-- Mobile Nav -->
    <div class="md:hidden">
      <div class="px-4 py-3 flex items-center justify-between">
        <!-- Logo/Home -->
        <NuxtLink to="/" class="text-xl font-bold">
          VonTest
        </NuxtLink>

        <!-- Right side -->
        <div class="flex items-center gap-3">
          <!-- Profile Avatar -->
          <button
            v-if="user"
            @click="showProfileModal = true"
            class="focus:outline-none"
          >
            <UAvatar :src="profile?.avatar_url" size="sm" />
          </button>

          <!-- Hamburger Menu -->
          <button
            @click="toggleMobileMenu"
            class="p-2"
            aria-label="Menu"
          >
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Slide-out Menu (Sheet/Drawer) -->
    <UDrawer v-model="showMobileMenu" side="right">
      <div class="p-6 space-y-6">
        <nav class="space-y-4">
          <NuxtLink
            v-for="link in mobileLinks"
            :key="link.to"
            :to="link.to"
            class="block text-lg font-semibold py-3 border-b border-neutral-800"
            @click="closeMobileMenu"
          >
            <UIcon :name="link.icon" class="w-5 h-5 inline mr-3" />
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Auth buttons if not logged in -->
        <div v-if="!user" class="space-y-3 pt-4 border-t border-neutral-800">
          <UButton block to="/login">Login</UButton>
          <UButton block variant="outline" to="/signup">Sign Up</UButton>
        </div>
      </div>
    </UDrawer>
  </nav>
</template>

<script setup lang="ts">
const showMobileMenu = ref(false);

const mobileLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'i-heroicons-home' },
  { to: '/games', label: 'Games', icon: 'i-heroicons-puzzle-piece' },
];

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
};

const closeMobileMenu = () => {
  showMobileMenu.value = false;
};
</script>
```

**Changes:**
- Desktop nav hidden on mobile (`hidden md:block`)
- Mobile nav: Logo + Avatar + Hamburger only
- Full navigation in slide-out drawer
- Larger touch targets (py-3, text-lg)
- Icons next to labels for clarity
- Auto-close drawer on navigation

---

### 6. Chat Section Mobile

**File:** `components/ui/ChatSection.vue`

**Mobile Optimizations:**

```vue
<template>
  <div class="flex flex-col h-full">
    <!-- Messages Area -->
    <div class="flex-1 overflow-y-auto space-y-3 px-3 md:px-4 py-4">
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex gap-2 md:gap-3"
      >
        <!-- Avatar smaller on mobile -->
        <UAvatar :src="message.user_avatar" size="xs" class="md:size-sm" />
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-sm md:text-base font-semibold truncate">
              {{ message.user_name }}
            </span>
            <span class="text-xs text-gray-500 shrink-0">
              {{ formatTime(message.created_at) }}
            </span>
          </div>
          <p class="text-sm md:text-base text-gray-300 break-words">
            {{ message.content }}
          </p>
        </div>
      </div>
    </div>

    <!-- Input Area - Fixed to bottom -->
    <div class="border-t border-neutral-800 p-3 md:p-4 bg-neutral-900">
      <div class="flex gap-2">
        <UInput
          v-model="newMessage"
          placeholder="Type a message..."
          class="flex-1"
          size="md"
          @keyup.enter="sendMessage"
        />
        <UButton
          icon="i-heroicons-paper-airplane"
          size="md"
          @click="sendMessage"
          :disabled="!newMessage.trim()"
        />
      </div>
    </div>
  </div>
</template>
```

**Changes:**
- Avatar size: xs on mobile, sm on desktop
- Text sizes scale: text-sm→text-base
- Padding reduced on mobile: px-3→px-4
- Input area padding: p-3→p-4
- Send button icon-only on mobile (no label)

---

### 7. Modals & Sheets Mobile Strategy

**Problem:** Full modals don't work well on mobile

**Solution:** Use bottom sheets instead

**Pattern:**
```vue
<!-- Desktop: Modal -->
<UModal v-if="!isMobile" v-model="isOpen">
  <div class="p-6">
    <!-- Content -->
  </div>
</UModal>

<!-- Mobile: Bottom Sheet (Drawer) -->
<UDrawer v-else v-model="isOpen" side="bottom">
  <div class="p-6 max-h-[80vh] overflow-y-auto">
    <!-- Same content -->
  </div>
</UDrawer>
```

**Apply to:**
- ProfileModal
- ManagePromptsModal
- CreateCustomGameModal
- Any other modals

**Benefits:**
- Easier to dismiss (swipe down)
- Doesn't block entire screen
- More native app-like feel
- Better for one-handed use

---

## Global CSS Utilities

**New utility classes for mobile:**

```css
/* assets/css/main.css */

/* Safe area support for iOS */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  .bottom-nav-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Touch optimization */
.touch-manipulation {
  touch-action: manipulation; /* Prevents double-tap zoom */
  -webkit-tap-highlight-color: transparent;
}

/* Hide scrollbar on mobile */
@media (max-width: 767px) {
  .hide-scrollbar-mobile {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .hide-scrollbar-mobile::-webkit-scrollbar {
    display: none;
  }
}

/* Thumb-friendly minimum touch target */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Prevent text selection on mobile (for buttons/cards) */
.no-select-mobile {
  @media (max-width: 767px) {
    user-select: none;
    -webkit-user-select: none;
  }
}
```

---

## Container & Spacing Strategy

### Current Containers

Most pages use:
```vue
<div class="container mx-auto px-4 py-8">
```

### Mobile-Optimized Containers

```vue
<!-- Replace with: -->
<div class="container mx-auto px-3 md:px-4 py-4 md:py-8">
```

**Changes:**
- Horizontal padding: px-3 on mobile, px-4 on desktop
- Vertical padding: py-4 on mobile, py-8 on desktop
- Saves ~8px of horizontal space on mobile
- Tighter vertical rhythm on mobile

### Section Spacing

**Current:**
```vue
<div class="space-y-6">
  <div class="mb-8">
```

**Mobile-Optimized:**
```vue
<div class="space-y-4 md:space-y-6">
  <div class="mb-4 md:mb-8">
```

**Pattern:** Reduce all spacing by ~25% on mobile

---

## Responsive Typography Scale

### Current Font Sizes

```
text-xs: 0.75rem (12px)
text-sm: 0.875rem (14px)
text-base: 1rem (16px)
text-lg: 1.125rem (18px)
text-xl: 1.25rem (20px)
text-2xl: 1.5rem (24px)
text-3xl: 1.875rem (30px)
```

### Mobile Font Size Strategy

**Headings:**
- H1: `text-xl md:text-3xl` (20px → 30px)
- H2: `text-lg md:text-2xl` (18px → 24px)
- H3: `text-base md:text-xl` (16px → 20px)

**Body:**
- Primary text: `text-sm md:text-base` (14px → 16px)
- Secondary text: `text-xs md:text-sm` (12px → 14px)

**Buttons:**
- Large: `text-base md:text-lg` (16px → 18px)
- Medium: `text-sm md:text-base` (14px → 16px)
- Small: `text-xs md:text-sm` (12px → 14px)

**Apply globally:**
- Find all headings and apply responsive classes
- Review all components for font sizes
- Ensure minimum 14px for body text (accessibility)

---

## Bottom Navigation Implementation Details

### Component Structure

**File:** `components/BottomNav.vue`

```vue
<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 md:hidden bottom-nav-safe"
    role="navigation"
    aria-label="Group navigation"
  >
    <div class="grid grid-cols-4 h-16">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="setActiveTab(tab.value)"
        :aria-label="tab.label"
        :aria-current="activeTab === tab.value ? 'page' : undefined"
        class="flex flex-col items-center justify-center gap-1 transition-colors touch-target"
        :class="[
          activeTab === tab.value
            ? 'text-primary-600 dark:text-primary-500'
            : 'text-gray-500 dark:text-gray-400'
        ]"
      >
        <UIcon :name="tab.icon" class="w-6 h-6" aria-hidden="true" />
        <span
          class="text-[10px] font-medium leading-none"
          :class="{ 'font-semibold': activeTab === tab.value }"
        >
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
interface Tab {
  value: string;
  label: string;
  icon: string;
}

const props = defineProps<{
  activeTab: string;
  tabs: Tab[];
}>();

const emit = defineEmits<{
  'update:activeTab': [value: string];
}>();

const setActiveTab = (value: string) => {
  emit('update:activeTab', value);

  // Haptic feedback on iOS (if available)
  if (window.navigator.vibrate) {
    window.navigator.vibrate(10);
  }
};
</script>
```

### Integration Pattern

**In group page:**

```vue
<template>
  <div class="min-h-screen flex flex-col">
    <!-- Page content with bottom padding -->
    <div class="flex-1 pb-16 md:pb-0">
      <!-- Desktop tabs -->
      <UTabs v-if="!isMobile" v-model="activeTab" :items="tabs">
        <!-- Tab content -->
      </UTabs>

      <!-- Mobile content (no UTabs) -->
      <div v-else>
        <div v-show="activeTab === 'games'">
          <!-- Games content -->
        </div>
        <!-- Other tabs... -->
      </div>
    </div>

    <!-- Bottom nav (mobile only) -->
    <BottomNav
      v-if="isMobile"
      v-model:active-tab="activeTab"
      :tabs="tabs"
    />
  </div>
</template>
```

---

## Game-Specific Mobile Optimizations

### Would You Rather

**Option Cards:**
- Stack on very small screens (< sm)
- Side-by-side on tablets+ (≥ sm)
- Increase card padding for easier tapping
- Make entire card clickable, not just choice

```vue
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <UCard
    class="cursor-pointer active:scale-95 transition-transform touch-manipulation"
    @click="selectOption('a')"
  >
    <!-- Large touch target, full card clickable -->
  </UCard>
</div>
```

### Hot Takes

**Stance Buttons:**
- Make horizontal on mobile (3 buttons in row)
- Larger buttons with icons
- Clear active state

```vue
<div class="grid grid-cols-3 gap-2 md:gap-3">
  <UButton
    block
    size="lg"
    :variant="responseForm.stance === 'agree' ? 'solid' : 'outline'"
    @click="responseForm.stance = 'agree'"
    class="touch-target"
  >
    <UIcon name="i-heroicons-check-circle" class="w-5 h-5 md:hidden" />
    <span class="hidden md:inline">Agree</span>
  </UButton>
  <!-- Repeat for neutral, disagree -->
</div>
```

### Bracket Battle

**Tournament Bracket:**
- Horizontal scroll on mobile (hide scrollbar)
- Vertical layout for each round
- Tap matchup to vote (full card tap target)

```vue
<div class="overflow-x-auto hide-scrollbar-mobile -mx-3 px-3">
  <div class="flex gap-4 min-w-max py-4">
    <!-- Each round as vertical column -->
    <div v-for="round in bracket" class="flex flex-col gap-3 min-w-[200px]">
      <!-- Matchups -->
    </div>
  </div>
</div>
```

### Compliment Economy

**Compliment Feed:**
- Full-width cards on mobile
- Smaller avatars
- Shorter text snippets with "Read more"

```vue
<div class="space-y-3 md:space-y-4">
  <UCard v-for="compliment in feed" class="p-3 md:p-4">
    <div class="flex gap-2 md:gap-3">
      <UAvatar :src="compliment.from_avatar" size="sm" />
      <div class="flex-1 min-w-0">
        <p class="text-sm md:text-base line-clamp-3 md:line-clamp-none">
          {{ compliment.text }}
        </p>
      </div>
    </div>
  </UCard>
</div>
```

---

## Form Optimization

### Create Group Form

**File:** `pages/games/new.vue`

**Mobile Layout:**
```vue
<form class="space-y-4 md:space-y-6">
  <!-- All inputs full width -->
  <UFormField label="Group Name" required>
    <UInput
      v-model="form.name"
      size="lg"
      placeholder="e.g., College Friends"
      class="w-full"
    />
  </UFormField>

  <!-- Game selection: 2 columns on mobile, 3 on desktop -->
  <div class="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
    <UCard v-for="game in availableGames">
      <!-- Game cards -->
    </UCard>
  </div>

  <!-- Submit button: Fixed on mobile -->
  <div class="md:relative fixed bottom-0 left-0 right-0 p-4 md:p-0 bg-white dark:bg-neutral-900 border-t md:border-t-0">
    <UButton type="submit" block size="lg">
      Create Group
    </UButton>
  </div>
</form>

<!-- Add padding to form to prevent overlap with fixed button -->
<div class="h-20 md:h-0" aria-hidden="true"></div>
```

---

## Testing Checklist

### Devices to Test

**Simulators/Emulators:**
- iPhone SE (375px width - smallest modern iPhone)
- iPhone 14 Pro (393px width)
- iPhone 14 Pro Max (430px width)
- iPad Mini (768px width - md breakpoint)
- Android (360px width - common Android)
- Android Tablet (800px width)

**Browsers:**
- Safari (iOS)
- Chrome (Android)
- Safari (Desktop)
- Chrome (Desktop)
- Firefox (Desktop)

### Test Scenarios

**Navigation:**
- [ ] Bottom nav visible only on mobile (< md)
- [ ] Bottom nav switches tabs correctly
- [ ] Active tab highlighted
- [ ] Safe area padding works on iOS
- [ ] Navbar hamburger menu opens/closes
- [ ] Drawer navigation works

**Layouts:**
- [ ] No horizontal scroll anywhere
- [ ] Touch targets minimum 44px
- [ ] Forms are single column on mobile
- [ ] Buttons stack vertically on mobile
- [ ] Cards scale properly
- [ ] Images don't overflow

**Typography:**
- [ ] All text readable (minimum 14px body)
- [ ] Headings scale down on mobile
- [ ] No text truncation unless intentional
- [ ] Line heights comfortable for reading

**Games:**
- [ ] All game types playable on mobile
- [ ] Voting UI works with touch
- [ ] Results visible without scrolling too much
- [ ] Animations smooth, not janky
- [ ] Submit buttons accessible

**Performance:**
- [ ] No layout shift on page load
- [ ] Transitions smooth (60fps)
- [ ] Images lazy load
- [ ] Bottom nav doesn't cause reflow

**Accessibility:**
- [ ] Touch targets 44px minimum
- [ ] Focus states visible
- [ ] ARIA labels correct
- [ ] Screen reader friendly
- [ ] Keyboard nav works (even on mobile browsers)

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal:** Set up responsive infrastructure

1. **Create BottomNav component**
   - Build component with all features
   - Add haptic feedback
   - Test on iOS/Android simulators

2. **Add global mobile utilities**
   - Update main.css with mobile classes
   - Add safe area support
   - Test on devices with notches

3. **Set up breakpoint composable**
   - Use existing useBreakpoints from Navbar
   - Make globally available
   - Document usage pattern

4. **Update container patterns**
   - Find all `container mx-auto` instances
   - Apply responsive padding
   - Update spacing scale

### Phase 2: Core Pages (Week 2)

**Goal:** Mobile-optimize primary user flows

1. **Group page (/games/[groupId])**
   - Implement bottom nav integration
   - Mobile header redesign
   - Admin controls mobile layout
   - Tab content optimization

2. **Groups list (/games)**
   - Mobile card layout
   - Touch-friendly cards
   - Responsive grid

3. **Create group (/games/new)**
   - Mobile form layout
   - Fixed submit button
   - Responsive game selection grid

### Phase 3: Game Components (Week 3)

**Goal:** Optimize all game types for mobile

1. **GameLayout.vue**
   - Responsive header
   - Mobile submit button pattern
   - Results section optimization

2. **Individual game components**
   - Would You Rather: Card layout
   - Hot Takes: Button grid
   - Guess Who Said It: Response cards
   - Most Likely To: Voting UI
   - Predictor: Prediction form
   - The Guests: Guest selection
   - Two Truths: Statement cards
   - Complimentary: Compliment feed
   - Bracket Royale: Scrollable bracket

### Phase 4: Supporting UI (Week 4)

**Goal:** Polish all remaining interfaces

1. **Navbar mobile**
   - Hamburger menu
   - Drawer implementation
   - Mobile-friendly profile

2. **Modals → Bottom sheets**
   - Convert all modals
   - Test drawer patterns
   - Improve dismiss UX

3. **Chat section**
   - Mobile message layout
   - Input area optimization
   - Avatar sizing

4. **Settings pages**
   - Form layouts
   - Toggle switches larger
   - Save button pattern

### Phase 5: Testing & Polish (Week 5)

**Goal:** Ensure quality across devices

1. **Device testing**
   - Test on real devices
   - Fix iOS-specific issues
   - Fix Android-specific issues

2. **Performance optimization**
   - Lazy load heavy components
   - Optimize images
   - Reduce bundle size for mobile

3. **Accessibility audit**
   - Touch target sizes
   - Screen reader testing
   - Keyboard navigation

4. **Animation polish**
   - Smooth transitions
   - Remove janky animations
   - Optimize for 60fps

---

## Desktop Preservation Strategy

### Critical Rule: Desktop Must Not Break

**Approach:** Mobile-first, desktop-additive

**Pattern:**
```vue
<!-- Mobile base styles -->
<div class="p-3 text-sm">

<!-- Desktop enhancements -->
<div class="p-3 md:p-4 text-sm md:text-base">
```

**Never:**
```vue
<!-- BAD: Desktop-first that might break mobile -->
<div class="p-4 mobile:p-3">
```

### Desktop Testing

**After every change:**
1. View on desktop (≥ 768px width)
2. Verify layout unchanged
3. Check spacing preserved
4. Confirm interactions work

**Automated tests:**
- Visual regression tests at 1280px width
- Interaction tests on desktop
- Ensure no mobile-only code runs on desktop

---

## Performance Considerations

### Bundle Size

**Strategy:** Code-split mobile components

```typescript
// composables/useMobileNav.ts
export const useMobileNav = () => {
  if (process.client && window.innerWidth >= 768) {
    // Don't load mobile nav code on desktop
    return null;
  }

  // Load mobile nav logic
  return {
    // ...
  };
};
```

### Image Optimization

**Use srcset for responsive images:**
```vue
<img
  :srcset="`
    ${image.url}?w=400 400w,
    ${image.url}?w=800 800w,
    ${image.url}?w=1200 1200w
  `"
  sizes="(max-width: 768px) 400px, 800px"
  :src="image.url"
  loading="lazy"
/>
```

### Animation Performance

**Use CSS transforms, avoid layout thrashing:**
```css
/* Good - GPU accelerated */
.button {
  transform: scale(1);
  transition: transform 200ms;
}
.button:active {
  transform: scale(0.95);
}

/* Bad - causes reflow */
.button {
  width: 100px;
  transition: width 200ms;
}
.button:active {
  width: 95px;
}
```

---

## Future Enhancements

### PWA Features

**Add to homescreen:**
- Web app manifest
- Service worker
- Offline support
- Push notifications

**Benefits:**
- Native app feel
- Icon on homescreen
- Works offline
- Fast load times

### Advanced Mobile Features

**Gestures:**
- Swipe to switch tabs
- Pull to refresh
- Swipe to dismiss modals

**Native APIs:**
- Share API for invites
- Haptic feedback
- Clipboard API
- Camera for avatars

**Performance:**
- Virtual scrolling for long lists
- Intersection observer for lazy loading
- Web workers for heavy computations

---

## Summary & Quick Reference

### Key Changes

1. **Bottom Navigation** - Fixed nav bar for mobile group pages
2. **Responsive Containers** - Tighter padding on mobile (px-3 vs px-4)
3. **Typography Scale** - Smaller fonts on mobile (text-sm vs text-base)
4. **Touch Targets** - Minimum 44px for all interactive elements
5. **Modals → Sheets** - Bottom drawers instead of centered modals
6. **Form Layouts** - Single column on mobile, fixed submit buttons
7. **Navigation** - Hamburger menu for mobile navbar
8. **Spacing** - 25% reduction in gaps/margins on mobile

### Breakpoint Usage

```vue
<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="md:hidden">Mobile only</div>

<!-- Responsive sizing -->
<div class="text-sm md:text-base p-3 md:p-4">
  Scales with screen size
</div>
```

### Component Checklist

When creating/updating components:
- [ ] Responsive padding (p-3 md:p-4)
- [ ] Responsive text (text-sm md:text-base)
- [ ] Touch targets 44px minimum
- [ ] No horizontal overflow
- [ ] Test on mobile simulator
- [ ] Verify desktop unchanged

---

## Questions & Decisions Needed

### Design Decisions

1. **Bottom nav labels:** Keep text labels or icon-only?
   - **Recommendation:** Keep labels for clarity (current design)

2. **Fixed submit buttons:** Always fixed or only on forms?
   - **Recommendation:** Game submit buttons fixed, settings buttons not

3. **Drawer vs Sheet:** UDrawer or custom bottom sheet?
   - **Recommendation:** UDrawer with `side="bottom"` for consistency

4. **Animation duration:** Keep current 200ms or slower for mobile?
   - **Recommendation:** Keep 200ms, feels responsive

5. **Safe area handling:** Padding or margin?
   - **Recommendation:** Padding (pb-safe) for cleaner implementation

### Technical Decisions

1. **Breakpoint detection:** useBreakpoints composable or CSS only?
   - **Current:** Using useBreakpoints (already in Navbar)
   - **Recommendation:** Continue, needed for conditional rendering

2. **Mobile-first or desktop-first Tailwind config?**
   - **Current:** Mobile-first (Tailwind default)
   - **Recommendation:** Keep mobile-first, add desktop with md:

3. **Component strategy:** Separate mobile/desktop or responsive single component?
   - **Recommendation:** Single responsive component with v-if for major differences

---

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Status:** Draft - Pending Implementation


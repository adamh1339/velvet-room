# Design

## Color

Strategy: Restrained — tinted near-black surfaces, one mode accent at ≤10% coverage.

Background: oklch(5% 0.008 265) — deep blue-black, not pure black
Surface: oklch(8% 0.008 265) — slightly lighter, card/input backgrounds
Border: oklch(14% 0.006 265) — hairline only, near-invisible
Muted text: oklch(40% 0.004 265)
Body text: oklch(78% 0.004 265)
Heading text: oklch(92% 0.002 265)

Mode accents (only one active at a time):
- P3 Blue: oklch(62% 0.18 245)
- P4 Yellow: oklch(80% 0.16 85)
- P5 Red: oklch(55% 0.22 22)
- REC Purple: oklch(58% 0.20 295)
- Fusion Teal: oklch(68% 0.14 185)

## Typography

Font: Geist Sans (already installed via next/font)
Mono: Geist Mono (for data, persona names, arcana labels)

Scale:
- xs: 10px / tracking 0.08em — eyebrow labels, timestamps
- sm: 13px / leading 1.6 — body, messages
- base: 15px / leading 1.5 — input, primary text
- lg: 18px / semi-bold — modal headings
- xl: 22px / semi-bold — page-level headings

## Motion

Easing: cubic-bezier(0.16, 1, 0.3, 1) — ease-out-expo for all transitions
Message enter: translateY(6px) + opacity 0 → 0 + opacity 1, 280ms
Modal enter: scale(0.96) + opacity 0 → scale(1) + opacity 1, 220ms
Color transitions (accent changes): 600ms
Typing dots: staggered 160ms bounce, 1.2s loop

prefers-reduced-motion: collapse all transforms to opacity-only, 150ms

## Components

### Message bubble — AI
Background: oklch(8% 0.008 265)
Left border: 1px solid [accent color] at 60% opacity
Text: body text color
Padding: 12px 16px
Radius: 12px, top-left 4px (asymmetric tail)
Max-width: 84%

### Message bubble — User
Background: oklch(12% 0.006 265)
Border: 1px solid oklch(18% 0.005 265)
Text: heading text color
Padding: 12px 16px
Radius: 12px, top-right 4px
Max-width: 78%
Alignment: right

### Input bar
Background: oklch(8% 0.008 265)
Border: 1px solid oklch(16% 0.006 265)
Focus border: oklch(16% 0.006 265) + 0 0 0 3px [accent]15
Radius: 20px
Padding: 10px 12px
Textarea: no border, transparent bg, caret color = accent

### Send button
Active: background = accent at full, text = background color
Inactive: background = oklch(12% 0.006 265), text = muted
Radius: 10px, size 36×36px

### New chat modal
Backdrop: oklch(0% 0 0 / 72%) with blur(12px)
Card: oklch(8% 0.008 265), border oklch(16% 0.006 265)
Radius: 24px
Game option hover: background tinted with mode accent at 10%

## Layout

Full-viewport height. Header fixed at top (48px). Input fixed at bottom (auto-height). Chat window fills remainder, scrollable.
Header contains only: new-chat button (left), nothing right.
Max content width in chat: 720px, centered.
Input max-width: 720px, centered.
Body padding: 20px horizontal on mobile, 32px on desktop.

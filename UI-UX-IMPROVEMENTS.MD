# UI/UX Improvements

## Project
AlcheMix Spellbook

---

## Goal

Redesign the UI while preserving all existing functionality.

The professor's primary feedback was:

> The interface feels too busy. Too many things are happening at once.

The redesign should focus on improving usability rather than adding more visual effects.

---

# Core Design Principles

- Less is more.
- Prioritize UX over decoration.
- One focal point per screen.
- Increase whitespace.
- Improve readability.
- Create a clear visual hierarchy.
- Reduce unnecessary animations.
- Every visual element should have a purpose.

---

# Theme

## Light Mode

Primary: #14B8A6
Secondary: #7C3AED
Background: #FFFFFF

## Dark Mode

Primary: #2DD4BF
Secondary: #A855F7
Background: #0B1220

Theme Toggle:
☀️ Sun
🌙 Moon

Persist the selected theme using localStorage.

# Theme Identity

The entire application should visually adapt to the selected theme.

## Dark Mode 🌙

The application should feel like studying ancient magic under the night sky.

Use moon-inspired symbolism throughout the interface.

Examples:
- Moon icon for theme toggle
- Crescent moon decorations
- Moon-themed empty states
- Night-inspired illustrations
- Cool teal and violet glow accents
- Deep, calm atmosphere

---

## Light Mode ☀️

The application should feel like practicing alchemy during daylight.

Use sun-inspired symbolism throughout the interface.

Examples:
- Sun icon for theme toggle
- Sun rays as subtle decorative elements
- Warm lighting
- Bright parchment backgrounds
- Golden highlights where appropriate
- Fresh and welcoming atmosphere

---

## Dynamic Theme Assets

The application should automatically swap decorative assets depending on the active theme.

Examples:

🌞 Light Mode
- Sun icons
- Sun illustrations
- Warm decorative accents
- Bright backgrounds

🌙 Dark Mode
- Moon icons
- Moon illustrations
- Night-themed accents
- Dark magical backgrounds

Avoid simply inverting colors. The theme should feel like two distinct moods of the same magical world.

Do not overuse decorative elements. Symbols should support the experience, not distract from it.
---

# What NOT to Change

- Business logic
- Firebase
- APIs
- Routing
- Game mechanics
- Database
- State management

---

# UX Priorities

1. Simplify navigation
2. Reduce visual clutter
3. Improve spacing
4. Improve consistency
5. Improve accessibility
6. Improve responsiveness

---

# Workflow

Before modifying anything:

1. Analyze the project.
2. Identify UI and UX issues.
3. Explain why each issue affects usability.
4. List the files that need modification.
5. Wait for approval before making changes.

Implement changes incrementally and verify that the project still builds after each stage.
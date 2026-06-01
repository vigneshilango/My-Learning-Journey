# Visible Abs Challenge (browser)

Open `index.html` in a browser. Progress saves on your device via `localStorage` (per profile).

## Files

| File | Purpose |
|------|---------|
| `index.html` | App UI, styles, and logic |
| `js/app-core.js` | Profiles, meal-week calendar, macro goals, cardio substitutions |
| `recipes.json` | Meal database (kitchen / grocery) |
| `workout-plans.json` | 6-phase workout templates |
| `exercise-tips.json` | Exercise coaching text for the ⓘ modal |
| `phases.json` | Challenge phase metadata (weeks, target weights) |

**Note:** JSON files must sit in the same folder as `index.html` (or `js/` for app-core).

## Profiles

- Create or switch profiles after unlocking the app.
- Each profile has its own weight logs, meals, workouts, and macro targets.
- Optional PIN per profile.
- **Cardio equipment** setting swaps Peloton wording for bike, treadmill, or outdoor alternatives.

## Kitchen & grocery weeks

- **Sunday** targets the **upcoming** Mon–Sun week for meal prep and the Shop tab.
- **Start Tomorrow** on the challenge tracker aligns Day 1 with Monday when prepping on Sunday.
- Weekly bulk prep is saved per week; daily menu and grocery list use that locked plan.

## Live site

**https://vigneshilango.github.io/My-Learning-Journey/**

Enable Pages if needed: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Archived Android build

The Capacitor APK experiment lives in `archive/app-build/` if you want it later.

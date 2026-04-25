# Design Consistency & Educational Color Audit

Date: 2026-04-25

## Scope checked
- Global tokens: `src/public/css/base.css`
- Shared components: `src/public/css/components.css`
- Landing page: `src/public/css/index.css`
- Main page-level styles under `src/public/css/pages/*.css`
- Stylesheet inclusion in `src/public/index.html` and `src/public/pages/**/*.html`

## Overall result
Your project already has a **strong foundation** for consistency with a centralized token system in `base.css` and clearly defined role colors (admin/teacher/student).

However, there are still a few places where page-specific CSS bypasses those tokens and introduces colors that are less consistent with the educational palette.

---

## What is consistent (good)

1. **Centralized design tokens are present**
   - `base.css` defines semantic tokens for surfaces, text, borders, status, and role colors.
   - Role mapping is clear and education-friendly:
     - Admin: gold
     - Teacher: sage green
     - Student: blue

2. **Most pages import `base.css` first**
   - Dashboard, tasks, vocab, auth, profile, admin, teacher pages all load `base.css`.
   - This is a good architecture for shared styling.

3. **Dark-mode strategy is coherent**
   - Uses both OS preference and manual `[data-theme]` override.

---

## Inconsistencies found

### 1) Landing page token split (`index.css`)
- `index.css` defines a separate `:root` palette (`--navy`, `--gold`, etc.) instead of consuming `base.css` tokens.
- `src/public/index.html` loads only `index.css`, not `base.css`.
- Result: landing page brand can drift from app pages over time.

### 2) Admin page uses independent accent colors
- `src/public/css/pages/admin.css` hardcodes indigo/teal accent colors (`#5b6ef5`, `#38bdf8`) in multiple places.
- This conflicts with the role color strategy in `base.css` where admin identity is gold.
- Result: visual identity mismatch between “admin role color” and “admin UI accents.”

### 3) Teacher badge color mismatch in shared components
- `src/public/css/components.css` sets `.badge--teacher` to info cyan (`--info`) rather than teacher role green (`--role-teacher`).
- Result: teacher semantics are inconsistent across pages/components.

### 4) Some pages still rely on hardcoded colors
- Notable examples:
  - `src/public/css/pages/forgot_pass.css`
  - `src/public/css/pages/profile.css`
  - `src/public/css/notification_panel.css`
- Result: repeated ad-hoc blues/greens/reds that may not match your intended educational palette.

---

## Educational color alignment assessment

### Current alignment: **Moderate to good (7/10)**
- ✅ Calm foundation (neutrals + blue/green + gold)
- ✅ Good semantic role intent
- ⚠️ Split accent systems (admin indigo/teal vs role-gold)
- ⚠️ Legacy hardcoded colors reduce coherence

### Recommended educational palette behavior
For educational UX, use:
- **Primary learning/action**: student blue
- **Guidance/mentorship/success**: teacher sage green
- **Authority/highlight**: admin gold
- **Feedback states**: amber/red/green semantic statuses

You already have these tokens in `base.css`; the main task is ensuring other files consume them consistently.

---

## Prioritized fixes

1. **High impact**: replace teacher cyan badge with teacher role token.
2. **High impact**: refactor admin accent hardcodes to use semantic admin tokens (or at least tokenized aliases).
3. **Medium impact**: migrate `forgot_pass.css`, `profile.css`, `notification_panel.css` hardcoded colors to tokens.
4. **Medium impact**: decide whether landing page should share core tokens (`base.css`) or remain intentionally brand-distinct.

---

## Suggested success criteria (for next pass)

- No hardcoded hex/rgb for brand/semantic colors in page CSS except deliberate gradients/art effects.
- Teacher/Admin/Student visuals always resolve from `--role-*` tokens.
- Landing page either:
  - imports `base.css` and reuses token aliases, or
  - is explicitly documented as a separate brand shell.

---

## Quick conclusion
Your system is close to being fully consistent. The architecture is good; now it needs a final token cleanup pass so every page reflects the same educational color language.

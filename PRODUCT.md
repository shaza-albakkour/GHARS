# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Arabic-speaking individuals (students, working people, people building habits; the case study's example user is a young woman named شذى) who carry many goals at once — study, work, Quran memorisation, languages, health — and lose track of how today's actions connect to those goals. They use Ghars daily, often on a phone, to see today's tasks, respond to alarms, and mark real completion. A separate Admin role manages users, global categories and public content.

## Product Purpose
A personal system — not a to-do list — that turns big goals into executable steps (yearly → monthly → weekly → daily tasks, plus standalone tasks), reminds with a persistent task alarm, keeps the full history of every task occurrence, and turns that history into honest progress percentages, streaks and charts. Success: the user can answer "what did I achieve, where am I, what remains, what is the next step?"

## Positioning
Completion is honest by construction: stopping or snoozing an alarm never counts as achievement — only "تم الإنجاز" does. Rest days, exceptions and period mode are never punished. Faith (prayer, fasting, Quran) and health live in the same system as study and work, with Hijri and Gregorian calendars side by side.

## Operating Context
Daily ritual: morning greeting by name, today's list, alarms at task times, ticking tasks done, end-of-day message. Weekly/monthly review through statistics and the goal tree. Arabic, right-to-left, Hijri + Gregorian dates.

## Capabilities and Constraints
- Two roles: Admin and User; per-user data isolation; passwords never stored in plain text.
- Sign-up: email + password + confirm, then name + age. Sign-in: email + password.
- Goals (levels, status, priority, dates, sub-goals); tasks (timed/untimed, daily/weekly/monthly/yearly/standalone, recurrence, priority, status set: لم تبدأ، قيد التنفيذ، مكتملة، متأخرة، مؤجلة، مستثناة، ملغاة).
- Task Alarm Reminder (time, tone, repeat, days, snooze) separate from normal notifications; alarm interaction is logged.
- Archive of every occurrence; progress bars + percentages; charts by day/week/month/year and by category; streaks; weight history chart.
- Worship section, period mode, health/food/weight, rest days and exceptions, categories, search & filter.
- Appearance: colours pink, purple, black, white, green, blue, maroon; light/dark mode.
- Current stack: static HTML/CSS/JS, multi-file (one file per section), data in browser localStorage. Flutter app and cloud sync are later phases. Browser alarm works only while a Ghars page is open.

## Brand Commitments
- Name: غَرْس (GHARS). Slogan: «من هدفٍ تزرعه، إلى إنجازٍ تحصده.»
- The user supplied a binding visual reference (ghars_website_project.zip → assets/ghars-hero-concept.png and its CSS): natural/organic feel, seedling at sunrise photograph, two-leaf logo with a gold sun dot, deep forest greens on cream. They asked for "almost like this, but more professional, precise and beautiful", applied to the whole site.
- Messages address the user by name and with correct Arabic gender agreement; tone is gentle and never punishing.

## Evidence on Hand
- Product case study (50 sections) from the user.
- Hero photograph: seedling at sunrise, cropped from the user's concept image (`assets/images/hero-seedling.jpg`).
- No testimonials, user counts, pricing, ratings or store listings exist — do not fabricate them.

## Product Principles
1. Honest progress: only real completion moves numbers.
2. Small daily steps visibly connect to the big goal.
3. Supportive, never punitive — rest and exceptions are part of the journey.
4. One place for the whole life: study, work, faith, health, habits.
5. Each file owns one section, so the owner can edit easily.

## Accessibility & Inclusion
Arabic RTL first; readable on phones; status never conveyed by colour alone; respects reduced motion.

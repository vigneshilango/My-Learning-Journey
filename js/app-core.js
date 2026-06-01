/* Visible Abs Challenge — profiles, meal weeks, cardio subs, macro goals */
(function (global) {
    'use strict';

    const GLOBAL_KEYS = new Set(['app_unlocked', 'profiles_meta']);

    const DEFAULT_SETTINGS = {
        startWeight: 250,
        goalWeight: 210,
        heightIn: 0,
        neckIn: 0,
        waistIn: 0,
        hipIn: 0,
        sex: 'male',
        macros: { calories: 2200, protein: 210, carbs: 180, fat: 70 },
        useProteinPerLbGoal: true,
        cardioEquipment: 'peloton'
    };

    const BARBELL_EXERCISE_SUBS = {
        'Bench Press': { label: 'DB Bench Press', tipKey: 'DB Bench Press' },
        'Rows': { label: 'DB Row', tipKey: 'DB Row' },
        'OHP': { label: 'DB Shoulder Press', tipKey: 'DB Shoulder Press' },
        'Squats': { label: 'Goblet Squat', tipKey: 'Goblet Squat' },
        'Deadlifts': { label: 'DB Romanian Deadlift', tipKey: 'DB Romanian Deadlift' }
    };

    const CARDIO_EXERCISE_SUBS = {
        generic_bike: {
            'Peloton Low Impact (30 min)': { label: 'Zone 2 Bike — Easy (30 min)', tipKey: 'Peloton Low Impact' },
            'Peloton Low Impact (20 min)': { label: 'Zone 2 Bike — Easy (20 min)', tipKey: 'Peloton Low Impact' },
            'Peloton Endurance (45 min)': { label: 'Zone 2 Bike — Endurance (45 min)', tipKey: 'Peloton Endurance' },
            'Peloton Endurance (20 min)': { label: 'Zone 2 Bike — Endurance (20 min)', tipKey: 'Peloton Endurance' },
            'Peloton Power Zone (35 min)': { label: 'Tempo Bike Intervals (35 min)', tipKey: 'Peloton Power Zone' },
            'Peloton Power Zone (25 min)': { label: 'Tempo Bike Intervals (25 min)', tipKey: 'Peloton Power Zone' },
            'Peloton Power Zone (20 min)': { label: 'Tempo Bike Intervals (20 min)', tipKey: 'Peloton Power Zone' },
            'Peloton HIIT (30 min)': { label: 'Bike HIIT Intervals (30 min)', tipKey: 'Peloton HIIT' },
            'Peloton HIIT (20 min)': { label: 'Bike HIIT Intervals (20 min)', tipKey: 'Peloton HIIT' }
        },
        treadmill: {
            'Peloton Low Impact (30 min)': { label: 'Incline Walk — Easy (30 min)', tipKey: 'Peloton Low Impact' },
            'Peloton Low Impact (20 min)': { label: 'Incline Walk — Easy (20 min)', tipKey: 'Peloton Low Impact' },
            'Peloton Endurance (45 min)': { label: 'Zone 2 Treadmill (45 min)', tipKey: 'Peloton Endurance' },
            'Peloton Endurance (20 min)': { label: 'Zone 2 Treadmill (20 min)', tipKey: 'Peloton Endurance' },
            'Peloton Power Zone (35 min)': { label: 'Tempo Run/Walk Intervals (35 min)', tipKey: 'Peloton Power Zone' },
            'Peloton Power Zone (25 min)': { label: 'Tempo Run/Walk Intervals (25 min)', tipKey: 'Peloton Power Zone' },
            'Peloton Power Zone (20 min)': { label: 'Tempo Run/Walk Intervals (20 min)', tipKey: 'Peloton Power Zone' },
            'Peloton HIIT (30 min)': { label: 'Treadmill HIIT (30 min)', tipKey: 'Peloton HIIT' },
            'Peloton HIIT (20 min)': { label: 'Treadmill HIIT (20 min)', tipKey: 'Peloton HIIT' }
        },
        outdoor: {
            'Peloton Low Impact (30 min)': { label: 'Brisk Walk (30 min)', tipKey: 'Peloton Low Impact' },
            'Peloton Low Impact (20 min)': { label: 'Brisk Walk (20 min)', tipKey: 'Peloton Low Impact' },
            'Peloton Endurance (45 min)': { label: 'Zone 2 Walk/Jog (45 min)', tipKey: 'Peloton Endurance' },
            'Peloton Endurance (20 min)': { label: 'Zone 2 Walk/Jog (20 min)', tipKey: 'Peloton Endurance' },
            'Peloton Power Zone (35 min)': { label: 'Run/Walk Intervals (35 min)', tipKey: 'Peloton Power Zone' },
            'Peloton Power Zone (25 min)': { label: 'Run/Walk Intervals (25 min)', tipKey: 'Peloton Power Zone' },
            'Peloton Power Zone (20 min)': { label: 'Run/Walk Intervals (20 min)', tipKey: 'Peloton Power Zone' },
            'Peloton HIIT (30 min)': { label: 'Sprint Intervals (30 min)', tipKey: 'Peloton HIIT' },
            'Peloton HIIT (20 min)': { label: 'Sprint Intervals (20 min)', tipKey: 'Peloton HIIT' }
        }
    };

    const CARDIO_WORKOUT_NAME_SUBS = {
        generic_bike: {
            'Peloton: Low Impact Ride': 'Zone 2 Bike — Low Impact',
            'Peloton: Endurance Ride': 'Zone 2 Bike — Endurance',
            'Peloton: Power Zone Ride': 'Tempo Bike Intervals',
            'Peloton: HIIT Ride': 'Bike HIIT',
            'Peloton + Core': 'Easy Bike + Core',
            'Peloton + Heavy Core': 'Tempo Bike + Heavy Core',
            'Peloton + Max Core': 'Endurance Bike + Max Core'
        },
        treadmill: {
            'Peloton: Low Impact Ride': 'Incline Walk — Easy',
            'Peloton: Endurance Ride': 'Zone 2 Treadmill',
            'Peloton: Power Zone Ride': 'Tempo Run/Walk',
            'Peloton: HIIT Ride': 'Treadmill HIIT',
            'Peloton + Core': 'Easy Walk + Core',
            'Peloton + Heavy Core': 'Tempo Treadmill + Heavy Core',
            'Peloton + Max Core': 'Endurance Treadmill + Max Core'
        },
        outdoor: {
            'Peloton: Low Impact Ride': 'Brisk Walk',
            'Peloton: Endurance Ride': 'Zone 2 Walk/Jog',
            'Peloton: Power Zone Ride': 'Run/Walk Intervals',
            'Peloton: HIIT Ride': 'Sprint Intervals',
            'Peloton + Core': 'Easy Walk + Core',
            'Peloton + Heavy Core': 'Run/Walk + Heavy Core',
            'Peloton + Max Core': 'Endurance Cardio + Max Core'
        }
    };

    function getProfilesMeta() {
        try {
            return JSON.parse(localStorage.getItem('profiles_meta') || 'null');
        } catch (e) {
            return null;
        }
    }

    function saveProfilesMeta(meta) {
        localStorage.setItem('profiles_meta', JSON.stringify(meta));
    }

    function getActiveProfileId() {
        const meta = getProfilesMeta();
        return meta && meta.activeProfileId ? meta.activeProfileId : null;
    }

    function getActiveProfile() {
        const meta = getProfilesMeta();
        if (!meta || !meta.activeProfileId) return null;
        return meta.profiles.find(p => p.id === meta.activeProfileId) || null;
    }

    function profileKey(key) {
        if (GLOBAL_KEYS.has(key)) return key;
        const id = getActiveProfileId();
        if (!id) return key;
        return `profile_${id}_${key}`;
    }

    function pGet(key) {
        return localStorage.getItem(profileKey(key));
    }

    function pSet(key, val) {
        localStorage.setItem(profileKey(key), val);
    }

    function pRemove(key) {
        localStorage.removeItem(profileKey(key));
    }

    function defaultProfile(name) {
        return {
            id: crypto.randomUUID(),
            name: name || 'Default',
            pinHash: '',
            createdAt: new Date().toISOString(),
            profileSetupComplete: false,
            settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
            foodPrefs: {
                enabledDefaultCategories: ['preworkout', 'postworkout', 'breakfast', 'mains', 'snacks'],
                disabledRecipeNames: []
            }
        };
    }

    function needsProfileSetup() {
        const p = getActiveProfile();
        return !p || p.profileSetupComplete !== true;
    }

    function migrateToProfiles() {
        if (localStorage.getItem('profiles_meta')) return;
        const profile = defaultProfile('Default');
        profile.profileSetupComplete = true;
        const skip = new Set(['app_unlocked', 'profiles_meta']);
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && !skip.has(k) && !k.startsWith('profile_')) keys.push(k);
        }
        keys.forEach(k => {
            localStorage.setItem(`profile_${profile.id}_${k}`, localStorage.getItem(k));
            localStorage.removeItem(k);
        });
        saveProfilesMeta({ version: 1, activeProfileId: profile.id, profiles: [profile] });
    }

    async function hashPin(pin) {
        if (!pin) return '';
        const encoder = new TextEncoder();
        const buf = await crypto.subtle.digest('SHA-256', encoder.encode('vac:' + pin));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function setActiveProfile(id) {
        const meta = getProfilesMeta();
        if (!meta) return;
        meta.activeProfileId = id;
        saveProfilesMeta(meta);
    }

    function formatWeight(w) {
        const n = parseFloat(w);
        if (isNaN(n)) return '—';
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }

    function scalePhaseWeight(defaultWeight, startWeight, goalWeight) {
        const defaultRange = DEFAULT_SETTINGS.startWeight - DEFAULT_SETTINGS.goalWeight;
        if (defaultRange <= 0) return defaultWeight;
        const ratio = (defaultWeight - DEFAULT_SETTINGS.goalWeight) / defaultRange;
        return Math.round((goalWeight + ratio * (startWeight - goalWeight)) * 10) / 10;
    }

    function getScaledPhases(phases) {
        const g = getMacroGoals();
        if (!phases || !phases.length) return [];
        return phases.map(p => {
            const weight = scalePhaseWeight(p.weight, g.startWeight, g.goalWeight);
            return {
                ...p,
                weight,
                label: '~' + Math.round(weight)
            };
        });
    }

    function getPhaseTargetWeights(phases) {
        const scaled = getScaledPhases(phases);
        const g = getMacroGoals();
        return scaled.map(p => p.weight).concat(g.goalWeight);
    }

    function getMacroGoals() {
        const p = getActiveProfile();
        const s = p && p.settings ? p.settings : DEFAULT_SETTINGS;
        const protein = s.useProteinPerLbGoal ? (s.goalWeight || 210) : (s.macros.protein || 210);
        return {
            calories: s.macros.calories || 2200,
            protein: protein,
            carbs: s.macros.carbs || 180,
            fat: s.macros.fat || 70,
            goalWeight: s.goalWeight || 210,
            startWeight: s.startWeight || 250
        };
    }

    const PHASE_OPTION_NAMES = ['Foundation', 'Build', 'Walk/Run Intro', 'Run/Walk', 'Running', 'Peak · 5K'];

    function getCardioEquipment() {
        const p = getActiveProfile();
        return (p && p.settings && p.settings.cardioEquipment) || 'peloton';
    }

    function getProfileSex() {
        const p = getActiveProfile();
        const sex = p && p.settings && p.settings.sex;
        return sex === 'female' ? 'female' : 'male';
    }

    function getExerciseBase(exerciseStr) {
        if (!exerciseStr) return '';
        const paren = exerciseStr.indexOf('(');
        return paren >= 0 ? exerciseStr.slice(0, paren).trim() : exerciseStr.trim();
    }

    function hasBarbellSub(base) {
        return !!(base && BARBELL_EXERCISE_SUBS[base]);
    }

    function isExerciseDumbbellMode(base) {
        return base && pGet('equip_' + base) === 'dumbbell';
    }

    function toggleExerciseEquipment(base) {
        if (!base) return;
        const key = 'equip_' + base;
        if (pGet(key) === 'dumbbell') pRemove(key);
        else pSet(key, 'dumbbell');
        if (typeof renderWorkoutDay === 'function') renderWorkoutDay();
    }

    function getRecommendedRest(exerciseLabel) {
        const name = (exerciseLabel || '').split('(')[0].trim().toLowerCase();
        if (!name) return 60;
        if (/peloton|cardio|ride|walk|run|jog|sprint|cooldown|stretch|warmup|volleyball|hydration|meal prep|complete rest|band shoulder warm|mobility|dynamic warmup|incline walk|zone 2|hiit|steady cardio|bike or treadmill/.test(name)) return 0;
        if (/plank|wall sit|crunch|abs|core|sit-up|leg raise|ab wheel|weighted crunch|decline sit/.test(name)) return 45;
        if (/bench|squat|deadlift|ohp|row|pull-up|dip|lat pull/.test(name) && !/face|calf|band|curl|leg ext|leg curl|tke|lateral band|warm/.test(name)) return 180;
        if (/leg press|incline db|step-up|rdl|goblet/.test(name)) return 120;
        return 75;
    }

    function parseTimedExercise(exerciseStr) {
        if (!exerciseStr) return null;
        const name = getExerciseBase(exerciseStr).toLowerCase();
        const withUnit = exerciseStr.match(/\((\d+)x(\d+)\s*(s|sec|seconds|m|min|minutes)\)/i);
        if (withUnit) {
            const sets = parseInt(withUnit[1], 10);
            let secs = parseInt(withUnit[2], 10);
            const unit = withUnit[3].toLowerCase();
            if (unit.startsWith('m')) secs *= 60;
            return { sets, holdSeconds: secs };
        }
        if (/plank|wall sit|hold|dead hang/.test(name)) {
            const bare = exerciseStr.match(/\((\d+)x(\d+)\)/i);
            if (bare) {
                return { sets: parseInt(bare[1], 10), holdSeconds: parseInt(bare[2], 10) };
            }
        }
        return null;
    }

    function parseRepScheme(exerciseStr) {
        if (!exerciseStr || parseTimedExercise(exerciseStr)) return null;
        const m = exerciseStr.match(/\((\d+)x(\d+)\)/i);
        if (!m) return null;
        return { sets: parseInt(m[1], 10), reps: parseInt(m[2], 10) };
    }

    function resolveCardioExercise(exerciseStr) {
        const eq = getCardioEquipment();
        if (eq === 'peloton' || !exerciseStr) {
            return { label: exerciseStr, tipKey: exerciseStr.split('(')[0].trim() };
        }
        const sub = CARDIO_EXERCISE_SUBS[eq] && CARDIO_EXERCISE_SUBS[eq][exerciseStr];
        if (sub) return sub;
        return { label: exerciseStr, tipKey: exerciseStr.split('(')[0].trim() };
    }

    function resolveStrengthExercise(exerciseStr) {
        if (!exerciseStr) return { label: exerciseStr, tipKey: '', base: '' };
        const base = getExerciseBase(exerciseStr);
        const paren = exerciseStr.indexOf('(');
        const suffix = paren >= 0 ? exerciseStr.slice(paren) : '';
        if (!isExerciseDumbbellMode(base)) {
            return { label: exerciseStr, tipKey: base, base };
        }
        const sub = BARBELL_EXERCISE_SUBS[base];
        if (sub) return { label: sub.label + suffix, tipKey: sub.tipKey, base };
        return { label: exerciseStr, tipKey: base, base };
    }

    function resolveExercise(exerciseStr) {
        const cardio = resolveCardioExercise(exerciseStr);
        return resolveStrengthExercise(cardio.label);
    }

    function resolveWorkoutDay(dayData) {
        if (!dayData) return dayData;
        const eq = getCardioEquipment();
        const nameMap = CARDIO_WORKOUT_NAME_SUBS[eq] || {};
        const copy = Object.assign({}, dayData);
        if (eq !== 'peloton' && copy.name && nameMap[copy.name]) copy.name = nameMap[copy.name];
        return copy;
    }

    function syncBodyMetricsToWorkoutInputs(settings) {
        settings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
        const heightEl = document.getElementById('currentHeight');
        const neckEl = document.getElementById('currentNeck');
        const waistEl = document.getElementById('currentWaist');
        const hipEl = document.getElementById('currentHip');
        if (settings.heightIn > 0) {
            if (heightEl) heightEl.value = settings.heightIn;
            pSet('bf_height', String(settings.heightIn));
        }
        if (settings.neckIn > 0) {
            if (neckEl) neckEl.value = settings.neckIn;
            pSet('bf_neck', String(settings.neckIn));
        }
        if (settings.waistIn > 0) {
            if (waistEl) waistEl.value = settings.waistIn;
            pSet('currentWaist', String(settings.waistIn));
        }
        if (settings.hipIn > 0) {
            if (hipEl) hipEl.value = settings.hipIn;
            pSet('bf_hip', String(settings.hipIn));
        }
        updateHipFieldVisibility();
        if (typeof updateBF === 'function') updateBF();
    }

    function updateHipFieldVisibility() {
        const row = document.getElementById('hipInputRow');
        if (row) row.style.display = getProfileSex() === 'female' ? 'flex' : 'none';
        updateMeasureHints();
    }

    function toggleProfileHipRow(prefix) {
        const sexEl = document.getElementById(prefix + 'Sex');
        const row = document.getElementById(prefix + 'HipRow');
        if (row && sexEl) row.style.display = sexEl.value === 'female' ? 'block' : 'none';
    }

    function toDateStr(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function parseDateStr(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function addDays(d, n) {
        const x = new Date(d);
        x.setDate(x.getDate() + n);
        return x;
    }

    function getMealWeekKey(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return toDateStr(d);
    }

    function getActiveMealWeekKey() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startStr = pGet('challenge_start');
        if (startStr) {
            const start = parseDateStr(startStr);
            start.setHours(0, 0, 0, 0);
            if (today < start) return getMealWeekKey(start);
        }
        if (today.getDay() === 0) return getMealWeekKey(addDays(today, 1));
        return getMealWeekKey(today);
    }

    function formatMealWeekRange(weekKey) {
        const mon = parseDateStr(weekKey);
        const sun = addDays(mon, 6);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `Mon ${fmt(mon)} – Sun ${fmt(sun)}`;
    }

    function getCalendarWeekKey(date) {
        return getMealWeekKey(date || new Date());
    }

    function getPlanningWeekKey() {
        return getActiveMealWeekKey();
    }

    function listSavedMealWeekKeys() {
        const id = getActiveProfileId();
        const prefix = id ? `profile_${id}_weekly_prep_` : 'weekly_prep_';
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
        }
        return keys.sort();
    }

    function buildMealWeekOptions() {
        const set = new Set(listSavedMealWeekKeys());
        set.add(getCalendarWeekKey());
        set.add(getPlanningWeekKey());
        return [...set].sort().reverse();
    }

    function loadWeeklyPrepForKey(weekKey) {
        const raw = pGet('weekly_prep_' + weekKey);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    function saveWeeklyPrepForKey(weekKey, prep) {
        pSet('weekly_prep_' + weekKey, JSON.stringify(prep));
    }

    function loadWeeklyPrep() {
        return loadWeeklyPrepForKey(getActiveMealWeekKey());
    }

    function saveWeeklyPrep(prep) {
        saveWeeklyPrepForKey(getActiveMealWeekKey(), prep);
    }

    function isWeekFrozen(weekKey) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = parseDateStr(weekKey);
        const calStart = parseDateStr(getCalendarWeekKey(today));
        if (weekStart < calStart) return true;
        if (today.getDay() === 0 && weekKey === getCalendarWeekKey(today)) return true;
        return false;
    }

    function canShuffleWeeklyPrep(weekKey) {
        if (!weekKey || isWeekFrozen(weekKey)) return false;
        const today = new Date();
        const planningKey = getPlanningWeekKey();
        if (today.getDay() === 0) return weekKey === planningKey;
        const calKey = getCalendarWeekKey(today);
        if (weekKey !== calKey) return false;
        const existing = loadWeeklyPrepForKey(weekKey);
        return !(existing && existing.mains && existing.mains.length);
    }

    function canDailyShuffle(weekKey) {
        if (!weekKey || weekKey !== getCalendarWeekKey()) return false;
        const prep = loadWeeklyPrepForKey(weekKey);
        return !!(prep && prep.mains && prep.mains.length);
    }

    function getWeekStatusLabel(weekKey) {
        if (isWeekFrozen(weekKey)) return 'Locked';
        if (weekKey === getPlanningWeekKey() && new Date().getDay() === 0) return 'Plan on Sunday';
        if (weekKey === getCalendarWeekKey()) return 'Current week';
        if (weekKey === getPlanningWeekKey()) return 'Upcoming';
        return 'Saved';
    }

    function syncLoggedWeightToProfile() {
        const g = getMacroGoals();
        const weightInput = document.getElementById('currentWeight');
        if (!weightInput) return;
        const stored = parseFloat(pGet('currentWeight'));
        const defaultStart = DEFAULT_SETTINGS.startWeight;
        if (!isNaN(stored)) {
            if (Math.abs(stored - defaultStart) < 0.05 && Math.abs(g.startWeight - defaultStart) > 0.05) {
                pSet('currentWeight', g.startWeight);
                weightInput.value = g.startWeight;
                return;
            }
            weightInput.value = stored;
            return;
        }
        weightInput.value = g.startWeight;
    }

    function renderMacroDisplay() {
        const g = getMacroGoals();
        const calEl = document.querySelector('#nutrition .rep-range');
        if (calEl) calEl.textContent = `~${g.calories} Cal/Day`;
        const macroCard = document.querySelector('#nutrition .stats-card');
        if (macroCard) {
            const sub = document.getElementById('nutritionMacroSubtitle') || macroCard.querySelector('div[style*="Aggressive"]') || macroCard.querySelector('div[style*="color:var(--dim)"]');
            if (sub) sub.textContent = `Macronutrients (Cut to ${formatWeight(g.goalWeight)} lbs)`;
            const vals = macroCard.querySelectorAll('.macro-value');
            if (vals.length >= 3) {
                vals[0].textContent = g.protein + 'g';
                vals[1].textContent = g.carbs + 'g';
                vals[2].textContent = g.fat + 'g';
            }
        }
        ['trackCal', 'trackPro', 'trackCarb', 'trackFat'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (!el || !el.parentElement) return;
            const goals = [g.calories, g.protein + 'g', g.carbs + 'g', g.fat + 'g'];
            const suffix = el.parentElement.querySelector('span[style*="dim"]');
            if (suffix) suffix.textContent = '/ ' + goals[i];
        });
        const goalRange = `${formatWeight(g.startWeight)} → ${formatWeight(g.goalWeight)} lbs | Goal: Visible Abs`;
        const headerP = document.getElementById('workoutHeaderGoal') || document.querySelector('#workout .app-header p');
        if (headerP) headerP.textContent = goalRange;

        const guideGoal = document.getElementById('guideProtocolGoal');
        if (guideGoal) guideGoal.textContent = `${formatWeight(g.startWeight)} lbs → ${formatWeight(g.goalWeight)} lbs`;

        const guidePro = document.getElementById('guideProtocolProtein');
        if (guidePro) guidePro.textContent = `Hit ${g.protein}g protein.`;

        const trendLegend = document.getElementById('trendGoalLegend');
        if (trendLegend) trendLegend.textContent = `Goal ${formatWeight(g.goalWeight)}`;

        const phases = global.PHASES || [];
        const sel = document.getElementById('weekSelect');
        if (sel && phases.length) {
            const prev = sel.value;
            const scaled = getScaledPhases(phases);
            sel.innerHTML = scaled.map((p, i) =>
                `<option value="${p.key}">Phase ${p.num} · Wks ${p.wks} · ${PHASE_OPTION_NAMES[i] || ''} (${p.label} lbs)</option>`
            ).join('');
            if (prev && scaled.some(p => p.key === prev)) sel.value = prev;
        }
    }

    function getWaistMeasureHint() {
        return getProfileSex() === 'female'
            ? 'At your natural narrowest point (usually above the belly button) — tape horizontal, relaxed.'
            : 'At belly button (navel) level — tape horizontal around your abdomen, relaxed (don\'t suck in).';
    }

    function updateMeasureHints() {
        const waistHint = document.getElementById('waistMeasureHint');
        const checkinWaistHint = document.getElementById('checkinWaistHint');
        const hintText = getWaistMeasureHint();
        if (waistHint) waistHint.textContent = hintText;
        if (checkinWaistHint) checkinWaistHint.textContent = hintText;
        const hipRow = document.getElementById('hipMeasureHintRow');
        if (hipRow) hipRow.style.display = getProfileSex() === 'female' ? 'list-item' : 'none';
    }

    function bodyMeasureGuideHtml() {
        return `<details class="measure-guide" style="margin-bottom:14px;">
            <summary>How to measure (Navy body-fat method)</summary>
            <ul>
                <li><strong>Neck:</strong> Just below the Adam's apple — tape sloped slightly down in front. Don't flex.</li>
                <li><strong>Waist (male):</strong> At belly button (navel) — horizontal tape, relaxed abdomen.</li>
                <li><strong>Waist (female):</strong> At natural narrowest point — usually above the navel.</li>
                <li><strong>Hip (female):</strong> Widest part of hips/buttocks — tape parallel to the floor.</li>
                <li><strong>Height:</strong> Barefoot, stand straight — measure in inches.</li>
            </ul>
        </details>`;
    }

    function profileFormFields(s, prefix) {
        const p = prefix || 'prof';
        return `
            <label class="checkin-modal-label">Display name</label>
            <input type="text" id="${p}Name" class="checkin-input" value="${(s.name || '').replace(/"/g, '&quot;')}">
            <label class="checkin-modal-label">Start weight (lbs) <span style="color:var(--danger);">*</span></label>
            <input type="number" step="0.1" id="${p}StartWt" class="checkin-input" value="${s.startWeight || ''}" placeholder="e.g. 244.4">
            <label class="checkin-modal-label">Goal weight (lbs) <span style="color:var(--danger);">*</span></label>
            <input type="number" step="0.1" id="${p}GoalWt" class="checkin-input" value="${s.goalWeight || ''}" placeholder="e.g. 210">
            <p style="color:var(--dim); font-size:0.78rem; margin:8px 0 10px;">Body measurements for body-fat tracking (optional — update anytime on the Workout tab).</p>
            ${bodyMeasureGuideHtml()}
            <label class="checkin-modal-label">Neck (inches)</label>
            <p class="measure-hint">Just below the Adam's apple — tape horizontal, don't flex your neck.</p>
            <input type="number" step="0.1" id="${p}Neck" class="checkin-input" value="${s.neckIn || ''}" placeholder="e.g. 15">
            <label class="checkin-modal-label">Waist (inches)</label>
            <p class="measure-hint">Male: at navel (belly button). Female: narrowest waist above navel. Stay consistent each week.</p>
            <input type="number" step="0.1" id="${p}Waist" class="checkin-input" value="${s.waistIn || ''}" placeholder="e.g. 38">
            <label class="checkin-modal-label">Height (inches)</label>
            <p class="measure-hint">Barefoot, stand straight against a wall — measure in inches.</p>
            <input type="number" step="0.1" id="${p}Height" class="checkin-input" value="${s.heightIn || ''}" placeholder="e.g. 72">
            <label class="checkin-modal-label">Sex (for body-fat formula)</label>
            <select id="${p}Sex" class="checkin-input" onchange="toggleProfileHipRow('${p}'); updateMeasureHints();">
                <option value="male" ${s.sex !== 'female' ? 'selected' : ''}>Male</option>
                <option value="female" ${s.sex === 'female' ? 'selected' : ''}>Female</option>
            </select>
            <div id="${p}HipRow" style="display:${s.sex === 'female' ? 'block' : 'none'};">
                <label class="checkin-modal-label">Hip (inches, female BF)</label>
                <p class="measure-hint">Widest part of hips/buttocks — tape parallel to the floor.</p>
                <input type="number" step="0.1" id="${p}Hip" class="checkin-input" value="${s.hipIn || ''}" placeholder="e.g. 40">
            </div>
            <div class="cf-grid" style="margin-top:10px;">
                <div><label class="checkin-modal-label">Calories</label><input type="number" id="${p}Cal" class="checkin-input" value="${s.macros.calories}"></div>
                <div><label class="checkin-modal-label">Protein (g)</label><input type="number" id="${p}Pro" class="checkin-input" value="${s.macros.protein}"></div>
                <div><label class="checkin-modal-label">Carbs (g)</label><input type="number" id="${p}Carb" class="checkin-input" value="${s.macros.carbs}"></div>
                <div><label class="checkin-modal-label">Fat (g)</label><input type="number" id="${p}Fat" class="checkin-input" value="${s.macros.fat}"></div>
            </div>
            <label style="display:flex;align-items:center;gap:8px;margin:12px 0;font-size:0.88rem;">
                <input type="checkbox" id="${p}ProPerLb" ${s.useProteinPerLbGoal ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);">
                Auto protein = 1g per lb goal weight
            </label>
            <label class="checkin-modal-label">Cardio equipment</label>
            <select id="${p}Cardio" class="checkin-input">
                <option value="peloton" ${s.cardioEquipment === 'peloton' ? 'selected' : ''}>Peloton / spin bike app</option>
                <option value="generic_bike" ${s.cardioEquipment === 'generic_bike' ? 'selected' : ''}>Stationary bike (no Peloton)</option>
                <option value="treadmill" ${s.cardioEquipment === 'treadmill' ? 'selected' : ''}>Treadmill</option>
                <option value="outdoor" ${s.cardioEquipment === 'outdoor' ? 'selected' : ''}>Outdoor walk / run</option>
            </select>`;
    }

    function renderProfileSettings() {
        const el = document.getElementById('profileSettingsBody');
        if (!el) return;
        const p = getActiveProfile();
        if (!p) { el.innerHTML = '<p style="color:var(--dim);">No active profile.</p>'; return; }
        const s = Object.assign({}, DEFAULT_SETTINGS, p.settings, { name: p.name, macros: Object.assign({}, DEFAULT_SETTINGS.macros, p.settings.macros) });
        el.innerHTML = profileFormFields(s, 'prof') + `
            <button class="action-btn btn-primary" style="margin-top:12px;" onclick="saveProfileSettings()">💾 Save Profile</button>
            <button class="action-btn btn-outline" style="margin-top:8px;" onclick="showProfileGate()">👤 Switch Profile</button>`;
        toggleProfileHipRow('prof');
    }

    function renderProfileSheetForm() {
        const el = document.getElementById('profileSheetBody');
        if (!el) return;
        const p = getActiveProfile();
        if (!p) { el.innerHTML = '<p style="color:var(--dim);">No active profile.</p>'; return; }
        const s = Object.assign({}, DEFAULT_SETTINGS, p.settings, { name: p.name, macros: Object.assign({}, DEFAULT_SETTINGS.macros, p.settings.macros) });
        el.innerHTML = profileFormFields(s, 'sheet') + `
            <button class="action-btn btn-primary" style="margin-top:12px;" onclick="saveProfileSheet()">💾 Save Profile</button>
            <button class="action-btn btn-outline" style="margin-top:8px;" onclick="showProfileGate(); closeProfileSheet();">👤 Switch Profile</button>`;
        toggleProfileHipRow('sheet');
    }

    function applyProfileFields(meta, p, prefix, opts) {
        opts = opts || {};
        const nameEl = document.getElementById(prefix + 'Name');
        const startEl = document.getElementById(prefix + 'StartWt');
        const goalEl = document.getElementById(prefix + 'GoalWt');
        if (!startEl || !goalEl) return false;

        const startVal = parseFloat(startEl.value);
        const goalVal = parseFloat(goalEl.value);
        if (isNaN(startVal) || startVal <= 0 || isNaN(goalVal) || goalVal <= 0) {
            if (opts.requireWeights) {
                alert('Please enter valid start and goal weights.');
                return false;
            }
        }
        if (nameEl) p.name = nameEl.value.trim() || p.name;
        const oldStart = p.settings.startWeight || DEFAULT_SETTINGS.startWeight;
        if (!isNaN(goalVal) && goalVal > 0) p.settings.goalWeight = goalVal;
        if (!isNaN(startVal) && startVal > 0) p.settings.startWeight = startVal;
        if (!isNaN(startVal) && startVal > 0 && startVal !== oldStart) {
            const stored = parseFloat(pGet('currentWeight'));
            const weightInput = document.getElementById('currentWeight');
            const inputEmpty = weightInput && !weightInput.value;
            const storedMatchesOldStart = !isNaN(stored) && Math.abs(stored - oldStart) < 0.05;
            const storedIsDefault = !isNaN(stored) && Math.abs(stored - DEFAULT_SETTINGS.startWeight) < 0.05;
            if (inputEmpty || isNaN(stored) || storedMatchesOldStart || (storedIsDefault && oldStart === DEFAULT_SETTINGS.startWeight)) {
                pSet('currentWeight', startVal);
                if (weightInput) weightInput.value = startVal;
            }
        }
        const heightEl = document.getElementById(prefix + 'Height');
        const neckEl = document.getElementById(prefix + 'Neck');
        const waistEl = document.getElementById(prefix + 'Waist');
        const hipEl = document.getElementById(prefix + 'Hip');
        const sexEl = document.getElementById(prefix + 'Sex');
        if (heightEl && heightEl.value) p.settings.heightIn = parseFloat(heightEl.value) || 0;
        if (neckEl && neckEl.value) p.settings.neckIn = parseFloat(neckEl.value) || 0;
        if (waistEl && waistEl.value) p.settings.waistIn = parseFloat(waistEl.value) || 0;
        if (hipEl && hipEl.value) p.settings.hipIn = parseFloat(hipEl.value) || 0;
        if (sexEl) p.settings.sex = sexEl.value === 'female' ? 'female' : 'male';
        syncBodyMetricsToWorkoutInputs(p.settings);
        p.settings.macros.calories = parseInt(document.getElementById(prefix + 'Cal').value, 10) || 2200;
        p.settings.macros.protein = parseInt(document.getElementById(prefix + 'Pro').value, 10) || 210;
        p.settings.macros.carbs = parseInt(document.getElementById(prefix + 'Carb').value, 10) || 180;
        p.settings.macros.fat = parseInt(document.getElementById(prefix + 'Fat').value, 10) || 70;
        p.settings.useProteinPerLbGoal = document.getElementById(prefix + 'ProPerLb').checked;
        p.settings.cardioEquipment = document.getElementById(prefix + 'Cardio').value;
        if (opts.markComplete) p.profileSetupComplete = true;
        saveProfilesMeta(meta);
        return true;
    }

    function refreshAfterProfileSave(message) {
        renderMacroDisplay();
        renderProfileSettings();
        renderProfileSheetForm();
        if (typeof renderWorkoutDay === 'function') renderWorkoutDay();
        if (typeof updateTracking === 'function') updateTracking();
        if (typeof updateProgress === 'function') updateProgress();
        if (typeof renderPhaseProgress === 'function') renderPhaseProgress();
        if (typeof renderTrendChart === 'function') renderTrendChart();
        if (typeof updateDeficitCard === 'function') updateDeficitCard();
        if (typeof updateBF === 'function') updateBF();
        updateHipFieldVisibility();
        if (message) alert(message);
    }

    function saveProfileSettings() {
        const meta = getProfilesMeta();
        if (!meta || !meta.activeProfileId) return;
        const p = meta.profiles.find(pr => pr.id === meta.activeProfileId);
        if (!p) return;
        if (!p.settings) p.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        if (!p.settings.macros) p.settings.macros = { ...DEFAULT_SETTINGS.macros };
        if (!applyProfileFields(meta, p, 'prof', {})) return;
        refreshAfterProfileSave('Profile saved.');
    }

    function saveProfileSheet() {
        const meta = getProfilesMeta();
        if (!meta || !meta.activeProfileId) return;
        const p = meta.profiles.find(pr => pr.id === meta.activeProfileId);
        if (!p) return;
        if (!p.settings) p.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        if (!p.settings.macros) p.settings.macros = { ...DEFAULT_SETTINGS.macros };
        if (!applyProfileFields(meta, p, 'sheet', {})) return;
        refreshAfterProfileSave('Profile saved.');
        closeProfileSheet();
    }

    function saveProfileSetup() {
        const meta = getProfilesMeta();
        if (!meta || !meta.activeProfileId) return;
        const p = meta.profiles.find(pr => pr.id === meta.activeProfileId);
        if (!p) return;
        if (!p.settings) p.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        if (!p.settings.macros) p.settings.macros = { ...DEFAULT_SETTINGS.macros };
        if (!applyProfileFields(meta, p, 'setup', { requireWeights: true, markComplete: true })) return;
        hideProfileSetupModal();
        if (!window._appInited && typeof init === 'function') {
            init();
            window._appInited = true;
        } else {
            refreshAfterProfileSave(null);
        }
    }

    function showProfileSetupModal() {
        const p = getActiveProfile();
        const s = p ? Object.assign({}, DEFAULT_SETTINGS, p.settings, { name: p.name, macros: Object.assign({}, DEFAULT_SETTINGS.macros, (p.settings && p.settings.macros) || {}) }) : DEFAULT_SETTINGS;
        const body = document.getElementById('profileSetupBody');
        if (body) {
            body.innerHTML = `<p style="color:var(--dim); font-size:0.88rem; margin-bottom:14px;">Set your starting metrics once. You can change these anytime from the profile icon.</p>` + profileFormFields(s, 'setup');
            toggleProfileHipRow('setup');
        }
        const gate = document.getElementById('profile-setup-gate');
        if (gate) gate.classList.remove('hidden');
    }

    function hideProfileSetupModal() {
        const gate = document.getElementById('profile-setup-gate');
        if (gate) gate.classList.add('hidden');
    }

    function openProfileSheet() {
        renderProfileSheetForm();
        const sheet = document.getElementById('profileSheetBackdrop');
        if (sheet) {
            sheet.style.display = 'flex';
            setTimeout(() => sheet.classList.add('show'), 10);
        }
    }

    function closeProfileSheet() {
        const sheet = document.getElementById('profileSheetBackdrop');
        if (sheet) {
            sheet.classList.remove('show');
            setTimeout(() => sheet.style.display = 'none', 300);
        }
    }

    function closeProfileSheetEvent(e) {
        if (e.target.id === 'profileSheetBackdrop') closeProfileSheet();
    }

    async function createProfileFromForm() {
        const name = document.getElementById('newProfName').value.trim();
        if (!name) { document.getElementById('newProfName').focus(); return; }
        const pin = document.getElementById('newProfPin').value.trim();
        const meta = getProfilesMeta() || { version: 1, activeProfileId: '', profiles: [] };
        const profile = defaultProfile(name);
        profile.pinHash = await hashPin(pin);
        profile.settings.goalWeight = parseFloat(document.getElementById('newProfGoal').value) || 210;
        const startWt = parseFloat(document.getElementById('newProfStart').value);
        if (!isNaN(startWt) && startWt > 0) profile.settings.startWeight = startWt;
        profile.settings.cardioEquipment = document.getElementById('newProfCardio').value || 'peloton';
        profile.profileSetupComplete = false;
        meta.profiles.push(profile);
        meta.activeProfileId = profile.id;
        saveProfilesMeta(meta);
        hideProfileGate();
        if (needsProfileSetup()) {
            startApp();
        } else if (typeof init === 'function') {
            init();
            window._appInited = true;
        }
    }

    async function selectProfile(profileId) {
        const meta = getProfilesMeta();
        const profile = meta.profiles.find(p => p.id === profileId);
        if (!profile) return;
        if (profile.pinHash) {
            const pin = document.getElementById('profilePinInput').value.trim();
            const hash = await hashPin(pin);
            if (hash !== profile.pinHash) {
                document.getElementById('profilePinError').textContent = 'Incorrect PIN.';
                return;
            }
        }
        setActiveProfile(profileId);
        window._appInited = false;
        startApp();
    }

    function showProfileGate() {
        migrateToProfiles();
        const gate = document.getElementById('profile-gate');
        if (!gate) return;
        renderProfilePicker();
        gate.classList.remove('hidden');
        document.getElementById('profilePinInput').value = '';
        document.getElementById('profilePinError').textContent = '';
    }

    function hideProfileGate() {
        const gate = document.getElementById('profile-gate');
        if (gate) gate.classList.add('hidden');
    }

    function renderProfilePicker() {
        const meta = getProfilesMeta();
        const list = document.getElementById('profileList');
        if (!list || !meta) return;
        list.innerHTML = meta.profiles.map(p =>
            `<button type="button" class="action-btn btn-outline profile-pick-btn" onclick="selectProfile('${p.id}')">${p.name}${p.pinHash ? ' 🔒' : ''}</button>`
        ).join('');
    }

    function startApp() {
        hideProfileGate();
        if (needsProfileSetup()) {
            if (typeof loadWorkoutData === 'function') {
                loadWorkoutData().then(() => showProfileSetupModal());
            } else {
                showProfileSetupModal();
            }
            return;
        }
        if (typeof init === 'function') {
            init();
            window._appInited = true;
        }
    }

    function afterUnlock() {
        migrateToProfiles();
        const meta = getProfilesMeta();
        if (meta && meta.activeProfileId && meta.profiles.some(p => p.id === meta.activeProfileId)) {
            startApp();
            return;
        }
        if (meta && meta.profiles.length === 1 && !meta.profiles[0].pinHash) {
            setActiveProfile(meta.profiles[0].id);
            startApp();
            return;
        }
        showProfileGate();
    }

    function startChallengeOnDate(dateStr) {
        pSet('challenge_start', dateStr);
        renderPhaseProgress();
        const ws = document.getElementById('weekSelect');
        if (ws) { ws.value = '1'; pSet('sm_week', '1'); renderWorkoutDay(); }
        if (typeof ensureWeeklyPrep === 'function') ensureWeeklyPrep();
        if (typeof renderMealWeekBanner === 'function') renderMealWeekBanner();
    }

    function startChallengeToday() {
        startChallengeOnDate(toDateStr(new Date()));
    }

    function startChallengeTomorrow() {
        startChallengeOnDate(toDateStr(addDays(new Date(), 1)));
    }

    global.pGet = pGet;
    global.pSet = pSet;
    global.pRemove = pRemove;
    global.profileKey = profileKey;
    global.getProfilesMeta = getProfilesMeta;
    global.saveProfilesMeta = saveProfilesMeta;
    global.getActiveProfile = getActiveProfile;
    global.getActiveProfileId = getActiveProfileId;
    global.migrateToProfiles = migrateToProfiles;
    global.getMacroGoals = getMacroGoals;
    global.formatWeight = formatWeight;
    global.getScaledPhases = getScaledPhases;
    global.getPhaseTargetWeights = getPhaseTargetWeights;
    global.getCardioEquipment = getCardioEquipment;
    global.getProfileSex = getProfileSex;
    global.getExerciseBase = getExerciseBase;
    global.hasBarbellSub = hasBarbellSub;
    global.isExerciseDumbbellMode = isExerciseDumbbellMode;
    global.toggleExerciseEquipment = toggleExerciseEquipment;
    global.getRecommendedRest = getRecommendedRest;
    global.parseTimedExercise = parseTimedExercise;
    global.parseRepScheme = parseRepScheme;
    global.resolveExercise = resolveExercise;
    global.resolveStrengthExercise = resolveStrengthExercise;
    global.resolveCardioExercise = resolveCardioExercise;
    global.resolveWorkoutDay = resolveWorkoutDay;
    global.getMealWeekKey = getMealWeekKey;
    global.getActiveMealWeekKey = getActiveMealWeekKey;
    global.formatMealWeekRange = formatMealWeekRange;
    global.getCalendarWeekKey = getCalendarWeekKey;
    global.getPlanningWeekKey = getPlanningWeekKey;
    global.listSavedMealWeekKeys = listSavedMealWeekKeys;
    global.buildMealWeekOptions = buildMealWeekOptions;
    global.loadWeeklyPrepForKey = loadWeeklyPrepForKey;
    global.saveWeeklyPrepForKey = saveWeeklyPrepForKey;
    global.loadWeeklyPrep = loadWeeklyPrep;
    global.saveWeeklyPrep = saveWeeklyPrep;
    global.isWeekFrozen = isWeekFrozen;
    global.canShuffleWeeklyPrep = canShuffleWeeklyPrep;
    global.canDailyShuffle = canDailyShuffle;
    global.getWeekStatusLabel = getWeekStatusLabel;
    global.toDateStr = toDateStr;
    global.addDays = addDays;
    global.parseDateStr = parseDateStr;
    global.syncLoggedWeightToProfile = syncLoggedWeightToProfile;
    global.syncBodyMetricsToWorkoutInputs = syncBodyMetricsToWorkoutInputs;
    global.updateHipFieldVisibility = updateHipFieldVisibility;
    global.updateMeasureHints = updateMeasureHints;
    global.toggleProfileHipRow = toggleProfileHipRow;
    global.renderMacroDisplay = renderMacroDisplay;
    global.renderProfileSettings = renderProfileSettings;
    global.saveProfileSettings = saveProfileSettings;
    global.saveProfileSheet = saveProfileSheet;
    global.saveProfileSetup = saveProfileSetup;
    global.openProfileSheet = openProfileSheet;
    global.closeProfileSheet = closeProfileSheet;
    global.closeProfileSheetEvent = closeProfileSheetEvent;
    global.needsProfileSetup = needsProfileSetup;
    global.createProfileFromForm = createProfileFromForm;
    global.selectProfile = selectProfile;
    global.showProfileGate = showProfileGate;
    global.hideProfileGate = hideProfileGate;
    global.afterUnlock = afterUnlock;
    global.startChallengeToday = startChallengeToday;
    global.startChallengeTomorrow = startChallengeTomorrow;
    global.startChallengeOnDate = startChallengeOnDate;
    global.defaultProfile = defaultProfile;
    global.hashPin = hashPin;
    global.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
})(window);

/* Visible Abs Challenge — profiles, meal weeks, cardio subs, macro goals */
(function (global) {
    'use strict';

    const GLOBAL_KEYS = new Set(['app_unlocked', 'profiles_meta']);

    const DEFAULT_SETTINGS = {
        startWeight: 250,
        goalWeight: 210,
        macros: { calories: 2200, protein: 210, carbs: 180, fat: 70 },
        useProteinPerLbGoal: true,
        cardioEquipment: 'peloton'
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
            settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
            foodPrefs: {
                enabledDefaultCategories: ['preworkout', 'postworkout', 'breakfast', 'mains', 'snacks'],
                disabledRecipeNames: []
            }
        };
    }

    function migrateToProfiles() {
        if (localStorage.getItem('profiles_meta')) return;
        const profile = defaultProfile('Default');
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

    function getCardioEquipment() {
        const p = getActiveProfile();
        return (p && p.settings && p.settings.cardioEquipment) || 'peloton';
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

    function resolveWorkoutDay(dayData) {
        if (!dayData) return dayData;
        const eq = getCardioEquipment();
        if (eq === 'peloton') return dayData;
        const nameMap = CARDIO_WORKOUT_NAME_SUBS[eq] || {};
        const copy = Object.assign({}, dayData);
        if (copy.name && nameMap[copy.name]) copy.name = nameMap[copy.name];
        if (copy.exercises) {
            copy.exercises = copy.exercises.map(ex => resolveCardioExercise(ex).label);
        }
        return copy;
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

    function renderMacroDisplay() {
        const g = getMacroGoals();
        const calEl = document.querySelector('#nutrition .rep-range');
        if (calEl) calEl.textContent = `~${g.calories} Cal/Day`;
        const macroCard = document.querySelector('#nutrition .stats-card');
        if (macroCard) {
            const sub = macroCard.querySelector('div[style*="Aggressive"]') || macroCard.querySelector('div[style*="color:var(--dim)"]');
            if (sub) sub.textContent = `Macronutrients (Cut to ${g.goalWeight} lbs)`;
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
        const headerP = document.querySelector('#workout .app-header p');
        if (headerP) headerP.textContent = `${g.startWeight} → ${g.goalWeight} lbs | Goal: Visible Abs`;
    }

    function renderProfileSettings() {
        const el = document.getElementById('profileSettingsBody');
        if (!el) return;
        const p = getActiveProfile();
        if (!p) { el.innerHTML = '<p style="color:var(--dim);">No active profile.</p>'; return; }
        const s = p.settings;
        el.innerHTML = `
            <label class="checkin-modal-label">Display name</label>
            <input type="text" id="profName" class="checkin-input" value="${p.name.replace(/"/g, '&quot;')}">
            <label class="checkin-modal-label">Goal weight (lbs)</label>
            <input type="number" id="profGoalWt" class="checkin-input" value="${s.goalWeight}">
            <label class="checkin-modal-label">Start weight (lbs)</label>
            <input type="number" id="profStartWt" class="checkin-input" value="${s.startWeight}">
            <div class="cf-grid" style="margin-top:10px;">
                <div><label class="checkin-modal-label">Calories</label><input type="number" id="profCal" class="checkin-input" value="${s.macros.calories}"></div>
                <div><label class="checkin-modal-label">Protein (g)</label><input type="number" id="profPro" class="checkin-input" value="${s.macros.protein}"></div>
                <div><label class="checkin-modal-label">Carbs (g)</label><input type="number" id="profCarb" class="checkin-input" value="${s.macros.carbs}"></div>
                <div><label class="checkin-modal-label">Fat (g)</label><input type="number" id="profFat" class="checkin-input" value="${s.macros.fat}"></div>
            </div>
            <label style="display:flex;align-items:center;gap:8px;margin:12px 0;font-size:0.88rem;">
                <input type="checkbox" id="profProPerLb" ${s.useProteinPerLbGoal ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);">
                Auto protein = 1g per lb goal weight
            </label>
            <label class="checkin-modal-label">Cardio equipment</label>
            <select id="profCardio" class="checkin-input">
                <option value="peloton" ${s.cardioEquipment === 'peloton' ? 'selected' : ''}>Peloton / spin bike app</option>
                <option value="generic_bike" ${s.cardioEquipment === 'generic_bike' ? 'selected' : ''}>Stationary bike (no Peloton)</option>
                <option value="treadmill" ${s.cardioEquipment === 'treadmill' ? 'selected' : ''}>Treadmill</option>
                <option value="outdoor" ${s.cardioEquipment === 'outdoor' ? 'selected' : ''}>Outdoor walk / run</option>
            </select>
            <button class="action-btn btn-primary" style="margin-top:12px;" onclick="saveProfileSettings()">💾 Save Profile</button>
            <button class="action-btn btn-outline" style="margin-top:8px;" onclick="showProfileGate()">👤 Switch Profile</button>`;
    }

    function saveProfileSettings() {
        const meta = getProfilesMeta();
        const p = getActiveProfile();
        if (!meta || !p) return;
        p.name = document.getElementById('profName').value.trim() || p.name;
        p.settings.goalWeight = parseInt(document.getElementById('profGoalWt').value, 10) || 210;
        p.settings.startWeight = parseInt(document.getElementById('profStartWt').value, 10) || 250;
        p.settings.macros.calories = parseInt(document.getElementById('profCal').value, 10) || 2200;
        p.settings.macros.protein = parseInt(document.getElementById('profPro').value, 10) || 210;
        p.settings.macros.carbs = parseInt(document.getElementById('profCarb').value, 10) || 180;
        p.settings.macros.fat = parseInt(document.getElementById('profFat').value, 10) || 70;
        p.settings.useProteinPerLbGoal = document.getElementById('profProPerLb').checked;
        p.settings.cardioEquipment = document.getElementById('profCardio').value;
        saveProfilesMeta(meta);
        renderMacroDisplay();
        renderProfileSettings();
        renderWorkoutDay();
        updateTracking();
        alert('Profile saved.');
    }

    async function createProfileFromForm() {
        const name = document.getElementById('newProfName').value.trim();
        if (!name) { document.getElementById('newProfName').focus(); return; }
        const pin = document.getElementById('newProfPin').value.trim();
        const meta = getProfilesMeta() || { version: 1, activeProfileId: '', profiles: [] };
        const profile = defaultProfile(name);
        profile.pinHash = await hashPin(pin);
        profile.settings.goalWeight = parseInt(document.getElementById('newProfGoal').value, 10) || 210;
        profile.settings.cardioEquipment = document.getElementById('newProfCardio').value || 'peloton';
        meta.profiles.push(profile);
        meta.activeProfileId = profile.id;
        saveProfilesMeta(meta);
        hideProfileGate();
        if (typeof init === 'function') init();
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
        hideProfileGate();
        if (typeof init === 'function') init();
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

    function afterUnlock() {
        migrateToProfiles();
        const meta = getProfilesMeta();
        if (meta && meta.activeProfileId && meta.profiles.some(p => p.id === meta.activeProfileId)) {
            hideProfileGate();
            if (typeof init === 'function') init();
            return;
        }
        if (meta && meta.profiles.length === 1 && !meta.profiles[0].pinHash) {
            setActiveProfile(meta.profiles[0].id);
            hideProfileGate();
            if (typeof init === 'function') init();
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
    global.getCardioEquipment = getCardioEquipment;
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
    global.renderMacroDisplay = renderMacroDisplay;
    global.renderProfileSettings = renderProfileSettings;
    global.saveProfileSettings = saveProfileSettings;
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

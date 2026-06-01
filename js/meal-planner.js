/* Weekly daily menu planner — Mon-Sat calendar, dedup, portions */
(function (global) {
    'use strict';

    const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const SLOT_DEFS = [
        { key: 'preworkout', slot: '⚡ Pre-Workout', time: '5:15 AM', color: 'var(--steps)', poolKey: 'preworkout' },
        { key: 'postworkout', slot: '🥤 Post-Workout', time: '7:00 AM', color: 'var(--water)', poolKey: 'postworkout' },
        { key: 'breakfast', slot: '🍳 Breakfast', time: '9:30 AM', color: 'var(--primary)', poolKey: 'breakfast' },
        { key: 'lunch', slot: '🍛 Lunch', time: '12:30 PM', color: 'var(--success)', poolKey: 'mains', isMain: true },
        { key: 'snack', slot: '🥜 Afternoon Snack', time: '4:00 PM', color: 'var(--purple)', poolKey: 'snacks' },
        { key: 'dinner', slot: '🍽️ Dinner', time: '7:30 PM', color: 'var(--success)', poolKey: 'mains', isMain: true }
    ];

    const DEFAULT_SERVINGS = { mains: 6, breakfast: 4, snacks: 8, preworkout: 7, postworkout: 7 };

    function getRecipeFamily(recipe) {
        if (!recipe) return '';
        if (recipe.family) return recipe.family;
        const n = recipe.name.toLowerCase();
        if (n.includes('huel')) return 'huel';
        if (n.includes('cosmic')) return 'cosmic';
        if (n.includes('shake')) return 'shake';
        return recipe.name;
    }

    function getServingsPerBatch(recipe, poolKey) {
        if (recipe && recipe.servingsPerBatch) return recipe.servingsPerBatch;
        return DEFAULT_SERVINGS[poolKey] || 6;
    }

    function poolFromPrep(prep, key, fallback) {
        const fromPrep = prep && prep[key] && prep[key].length ? prep[key] : null;
        return fromPrep || fallback || [];
    }

    function pickRotated(pool, dayIndex, usedFamilies, blockedNames) {
        if (!pool.length) return null;
        const rotated = [...pool].sort((a, b) => {
            const ha = (a.name.length + dayIndex) % pool.length;
            const hb = (b.name.length + dayIndex * 2) % pool.length;
            return ha - hb;
        });
        for (const item of rotated) {
            const fam = getRecipeFamily(item);
            if (blockedNames.has(item.name)) continue;
            if (usedFamilies.has(fam)) continue;
            return item;
        }
        for (const item of rotated) {
            if (!blockedNames.has(item.name)) return item;
        }
        return rotated[0];
    }

    function assignMainsAcrossWeek(mainsPool) {
        const assignments = {};
        if (!mainsPool.length) return assignments;
        const expanded = [];
        mainsPool.forEach((m, i) => {
            expanded.push(m, m, m);
        });
        let idx = 0;
        WEEKDAYS.forEach((day, di) => {
            const lunch = expanded[idx % expanded.length];
            idx++;
            let dinner = expanded[idx % expanded.length];
            idx++;
            if (dinner.name === lunch.name && mainsPool.length > 1) {
                dinner = mainsPool[(mainsPool.indexOf(lunch) + 1) % mainsPool.length];
            }
            if (di > 0) {
                const prev = assignments[WEEKDAYS[di - 1]];
                if (prev && prev.lunch.name === lunch.name && mainsPool.length > 1) {
                    const alt = mainsPool.find(m => m.name !== lunch.name && m.name !== prev.dinner.name);
                    if (alt) assignments[day] = { lunch: alt, dinner: alt.name === dinner.name && mainsPool.length > 2
                        ? mainsPool.find(m => m.name !== alt.name && m.name !== dinner.name) || dinner : dinner };
                    else assignments[day] = { lunch, dinner };
                } else {
                    assignments[day] = { lunch, dinner };
                }
            } else {
                assignments[day] = { lunch, dinner };
            }
        });
        return assignments;
    }

    function buildWeeklyDailyMenu(prep, db) {
        const menu = { days: {}, mainUsage: {} };
        const mainsPool = poolFromPrep(prep, 'mains', db.mains);
        const mainAssign = assignMainsAcrossWeek(mainsPool);

        WEEKDAYS.forEach((day, dayIndex) => {
            const dayMenu = {};
            const usedFamilies = new Set();
            const blockedNames = new Set();

            const prePool = poolFromPrep(prep, 'preworkout', db.preworkout);
            const postPool = poolFromPrep(prep, 'postworkout', db.postworkout);
            const bfPool = poolFromPrep(prep, 'breakfast', db.breakfast);
            const snackPool = poolFromPrep(prep, 'snacks', db.snacks);

            dayMenu.preworkout = pickRotated(prePool, dayIndex, usedFamilies, blockedNames);
            if (dayMenu.preworkout) {
                usedFamilies.add(getRecipeFamily(dayMenu.preworkout));
                blockedNames.add(dayMenu.preworkout.name);
            }

            dayMenu.postworkout = pickRotated(postPool, dayIndex + 1, usedFamilies, blockedNames);
            if (dayMenu.postworkout) {
                usedFamilies.add(getRecipeFamily(dayMenu.postworkout));
                blockedNames.add(dayMenu.postworkout.name);
            }

            dayMenu.breakfast = pickRotated(bfPool, dayIndex + 2, usedFamilies, blockedNames);
            if (dayMenu.breakfast) usedFamilies.add(getRecipeFamily(dayMenu.breakfast));

            dayMenu.snack = pickRotated(snackPool, dayIndex + 3, usedFamilies, blockedNames);
            if (dayMenu.snack) usedFamilies.add(getRecipeFamily(dayMenu.snack));

            const mains = mainAssign[day] || {};
            dayMenu.lunch = mains.lunch || pickRotated(mainsPool, dayIndex, new Set(), new Set());
            dayMenu.dinner = mains.dinner || dayMenu.lunch;

            if (dayMenu.lunch) {
                menu.mainUsage[dayMenu.lunch.name] = (menu.mainUsage[dayMenu.lunch.name] || 0) + 1;
            }
            if (dayMenu.dinner && dayMenu.dinner.name !== dayMenu.lunch?.name) {
                menu.mainUsage[dayMenu.dinner.name] = (menu.mainUsage[dayMenu.dinner.name] || 0) + 1;
            } else if (dayMenu.dinner) {
                menu.mainUsage[dayMenu.dinner.name] = (menu.mainUsage[dayMenu.dinner.name] || 0) + 1;
            }

            menu.days[day] = dayMenu;
        });

        return menu;
    }

    function loadDailyMenu(weekKey) {
        const raw = global.pGet('daily_menu_' + weekKey);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    function saveDailyMenu(weekKey, menu) {
        global.pSet('daily_menu_' + weekKey, JSON.stringify(menu));
    }

    function ensureDailyMenu(weekKey, prep, db) {
        let menu = loadDailyMenu(weekKey);
        if (menu && menu.days && menu.days.Monday) return menu;
        if (!prep || !prep.mains || !prep.mains.length) return null;
        menu = buildWeeklyDailyMenu(prep, db.prepRecipes);
        saveDailyMenu(weekKey, menu);
        return menu;
    }

    function getPortionInfo(recipe, poolKey, menu, dayName, slotKey) {
        if (!recipe || !menu) return null;
        const total = getServingsPerBatch(recipe, poolKey);
        if (slotKey === 'lunch' || slotKey === 'dinner') {
            const usedBefore = WEEKDAYS.filter(d => {
                if (d === dayName) return false;
                const dm = menu.days[d];
                if (!dm) return false;
                return (dm.lunch && dm.lunch.name === recipe.name) || (dm.dinner && dm.dinner.name === recipe.name);
            }).reduce((count, d) => {
                const dm = menu.days[d];
                let c = 0;
                if (dm.lunch && dm.lunch.name === recipe.name) c++;
                if (dm.dinner && dm.dinner.name === recipe.name) c++;
                return count + c;
            }, 0);
            const sameDayPrior = (slotKey === 'dinner' && menu.days[dayName].lunch && menu.days[dayName].lunch.name === recipe.name) ? 1 : 0;
            const portion = usedBefore + sameDayPrior + 1;
            return { portion, total, remaining: Math.max(0, total - portion) };
        }
        return { portion: 1, total, remaining: total - 1 };
    }

    function getTodayWeekdayName() {
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return names[new Date().getDay()];
    }

    global.MealPlanner = {
        WEEKDAYS,
        SLOT_DEFS,
        getRecipeFamily,
        getServingsPerBatch,
        buildWeeklyDailyMenu,
        loadDailyMenu,
        saveDailyMenu,
        ensureDailyMenu,
        getPortionInfo,
        getTodayWeekdayName
    };
})(window);

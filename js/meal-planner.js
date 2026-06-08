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
            const dayIdx = WEEKDAYS.indexOf(dayName);
            // Only count days that come BEFORE the current day in the week
            const usedBefore = WEEKDAYS.filter(d => {
                const dIdx = WEEKDAYS.indexOf(d);
                if (dIdx >= dayIdx) return false;
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
            const sameDayPrior = (slotKey === 'dinner' && menu.days[dayName] && menu.days[dayName].lunch && menu.days[dayName].lunch.name === recipe.name) ? 1 : 0;
            const portion = usedBefore + sameDayPrior + 1;
            return { portion, total, remaining: Math.max(0, total - portion) };
        }
        return { portion: 1, total, remaining: total - 1 };
    }

    function getTodayWeekdayName() {
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return names[new Date().getDay()];
    }

    /** Qty strings that are already full-batch amounts (do not multiply). */
    function isBatchTotalQty(qty) {
        const q = String(qty || '').toLowerCase();
        return /full batch|— full batch|per dosa|per serving|per plated/.test(q);
    }

    /** Count-based items that cannot be auto-summed — annotate ×N instead. */
    function isCountBasedQty(qty) {
        const q = String(qty || '').toLowerCase();
        if (/\([\d.]+\s*g\b/.test(q)) return false;
        return /to taste|handful|optional|pinch|as needed|each\)| each|small each|medium each|large each|\d+\s+(small|medium|large)\b/.test(q);
    }

    function parseScalableQty(qty) {
        let s = String(qty || '').trim().toLowerCase();
        if (!s || isBatchTotalQty(s) || isCountBasedQty(s)) return null;
        const rangeMl = s.match(/^([\d.]+)\s*[–-]\s*([\d.]+)\s*ml\b/);
        if (rangeMl) {
            return { value: (parseFloat(rangeMl[1]) + parseFloat(rangeMl[2])) / 2, unit: 'ml' };
        }
        let m = s.match(/^([\d.]+)\s*g\b/);
        if (m) return { value: parseFloat(m[1]), unit: 'g' };
        m = s.match(/\(([\d.]+)\s*g\b/);
        if (m) return { value: parseFloat(m[1]), unit: 'g' };
        m = s.match(/^([\d.]+)\s*(kg|ml|l)\b/);
        if (m) return { value: parseFloat(m[1]), unit: m[2] };
        m = s.match(/^([\d.]+)\s*\/\s*([\d.]+)\s*(scoop|scoops|cup|cups|tbsp|tsp)\b/i);
        if (m) return { value: parseFloat(m[1]) / parseFloat(m[2]), unit: m[3].replace(/s$/i, '').toLowerCase() };
        m = s.match(/^([\d.]+)\s*(scoop|scoops|cup|cups|tbsp|tsp|oz)\b/i);
        if (m) return { value: parseFloat(m[1]), unit: m[2].replace(/s$/i, '').toLowerCase() };
        m = s.match(/^([\d.]+)\s*(cakes?|bananas?|dates?|pouches?)\b/);
        if (m) return { value: parseFloat(m[1]), unit: m[2].replace(/s$/, '') };
        m = s.match(/^([\d.]+)\s*\(/);
        if (m) return { value: parseFloat(m[1]), unit: 'unit' };
        return null;
    }

    function formatScaledNumber(v) {
        if (v >= 100) return String(Math.round(v));
        return String(Math.round(v * 10) / 10);
    }

    function formatScaledQty(parsed, mult) {
        let v = parsed.value * mult;
        let unit = parsed.unit;
        if (unit === 'g' && v >= 1000) {
            v = Math.round((v / 1000) * 10) / 10;
            unit = 'kg';
        } else if (unit === 'ml' && v >= 1000) {
            v = Math.round((v / 1000) * 10) / 10;
            unit = 'l';
        }
        const n = formatScaledNumber(v);
        if (unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l') return n + unit;
        if (unit === 'unit') return n + ' units';
        const plural = v === 1 ? unit : unit + 's';
        return n + ' ' + plural;
    }

    /** Scale a recipe line qty for bulk prep / grocery (per-serving → full batch). */
    function scaleIngredientQty(qty, servings) {
        const mult = servings > 0 ? servings : 1;
        if (mult <= 1 || isBatchTotalQty(qty)) return qty;
        if (isCountBasedQty(qty)) return qty + ' (×' + mult + ' for batch)';
        const p = parseScalableQty(qty);
        if (!p) return qty + ' (×' + mult + ' for batch)';
        return formatScaledQty(p, mult);
    }

    /** Full-batch shopping/cook list for Weekly Bulk Prep. Optional servingsOverride bypasses DEFAULT_SERVINGS. */
    function getBatchIngredients(recipe, poolKey, servingsOverride) {
        const servings = servingsOverride !== undefined ? servingsOverride : getServingsPerBatch(recipe, poolKey);
        if (!recipe || !recipe.ingredients) return [];
        return recipe.ingredients.map(ing => ({
            item: ing.item,
            qty: scaleIngredientQty(ing.qty, servings),
            perServingQty: ing.qty
        }));
    }

    /** Compute how many times each main recipe is actually used across the week (lunch + dinner). */
    function computeMainServingsMap(prep) {
        const map = {};
        if (!prep || !prep.mains || !prep.mains.length) return map;
        const assignments = assignMainsAcrossWeek(prep.mains);
        WEEKDAYS.forEach(day => {
            const a = assignments[day];
            if (!a) return;
            if (a.lunch) map[a.lunch.name] = (map[a.lunch.name] || 0) + 1;
            if (a.dinner) map[a.dinner.name] = (map[a.dinner.name] || 0) + 1;
        });
        return map;
    }

    /** Grouped grocery sections: one block per prepped recipe with batch totals. */
    function buildWeeklyGroceryPlan(prep) {
        const sections = [];
        const pools = [
            { key: 'breakfast', label: 'Breakfast' },
            { key: 'mains', label: 'Mains' },
            { key: 'snacks', label: 'Snacks' },
            { key: 'preworkout', label: 'Pre-Workout' },
            { key: 'postworkout', label: 'Post-Workout' }
        ];
        pools.forEach(({ key, label }) => {
            (prep[key] || []).forEach(meal => {
                const servings = getServingsPerBatch(meal, key);
                const lines = getBatchIngredients(meal, key);
                if (!lines.length) return;
                sections.push({ mealName: meal.name, poolLabel: label, servings, lines });
            });
        });
        return sections;
    }

    const GROCERY_CATEGORY_ORDER = [
        { id: 'produce', label: '🥬 Produce' },
        { id: 'dairy', label: '🥛 Dairy' },
        { id: 'protein_legumes', label: '🫘 Beans, lentils & meat alternatives' },
        { id: 'grains', label: '🌾 Rice, grains & pasta' },
        { id: 'shakes', label: '💪 Protein powders & shakes' },
        { id: 'pantry', label: '🧂 Pantry, sauces & spices' },
        { id: 'other', label: '📦 Other' }
    ];

    const INGREDIENT_DISPLAY_NAMES = {
        paneer: 'Paneer (low-fat)',
        greek_yogurt: 'Greek Yogurt (0% fat)',
        rajma: 'Rajma / kidney beans (cooked)',
        black_beans: 'Black beans (cooked)',
        pinto_beans: 'Pinto beans (cooked)',
        chickpeas: 'Chickpeas (cooked)',
        brown_rice: 'Brown rice (cooked)',
        pasta: 'Whole wheat pasta (dry)',
        spinach: 'Spinach',
        beyond_beef: 'Beyond Beef (ground)',
        tomato_passata: 'Tomato passata / crushed tomatoes',
        whey: 'Whey protein',
        cosmic_protein: 'Cosmic Protein',
        huel_black: 'Huel Black powder',
        huel_hot: 'Huel Hot & Savory',
        oats: 'Oats',
        besan: 'Besan (gram flour)',
        eggs: 'Egg whites',
        seitan: 'Seitan',
        soy_chunks: 'Soy chunks (dry)',
        urad_dal: 'Whole urad dal (dry)',
        dosa_rice: 'Dosa / idli rice (dry)',
        lentils_mixed: 'Lentils (dry)',
        tortillas: 'Corn / whole wheat tortillas',
        salsa: 'Salsa',
        enchilada_sauce: 'Enchilada sauce',
        almond_milk: 'Almond milk',
        milk: 'Milk (low-fat)',
        onion: 'Onion',
        garlic: 'Garlic',
        ginger: 'Fresh ginger',
        cilantro: 'Fresh cilantro',
        lime: 'Limes / lime juice',
        tomato: 'Tomato',
        jalapeno: 'Jalapeño'
    };

    function shouldSkipGroceryLine(item, qty) {
        const t = (String(item) + ' ' + String(qty)).toLowerCase();
        if (/per dosa|per scoop batter|per plated/.test(t)) return true;
        if (/^(cold )?water$|^boiling water$|^ice cube/i.test(t.trim())) return true;
        return false;
    }

    function isSpiceItem(item) {
        const s = String(item || '').toLowerCase();
        if (/bell pepper|capsicum|jalapeño|jalapeno/.test(s)) return false;
        return /masala|cumin|coriander|turmeric|chilli|chili powder|paprika|oregano|fenugreek|chaat|mustard seed|curry powder|chipotle powder|garlic powder|ginger powder|spice blend|dried herb/.test(s);
    }

    function isToTasteQty(qty) {
        return /to taste|as needed|optional|pinch|handful/.test(String(qty || '').toLowerCase());
    }

    function extractBatchMultiplier(qty) {
        const m = String(qty || '').match(/\(×(\d+)\s*for batch\)/i);
        return m ? parseFloat(m[1]) : 1;
    }

    function formatSingleCount(key, n) {
        const labels = {
            small_onion: 'small onions', medium_onion: 'medium onions', large_onion: 'large onions',
            small_tomato: 'small tomatoes', medium_tomato: 'medium tomatoes', large_tomato: 'large tomatoes',
            clove: 'cloves garlic', ginger_inch: 'inch ginger', lime: 'limes'
        };
        const nStr = formatScaledNumber(n);
        const label = labels[key] || key;
        if (/onion|tomato|lime/.test(label)) return nStr + ' ' + label;
        if (key === 'clove') return nStr + ' ' + label;
        if (key === 'ginger_inch') return nStr + ' ' + label;
        return nStr + ' ' + label;
    }

    function scaleCountQtyPart(qtyPart, mult, item) {
        if (mult <= 1) return qtyPart;
        const c = parseCountableQty(qtyPart, item);
        if (c) return formatSingleCount(c.key, c.n * mult);
        return qtyPart;
    }

    /** Split "Onion + garlic + ginger" into separate shop lines (keep spice blends together). */
    function expandCompoundIngredientLine(item, qty) {
        const name = String(item || '').trim();
        const q = String(qty || '').trim();
        if (!/\s+\+\s+/.test(name)) return [{ item: name, qty: q }];
        const parts = name.split(/\s+\+\s+/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1 && parts.every(p => isSpiceItem(p))) {
            return [{ item: name, qty: q }];
        }
        const mult = extractBatchMultiplier(q);
        const qBase = q.replace(/\(×\d+ for batch\)/gi, '').trim();
        const qtyParts = qBase.split(/\s+\+\s+/).map(s => s.trim()).filter(Boolean);
        if (qtyParts.length === parts.length) {
            return parts.map((p, i) => ({ item: p, qty: scaleCountQtyPart(qtyParts[i], mult, p) }));
        }
        return parts.map(p => ({ item: p, qty: scaleCountQtyPart(qBase, mult, p) }));
    }

    function parseCountableQty(qty, item) {
        const itemL = String(item || '').toLowerCase();
        let mult = 1;
        const batchM = String(qty || '').match(/\(×(\d+)\s*for batch\)/i);
        if (batchM) mult = parseFloat(batchM[1]);
        const s = String(qty || '').replace(/\(×\d+ for batch\)/gi, '').trim().toLowerCase();
        let m = s.match(/^([\d.]+)\s*(small|medium|large)\b/);
        if (m) {
            const n = parseFloat(m[1]) * mult;
            if (/tomato/.test(itemL)) return { key: m[2] + '_tomato', n };
            if (/onion/.test(itemL)) return { key: m[2] + '_onion', n };
            return { key: m[2] + '_veg', n };
        }
        m = s.match(/^([\d.]+)\s*cloves?\b/);
        if (m) return { key: 'clove', n: parseFloat(m[1]) * mult };
        m = s.match(/^([\d.]+)\s*(inches|inch|in)\b/);
        if (m) return { key: 'ginger_inch', n: parseFloat(m[1]) * mult };
        m = s.match(/^([\d.]+)\s*(limes?)\b/);
        if (m) return { key: 'lime', n: parseFloat(m[1]) * mult };
        if (/^half\s+lime/.test(s)) return { key: 'lime', n: 0.5 * mult };
        m = s.match(/^([\d.]+)\s*(tbsp|tsp)\s*each/);
        if (m) return { key: 'spice_' + m[2], n: parseFloat(m[1]) * mult };
        return null;
    }

    function formatCountTotals(counts) {
        const labels = {
            small_onion: 'small onions',
            medium_onion: 'medium onions',
            large_onion: 'large onions',
            small_tomato: 'small tomatoes',
            medium_tomato: 'medium tomatoes',
            large_tomato: 'large tomatoes',
            small_veg: 'small (misc)',
            clove: 'cloves garlic',
            ginger_inch: 'inch fresh ginger',
            lime: 'limes',
            spice_tsp: 'tsp (combined spices)',
            spice_tbsp: 'tbsp (combined spices)'
        };
        return Object.keys(counts)
            .map(k => formatScaledNumber(counts[k]) + ' ' + (labels[k] || k))
            .join(', ');
    }

    function normalizeIngredientKey(item) {
        const raw = String(item || '').toLowerCase();
        if (/per dosa|per scoop/.test(raw)) return null;
        if (isSpiceItem(item)) return 'spice_' + raw.replace(/[^a-z0-9]+/g, '_').slice(0, 40);
        const rules = [
            [/paneer/, 'paneer'],
            [/greek yogurt|greek yoghurt/, 'greek_yogurt'],
            [/rajma|kidney bean/, 'rajma'],
            [/black bean/, 'black_beans'],
            [/pinto bean/, 'pinto_beans'],
            [/chickpea/, 'chickpeas'],
            [/brown rice/, 'brown_rice'],
            [/whole wheat pasta|whole wheat roti|pasta/, 'pasta'],
            [/corn tortilla|tortilla/, 'tortillas'],
            [/spinach/, 'spinach'],
            [/beyond beef/, 'beyond_beef'],
            [/seitan/, 'seitan'],
            [/soy chunk/, 'soy_chunks'],
            [/passata|crushed tomato/, 'tomato_passata'],
            [/enchilada sauce/, 'enchilada_sauce'],
            [/whey protein|whey/, 'whey'],
            [/cosmic protein/, 'cosmic_protein'],
            [/huel black/, 'huel_black'],
            [/huel hot/, 'huel_hot'],
            [/oats/, 'oats'],
            [/besan|gram flour/, 'besan'],
            [/egg white/, 'eggs'],
            [/urad dal|black lentil/, 'urad_dal'],
            [/dosa rice|idli rice|parboiled/, 'dosa_rice'],
            [/masoor|moong|red lentil|masoor dal|moong dal/, 'lentils_mixed'],
            [/almond milk/, 'almond_milk'],
            [/milk \(low|low-fat milk/, 'milk'],
            [/salsa/, 'salsa'],
            [/banana/, 'banana'],
            [/berry|berries/, 'berries'],
            [/cilantro|coriander(?!.*powder)/, 'cilantro'],
            [/lime/, 'lime'],
            [/jalapeño|jalapeno/, 'jalapeno'],
            [/garlic powder/, 'spice_garlic_powder'],
            [/garlic/, 'garlic'],
            [/ginger paste|ginger/, 'ginger'],
            [/onion/, 'onion'],
            [/tomato/, 'tomato']
        ];
        for (const [re, key] of rules) {
            if (re.test(raw)) return key;
        }
        return raw.replace(/\s*\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || null;
    }

    function prettifyIngredientLabel(item, key) {
        if (key && INGREDIENT_DISPLAY_NAMES[key]) return INGREDIENT_DISPLAY_NAMES[key];
        return String(item || '')
            .replace(/\s*\([^)]*\)/g, '')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim() || key;
    }

    function categorizeGroceryItem(key, item) {
        const s = (key + ' ' + item).toLowerCase();
        if (/^spice_/.test(key) || isSpiceItem(item)) return 'pantry';
        if (/kaged|pre-workout|whey|cosmic|huel|protein powder|multivitamin/.test(s)) return 'shakes';
        if (/paneer|yogurt|milk|butter|ghee|cream/.test(s)) return 'dairy';
        if (/chickpea|rajma|bean|lentil|dal|urad|moong|masoor|beyond|seitan|soy|egg|beef/.test(s)) return 'protein_legumes';
        if (/rice|oats|pasta|tortilla|roti|poha|besan|flour|cake|bread|murmura|puffed/.test(s)) return 'grains';
        if (/cumin|turmeric|masala|paprika|sauce|salsa|oil|honey|chia|peanut|almond|cashew|capser|olive|pesto|yeast|stock|vinegar|spice|salt|mustard|curry|fenugreek|chipotle|oregano|nutritional|to taste/.test(s)) return 'pantry';
        if (/onion|garlic|ginger|spinach|lime|lemon|cilantro|coriander|jalape|mango|berr|banana|date|cucumber|carrot|celery|green pea|frozen pea|sweet potato|potato|mint|herb|corn\b|tomato|capsicum|bell pepper/.test(s)) return 'produce';
        return 'other';
    }

    function addGroceryLineToBuckets(buckets, item, qty, mealName) {
        if (shouldSkipGroceryLine(item, qty)) return;
        if (isToTasteQty(qty) && !parseScalableQty(qty) && !parseCountableQty(qty, item)) {
            const baseKey = normalizeIngredientKey(item) || item.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            const mergeKey = 'pantry_to_taste_' + baseKey;
            if (!buckets.has(mergeKey)) {
                buckets.set(mergeKey, {
                    key: mergeKey,
                    label: prettifyIngredientLabel(item, null),
                    category: 'pantry',
                    totals: {},
                    counts: {},
                    fallback: [],
                    sources: []
                });
            }
            const b = buckets.get(mergeKey);
            if (b.sources.indexOf(mealName) === -1) b.sources.push(mealName);
            return;
        }

        const mergeKey = normalizeIngredientKey(item);
        if (!mergeKey) return;

        if (!buckets.has(mergeKey)) {
            buckets.set(mergeKey, {
                key: mergeKey,
                label: prettifyIngredientLabel(item, mergeKey),
                category: categorizeGroceryItem(mergeKey, item),
                totals: {},
                counts: {},
                fallback: [],
                sources: []
            });
        }
        const b = buckets.get(mergeKey);
        if (b.sources.indexOf(mealName) === -1) b.sources.push(mealName);

        const parsed = parseScalableQty(qty);
        if (parsed) {
            b.totals[parsed.unit] = (b.totals[parsed.unit] || 0) + parsed.value;
            return;
        }
        let counted = parseCountableQty(qty, item);
        if (!counted && /\(×\d+ for batch\)/i.test(qty)) {
            const mult = extractBatchMultiplier(qty);
            const qBase = qty.replace(/\(×\d+ for batch\)/gi, '').trim();
            const base = parseCountableQty(qBase, item);
            if (base) counted = { key: base.key, n: base.n * mult };
        }
        if (counted) {
            b.counts[counted.key] = (b.counts[counted.key] || 0) + counted.n;
            return;
        }
        if (isBatchTotalQty(qty)) {
            if (b.fallback.indexOf(qty) === -1) b.fallback.push(qty);
        } else {
            const fb = qty.replace(/\s*\(×\d+ for batch\)/gi, '').trim();
            if (b.fallback.indexOf(fb) === -1) b.fallback.push(fb);
        }
    }

    function formatMergedTotals(totals) {
        const parts = [];
        const order = ['kg', 'g', 'l', 'ml', 'scoop', 'cup', 'tbsp', 'tsp', 'oz', 'banana', 'date', 'cake', 'pouch', 'unit'];
        order.forEach(unit => {
            if (totals[unit] == null) return;
            parts.push(formatScaledQty({ value: totals[unit], unit }, 1));
        });
        Object.keys(totals).forEach(unit => {
            if (!order.includes(unit)) {
                parts.push(formatScaledQty({ value: totals[unit], unit }, 1));
            }
        });
        return parts.join(' + ');
    }

    /** Shop list: merge same ingredients across all weekly prep recipes, grouped by store section. */
    function buildAggregatedWeeklyGrocery(prep) {
        const buckets = new Map();
        // Use actual weekly usage counts for mains so the shopping list matches what's needed
        const mainServingsMap = computeMainServingsMap(prep);

        const pools = [
            { key: 'breakfast', label: 'Breakfast' },
            { key: 'mains', label: 'Mains' },
            { key: 'snacks', label: 'Snacks' },
            { key: 'preworkout', label: 'Pre-Workout' },
            { key: 'postworkout', label: 'Post-Workout' }
        ];

        pools.forEach(({ key }) => {
            (prep[key] || []).forEach(meal => {
                const servingsOverride = key === 'mains' ? (mainServingsMap[meal.name] || getServingsPerBatch(meal, key)) : undefined;
                getBatchIngredients(meal, key, servingsOverride).forEach(line => {
                    expandCompoundIngredientLine(line.item, line.qty).forEach(part => {
                        addGroceryLineToBuckets(buckets, part.item, part.qty, meal.name);
                    });
                });
            });
        });

        const byCategory = {};
        GROCERY_CATEGORY_ORDER.forEach(c => { byCategory[c.id] = []; });

        buckets.forEach(b => {
            let qty = formatMergedTotals(b.totals);
            const countStr = formatCountTotals(b.counts || {});
            if (countStr) qty = qty ? qty + ', ' + countStr : countStr;
            if (!qty && b.fallback.length === 1) qty = b.fallback[0];
            else if (!qty && b.fallback.length) qty = b.fallback.join(', ');
            if (!qty && b.sources.length && /^pantry_to_taste_/.test(b.key)) qty = 'to taste';
            if (!qty) qty = 'see recipes';
            if (!byCategory[b.category]) byCategory[b.category] = [];
            byCategory[b.category].push({
                item: b.label,
                qty,
                sources: b.sources.slice().sort()
            });
        });

        return GROCERY_CATEGORY_ORDER
            .map(cat => ({
                id: cat.id,
                label: cat.label,
                items: (byCategory[cat.id] || []).sort((a, b) => a.item.localeCompare(b.item))
            }))
            .filter(sec => sec.items.length > 0);
    }

    global.MealPlanner = {
        WEEKDAYS,
        SLOT_DEFS,
        getRecipeFamily,
        getServingsPerBatch,
        scaleIngredientQty,
        getBatchIngredients,
        buildWeeklyGroceryPlan,
        buildAggregatedWeeklyGrocery,
        buildWeeklyDailyMenu,
        loadDailyMenu,
        saveDailyMenu,
        ensureDailyMenu,
        getPortionInfo,
        getTodayWeekdayName,
        computeMainServingsMap
    };
})(window);

/**
 * One-time normalizer: explicit servingsPerBatch, per-serving batch model, enchilada batch steps.
 * Run: node scripts/normalize-recipes-batch.js
 */
const fs = require('fs');
const path = require('path');

const RECIPES_PATH = path.join(__dirname, '..', 'recipes.json');
const DEFAULTS = { preworkout: 7, postworkout: 7, breakfast: 4, mains: 6, snacks: 8 };
const POOL_NOTES = {
    preworkout:
        'Per training day (one pre-workout pack). Shop list multiplies for the full week.',
    postworkout:
        'Per workout day. Shop list multiplies for the full week (e.g. 7 shakes).',
    breakfast:
        'Per breakfast container. Shop list = full batch (typically 4 containers).',
    mains:
        'Per lunch/dinner container. Shop list = full batch (typically 6 containers).',
    snacks:
        'Per snack portion. Shop list = full week batch (typically 8 portions).'
};

const data = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'));

function isAlreadyBatchQty(qty) {
    return /full batch|— full batch|per dosa|per scoop batter/i.test(String(qty || ''));
}

function needsBatchStep(rec) {
    if (rec.family === 'enchilada') return true;
    const d = (rec.desc || '').toLowerCase();
    return /batch-cook|eat all week|meal prep rotation|layered corn|casserole|divide into/i.test(d);
}

for (const [pool, recipes] of Object.entries(data.prepRecipes)) {
    for (const rec of recipes) {
        if (!rec.servingsPerBatch) rec.servingsPerBatch = DEFAULTS[pool] || 6;
        if (!rec.batchPrep) rec.batchPrep = 'perServing';

        const hasBatchLine = (rec.ingredients || []).some((i) => isAlreadyBatchQty(i.qty));
        if (rec.name === 'Homemade Dosa') {
            rec.batchPrep = 'batterBatch';
            rec.batchPrepNote =
                'Soak/grind lines are the full batter (12 dosas). Daily menu & Track = 1 scoop per dosa.';
        } else if (!hasBatchLine) {
            rec.batchPrepNote = POOL_NOTES[pool] || POOL_NOTES.mains;
        }

        const n = rec.servingsPerBatch;
        if (needsBatchStep(rec) && rec.steps && rec.steps.length) {
            const prefix = `Cook full batch (${n} servings) in one pot/dish, then divide into ${n} equal containers. `;
            if (!rec.steps[0].startsWith('Cook full batch')) {
                rec.steps[0] = prefix + rec.steps[0];
            }
        }

        if (pool === 'mains' && !hasBatchLine && rec.steps && rec.steps.length) {
            const mainsPrefix = `Batch-cook full quantity (shop list), portion into ${n} containers. `;
            const s0 = rec.steps[0];
            if (!s0.startsWith('Cook full batch') && !s0.startsWith('Batch-cook')) {
                rec.steps[0] = mainsPrefix + s0;
            }
        }
    }
}

fs.writeFileSync(RECIPES_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Normalized', Object.values(data.prepRecipes).flat().length, 'prep recipes.');

/**
 * Extracts workout static data from index.html into JSON files.
 * Run once: node tools/extract-browser-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');

const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');

function bracketDepthDelta(ch, open, close) {
  if (ch === open) return 1;
  if (ch === close) return -1;
  return 0;
}

function extractObject(name, startPattern) {
  const startIdx = lines.findIndex((l) => l.includes(startPattern));
  if (startIdx === -1) throw new Error(`Could not find ${name}`);
  let depth = 0;
  let started = false;
  const objLines = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (i === startIdx) {
      const afterEq = line.split('=').slice(1).join('=').trim();
      if (afterEq) objLines.push(afterEq);
      for (const ch of afterEq) {
        depth += bracketDepthDelta(ch, '{', '}');
        depth += bracketDepthDelta(ch, '[', ']');
        if (depth > 0) started = true;
      }
    } else {
      objLines.push(line);
      for (const ch of line) {
        depth += bracketDepthDelta(ch, '{', '}');
        depth += bracketDepthDelta(ch, '[', ']');
        if (depth > 0) started = true;
      }
    }
    if (started && depth === 0) break;
  }
  const expr = objLines.join('\n').replace(/^const\s+\w+\s*=\s*/, '').replace(/;\s*$/, '');
  return vm.runInNewContext(`(${expr})`, {}, { timeout: 5000 });
}

const workoutPlans = extractObject('workoutPlans', 'const workoutPlans = {');
const exerciseTips = extractObject('exerciseTips', 'const exerciseTips = {');
const PHASES = extractObject('PHASES', 'const PHASES = [');

fs.writeFileSync(path.join(root, 'workout-plans.json'), JSON.stringify(workoutPlans, null, 2), 'utf8');
fs.writeFileSync(path.join(root, 'exercise-tips.json'), JSON.stringify(exerciseTips, null, 2), 'utf8');
fs.writeFileSync(path.join(root, 'phases.json'), JSON.stringify(PHASES, null, 2), 'utf8');

let updated = html;
updated = updated.replace(/    const workoutPlans = \{[\s\S]*?    \};\r?\n\r?\n/, '');
updated = updated.replace(/    const exerciseTips = \{[\s\S]*?    \};\r?\n\r?\n/, '');
updated = updated.replace(/    const PHASES = \[[\s\S]*?    \];\r?\n\r?\n/, '');

const loader = `    let workoutPlans = {};
    let exerciseTips = {};
    let PHASES = [];

    async function loadWorkoutData() {
        const [plans, tips, phases] = await Promise.all([
            fetch('./workout-plans.json').then(r => { if (!r.ok) throw new Error('workout-plans.json'); return r.json(); }),
            fetch('./exercise-tips.json').then(r => { if (!r.ok) throw new Error('exercise-tips.json'); return r.json(); }),
            fetch('./phases.json').then(r => { if (!r.ok) throw new Error('phases.json'); return r.json(); }),
        ]);
        workoutPlans = plans;
        exerciseTips = tips;
        PHASES = phases;
    }

`;

updated = updated.replace(
  /    let currentSelectedDay = 'Monday';\r?\n\r?\n    \/\/ ── Workout plan templates[\s\S]*?    \/\/ Each phase has named workout blocks\. buildSchedule\(\) assigns them to days dynamically\.\r?\n/,
  loader + `    let currentSelectedDay = 'Monday';\n\n`
);

updated = updated.replace(
  /    async function init\(\) \{\r?\n        await loadRecipes\(\);/,
  '    async function init() {\n        await loadWorkoutData();\n        await loadRecipes();'
);

fs.writeFileSync(htmlPath, updated, 'utf8');

console.log('Wrote workout-plans.json, exercise-tips.json, phases.json');
console.log('Updated index.html to load workout data at runtime');

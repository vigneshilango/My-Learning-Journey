/**
 * Splits backup/index.html into www/ structure for Capacitor.
 * Run from My-Learning-Journey: node tools/split-app.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'backup', 'index.html');
const www = path.join(root, 'www');

const html = fs.readFileSync(srcPath, 'utf8');
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

// CSS: lines 9-400 (inside <style>)
const css = lines.slice(8, 400).join('\n');

// Body: lines 404-829 (inside <body>, before <script>)
const body = lines.slice(403, 829).join('\n');

// Script: lines 832-2821
let script = lines.slice(831, 2821).join('\n');

const workoutPlans = extractObject('workoutPlans', 'const workoutPlans = {');
const exerciseTips = extractObject('exerciseTips', 'const exerciseTips = {');
const PHASES = extractObject('PHASES', 'const PHASES = [');

// Remove inline data blocks from script
script = script.replace(/    const workoutPlans = \{[\s\S]*?    \};\r?\n\r?\n/, '');
script = script.replace(/    const exerciseTips = \{[\s\S]*?    \};\r?\n\r?\n/, '');
script = script.replace(/    const PHASES = \[[\s\S]*?    \];\r?\n\r?\n/, '');

const dataLoader = `    let workoutPlans = {};
    let exerciseTips = {};
    let PHASES = [];

    async function loadStaticData() {
        const [plans, tips, phases] = await Promise.all([
            fetch('./data/workout-plans.json').then(r => { if (!r.ok) throw new Error('workout-plans.json'); return r.json(); }),
            fetch('./data/exercise-tips.json').then(r => { if (!r.ok) throw new Error('exercise-tips.json'); return r.json(); }),
            fetch('./data/phases.json').then(r => { if (!r.ok) throw new Error('phases.json'); return r.json(); }),
        ]);
        workoutPlans = plans;
        exerciseTips = tips;
        PHASES = phases;
    }

`;

script = script.replace(
  /    let currentSelectedDay = 'Monday';\r?\n/,
  dataLoader + `    let currentSelectedDay = 'Monday';\n`
);

script = script.replace(
  '    async function init() {\n        await loadRecipes();',
  '    async function init() {\n        await loadStaticData();\n        await loadRecipes();'
);

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>6-Pack Challenge</title>
    <meta name="theme-color" content="#0d0d12">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

${body}

<script src="js/app.js"></script>
</body>
</html>
`;

const dirs = [
  path.join(www, 'css'),
  path.join(www, 'js'),
  path.join(www, 'data'),
];

for (const d of dirs) fs.mkdirSync(d, { recursive: true });

fs.writeFileSync(path.join(www, 'css', 'styles.css'), css, 'utf8');
fs.writeFileSync(path.join(www, 'js', 'app.js'), script, 'utf8');
fs.writeFileSync(path.join(www, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(www, 'data', 'workout-plans.json'), JSON.stringify(workoutPlans, null, 2), 'utf8');
fs.writeFileSync(path.join(www, 'data', 'exercise-tips.json'), JSON.stringify(exerciseTips, null, 2), 'utf8');
fs.writeFileSync(path.join(www, 'data', 'phases.json'), JSON.stringify(PHASES, null, 2), 'utf8');
fs.copyFileSync(path.join(root, 'recipes.json'), path.join(www, 'data', 'recipes.json'));

console.log('Created www/ structure:');
console.log('  index.html, css/styles.css, js/app.js');
console.log('  data/workout-plans.json, exercise-tips.json, phases.json, recipes.json');

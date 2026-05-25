# Backup — original browser version

These files are unchanged copies of the original single-file app:

- `index.html` — full monolithic HTML/CSS/JS (2,825 lines)
- `recipes.json` — meal database

Open `index.html` in a browser (with `recipes.json` in the parent folder) to use the classic version.

The Capacitor-ready app lives in `../www/`. Regenerate it from this backup with:

```bash
node tools/split-app.mjs
```

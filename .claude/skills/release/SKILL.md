---
description: Release a new version: bump package.json, update CHANGELOG.md, commit, tag, and push.
---

# Release Skill

Führe jeden Schritt der Reihe nach aus. Nicht überspringen.

## 1. Aktuelle Version und Änderungen ermitteln

```bash
grep '"version"' package.json
git diff --stat HEAD
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

Lies die Commits seit dem letzten Tag — daraus wird der Changelog-Eintrag.

## 2. Neue Version bestimmen

Patch-Bump (2.7.20 → 2.7.21) für Bug Fixes und kleine Features.
Minor-Bump (2.7.x → 2.8.0) für größere neue Features.
Major-Bump nur bei Breaking Changes.

## 3. `package.json` versionieren

```json
"version": "<neue-version>"
```

## 4. `CHANGELOG.md` aktualisieren

Neuen Eintrag **ganz oben** (nach der Überschrift) einfügen, im bestehenden Format:

```markdown
## [<version>] - <YYYY-MM-DD>

### ✨ New Features
- **Feature** - Beschreibung

### 🐛 Bug Fixes
- **Fix** - Beschreibung

### 🔧 Improvements
- **Improvement** - Beschreibung
```

Nur Abschnitte aufführen, die auch tatsächlich Einträge haben.

## 5. Committen

```bash
git add package.json CHANGELOG.md <alle-weiteren-geänderten-dateien>
git status  # prüfen ob alles dabei ist
git commit -m "chore: bump version to <version>

<kurze Zusammenfassung der Änderungen>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## 6. Tag setzen

```bash
git tag v<version>
```

## 7. Pushen

```bash
git push origin master && git push origin v<version>
```

## Fertig

Bestätige dem User: Commit-Hash, Tag-Name, und ob der Push erfolgreich war.

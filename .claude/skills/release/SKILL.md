---
description: Release a new version: tests, security review, version bump, CHANGELOG, commit, tag, push.
---

# Release Skill

Führe jeden Schritt der Reihe nach aus. Nicht überspringen.

## 1. Unit Tests lokal ausführen

```bash
npm run test
```

Wenn Tests fehlschlagen: abbrechen, Fehler beheben, dann neu starten. Kein Release mit roten Tests.

## 2. Lint prüfen

```bash
npm run lint
```

Lint-Fehler beheben bevor es weitergeht.

## 3. Security Review

Invoke `/security-review` für alle Änderungen seit dem letzten Tag:

```bash
git diff $(git describe --tags --abbrev=0)..HEAD
```

Kritische oder High-Severity Findings beheben bevor getaggt wird.

## 4. npm audit

```bash
npm audit --audit-level=high
```

High/Critical Vulnerabilities in Dependencies beheben oder bewusst dokumentieren.

## 5. Aktuelle Version und Änderungen ermitteln

```bash
grep '"version"' package.json
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

Commits seit letztem Tag — daraus wird der Changelog-Eintrag.

## 6. Neue Version bestimmen

- Patch-Bump (2.7.20 → 2.7.21): Bug Fixes, kleine Features, Styling
- Minor-Bump (2.7.x → 2.8.0): größere neue Features
- Major-Bump: nur bei Breaking Changes

## 7. `package.json` versionieren

```json
"version": "<neue-version>"
```

## 8. `CHANGELOG.md` aktualisieren

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

## 9. Committen

```bash
git add package.json CHANGELOG.md <alle-weiteren-geänderten-dateien>
git status  # prüfen ob alles dabei ist
git commit -m "chore: bump version to <version>

<kurze Zusammenfassung der Änderungen>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## 10. Tag setzen

```bash
git tag v<version>
```

## 11. Pushen

```bash
git push origin master && git push origin v<version>
```

GitHub Actions führt danach automatisch aus:
- Lint + Tests + npm audit + Trivy Security Scan (Gate)
- Nur bei Erfolg: Docker Build & Publish + GitHub Release + HA Addon Trigger

## Fertig

Bestätige dem User: Commit-Hash, Tag-Name, ob der Push erfolgreich war, und Link zum GitHub Actions Run.

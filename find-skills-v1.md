# Find & Upload Skills Workflow v1

Processus réutilisable pour trouver, extraire et uploader des skills GitHub.

## Étapes

### 1. Trouve
- Chercher repo GitHub (search + web_search si besoin)
- Vérifier date du dernier commit + description

### 2. Extrait
- Clone dans /tmp
- Copie SKILL.md (ou dossier skill) vers outputs

### 3. Upload
- Branche develop (jamais main)
- Path: `.claude/skills/<nom>/SKILL.md`

### 4. PR
- Titre: `feat: add <nom> skill`
- Source: `claude/upload-<nom>-xxxxx`
- Target: `develop`

### 5. Merge
- Merge direct si pas de conflit
- Sinon: review manuelle

### 6. Confirme
- Skill actif dans develop
- Prêt à l'emploi

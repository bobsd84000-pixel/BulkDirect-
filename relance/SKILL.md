# design-audit-landing

Audit rapide de landing pages avant mise en production. Vérifie design, accessibilité et performance sans dépendances externes.

## Usage

- "audit cette landing" ou "vérifie la landing" pour invoquer
- Idéal pour: landing pages HTML statiques, pages de conversion, pré-déploiement Vercel/Netlify
- À éviter pour: applications complexes avec state management, SPA React/Vue

## Checklist d'audit

### Design
- [ ] Hiérarchie typographique claire (max 3 tailles de police par section)
- [ ] Contraste texte/fond ≥ 4.5:1 (WCAG AA)
- [ ] Palette limitée à 2-3 couleurs principales + neutres
- [ ] Espacement cohérent (grille 8px)
- [ ] CTA visuellement dominant, un seul call-to-action principal par section

### Accessibilité
- [ ] `lang` défini sur `<html>`
- [ ] `alt` sur toutes les images
- [ ] Focus visible au clavier sur boutons et liens
- [ ] Taille de texte minimale 14px, boutons tactiles ≥ 44px

### Responsive & Mobile
- [ ] `viewport-fit=cover` si safe areas iOS nécessaires
- [ ] `env(safe-area-inset-*)` appliqué sur header/footer si contenu collé aux bords
- [ ] Test à 375px, 768px, 1440px minimum
- [ ] Pas de scroll horizontal involontaire

### Performance
- [ ] Polices chargées via `preconnect` + `display=swap`
- [ ] Pas de JS bloquant le rendu
- [ ] CSS inline pour page unique (évite requête réseau supplémentaire)
- [ ] Images optimisées ou absentes si non essentielles

### Dark/Light mode (si applicable)
- [ ] Variables CSS (`:root`) pour toutes les couleurs
- [ ] Respect de `prefers-color-scheme` par défaut
- [ ] Toggle manuel persisté (`localStorage`)
- [ ] Contraste vérifié dans les deux thèmes

## Sortie attendue

Un rapport court : liste des points validés, liste des points à corriger avec la ligne de code concernée, rien de plus.

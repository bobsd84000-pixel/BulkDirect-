# LUMIK + Gemini Vision — Product Describer

Génère automatiquement descriptions 50 mots pour tes 214 produits avec Gemini Vision API (gratuit).

---

## Setup

### 1. Récupère API Key Gemini

**Gratuit, email seul:**
1. Ouvre → https://aistudio.google.com/app/apikey
2. **Create API key** → Google Cloud Gemini API
3. **Copy key** → commence par `AIza...`

### 2. Ajoute env var Vercel

Dashboard Vercel → `lumik-shop-omega` (ou slug) → Settings → Environment Variables

```
GOOGLE_API_KEY = AIza... (ta clé au-dessus)
```

### 3. Installe dépendances (si absent)

```bash
npm install csv-parse csv-stringify
```

### 4. Prépare CSV input

**Format attendu:** `public/data/products.csv`

```csv
product_name,image_url,category,price
Assiette Urushi,https://drive.google.com/uc?id=1a2b3c4d5e,Ceramique,45
Bol Zen,https://drive.google.com/uc?id=2f3g4h5i6,Ceramique,32
...
```

**Colonnes reconnues:**
- `product_name` ou `name` ou `productName`
- `image_url` ou `image_drive_url`
- Autres: passsthrough inchangées

---

## Lancer le describer

### Locale (dev)

```bash
export GOOGLE_API_KEY=AIza...
node scripts/gemini-describer.js public/data/products.csv
```

**Output:** `public/data/products-enriched.csv`

### CI/CD (Vercel)

Crée `.github/workflows/lumik-describer.yml`:

```yaml
name: LUMIK Gemini Describer

on:
  workflow_dispatch:  # Manuel depuis GitHub Actions

jobs:
  describe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: node scripts/gemini-describer.js public/data/products.csv
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
      - uses: EndBug/add-and-commit@v9
        with:
          add: 'public/data/products-enriched.csv'
          message: 'chore: regenerate product descriptions'
```

Puis: GitHub Actions → LUMIK Gemini Describer → Run workflow → Commit auto.

---

## Utiliser les descriptions

### Landing page

```javascript
// src/components/ProductCatalog.jsx

import { useEffect, useState } from 'react';

export function ProductCatalog() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/data/products-enriched.csv')
      .then(r => r.text())
      .then(text => {
        // Parse CSV simple
        const lines = text.split('\n').slice(1);
        const parsed = lines.map(line => {
          const [name, image, category, price, description] = line.split(',');
          return { name, image, category, price, description };
        });
        setProducts(parsed);
      });
  }, []);

  return (
    <div className="products-grid">
      {products.map((p) => (
        <div key={p.name} className="product-card">
          <img src={p.image} alt={p.name} />
          <h3>{p.name}</h3>
          <p className="description">{p.description}</p>
          <span className="price">{p.price}€</span>
        </div>
      ))}
    </div>
  );
}
```

### CSS (LUMIK tokens)

```css
.product-card {
  background: var(--washi);  /* #F4F1E9 */
  border: 2px solid var(--urushi);  /* #8B6B47 */
  font-family: 'Shippori Mincho', serif;
}

.product-card h3 {
  color: var(--shu);  /* #C0392B */
  font-weight: 400;
  letter-spacing: 0.05em;
}

.product-card .description {
  color: #4a4a4a;
  font-size: 0.95rem;
  line-height: 1.6;
  min-height: 3.5em;  /* 2-3 lignes)
}
```

---

## Rate Limits & Coûts

| Provider | Free Tier | Cost |
|----------|-----------|------|
| **Gemini 2.0 Flash** | 60 req/min | $0 (forever) |
| LUMIK 214 produits | ~7 min total | $0 |

**Script delay:** 2s entre appels → respecte 30 req/min (safe margin).

---

## Troubleshooting

### "GOOGLE_API_KEY manquant"

```bash
export GOOGLE_API_KEY=AIza...
node scripts/gemini-describer.js
```

### "Image URL not accessible"

Gemini a besoin URL publique. Si Drive privée:
- Partage le dossier → Anyone with link can view
- Utilisé les URLs partagées (`https://drive.google.com/uc?id=...`)

### "CSV parse error"

Check colonnes: doit être `product_name`, `image_url`, etc. (lowercase + underscore).

### Rate limit (429)

Script attend 2s entre appels. Si ça persiste:
```javascript
await new Promise((res) => setTimeout(res, 3000)); // 3s au lieu de 2s
```

---

## Next Steps

1. **Test local** → 5 produits seulement d'abord
2. **Review descriptions** → QA qualité avant deploy
3. **Upload enriched CSV** → prod
4. **Deploy landing page** → fetch `products-enriched.csv`

---

**Fichier:** `scripts/gemini-describer.js`  
**Dépendance:** `csv-parse`, `csv-stringify` (npm install)  
**Env var:** `GOOGLE_API_KEY` (Vercel Settings)  
**Output:** `public/data/products-enriched.csv`

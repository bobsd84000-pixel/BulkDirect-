#!/usr/bin/env node

/**
 * LUMIK Gemini Product Describer
 * Lit CSV 214 produits + images Drive → Gemini Vision → descriptions 50 mots
 * Style: minimaliste artisanal, palette LUMIK (--urushi, --shu, --washi)
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/v1';

if (!GEMINI_API_KEY) {
  console.error('❌ GOOGLE_API_KEY manquant. Set env: export GOOGLE_API_KEY=AIza...');
  process.exit(1);
}

/**
 * Appel Gemini Vision API (OpenAI-compatible)
 */
async function describeProductImage(productName, imageUrl) {
  try {
    const response = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Tu es copywriter artisanal LUMIK. Produit: "${productName}". 
                
Vois cette image et décris le produit en exactement 50 mots. Style: minimaliste, poétique, français. 
Pas d'emojis, pas de markdown. Juste le texte brut.

Exemple: "Assiette céramique faite main, glaçure urushi rouge profond. Chaque courbe épouse la paume. Tir unique à 1200°C. Quotidien sacré."

Décris:`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error(`  ⚠️  ${productName} — API error:`, err?.error?.message || response.statusText);
      return null;
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || null;

    // Trim à 50 mots exactement
    const words = description.split(/\s+/).slice(0, 50);
    return words.join(' ');
  } catch (err) {
    console.error(`  ⚠️  ${productName} — Network error:`, err.message);
    return null;
  }
}

/**
 * Lit CSV input
 */
function readProductsCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
}

/**
 * Écrit CSV enrichi
 */
function writeEnrichedCSV(filePath, records) {
  const output = stringify(records, {
    header: true,
    columns: Object.keys(records[0] || {}),
  });
  fs.writeFileSync(filePath, output);
}

/**
 * Main
 */
async function main() {
  const inputCsv = process.argv[2] || './public/data/products.csv';
  const outputCsv = inputCsv.replace('.csv', '-enriched.csv');

  if (!fs.existsSync(inputCsv)) {
    console.error(`❌ Fichier pas trouvé: ${inputCsv}`);
    process.exit(1);
  }

  console.log(`📖 Lis CSV: ${inputCsv}`);
  const products = readProductsCSV(inputCsv);
  console.log(`✅ ${products.length} produits trouvés.\n`);

  const enriched = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const { name, product_name, image_url, image_drive_url, productName } = product;
    const prodName = name || product_name || productName;
    const imageUrl = image_url || image_drive_url;

    if (!imageUrl) {
      console.log(`⏭️  [${i + 1}/${products.length}] ${prodName} — pas d'URL image, skip.`);
      enriched.push(product);
      continue;
    }

    process.stdout.write(`🎨 [${i + 1}/${products.length}] ${prodName}... `);

    const description = await describeProductImage(prodName, imageUrl);

    if (description) {
      console.log(`✅ (${description.split(/\s+/).length} mots)`);
      enriched.push({
        ...product,
        product_description: description,
      });
    } else {
      console.log(`⚠️  skip (erreur API)`);
      enriched.push(product);
    }

    // Rate limit: 30 req/min Gemini free = 2 sec par request
    await new Promise((res) => setTimeout(res, 2000));
  }

  console.log(`\n💾 Écrit: ${outputCsv}`);
  writeEnrichedCSV(outputCsv, enriched);
  console.log(`✅ Fait.`);
}

main().catch(console.error);

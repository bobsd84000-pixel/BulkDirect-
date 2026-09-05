/**
 * API Route: /api/describe-products
 * Vercel Serverless Function
 * 
 * Lire CSV produits → Gemini Vision → descriptions enrichies
 * 
 * Usage:
 * GET /api/describe-products?start=0&limit=20  (batch processing)
 * POST /api/describe-products { "products": [...] }
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/v1';

// Timeout Vercel: 60 sec max. On traite par batch.
const MAX_BATCH_SIZE = 10; // ~20 sec pour 10 produits

/**
 * Décrit un produit via Gemini Vision
 */
async function describeProduct(productName, imageUrl) {
  if (!imageUrl) return null;

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

Décris:`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error(`[${productName}] API error:`, err?.error?.message);
      return null;
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || null;

    if (!description) return null;

    // Trim à 50 mots
    const words = description.split(/\s+/).slice(0, 50);
    return words.join(' ');
  } catch (err) {
    console.error(`[${productName}] Error:`, err.message);
    return null;
  }
}

/**
 * Lit CSV local (ou depuis Drive si utilisé)
 */
function readProductsCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
    });
  } catch (err) {
    console.error('CSV read error:', err.message);
    return [];
  }
}

/**
 * Main Handler
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_API_KEY not set' });
  }

  // GET /api/describe-products?start=0&limit=10
  if (req.method === 'GET') {
    const { start = '0', limit = '10' } = req.query;
    const startIdx = parseInt(start);
    const limitCount = parseInt(limit);

    const csvPath = path.join(process.cwd(), 'public', 'data', 'products.csv');
    const products = readProductsCSV(csvPath);

    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found in CSV' });
    }

    const batch = products.slice(startIdx, startIdx + limitCount);
    const results = [];

    console.log(`[Batch] Processing ${batch.length} products (${startIdx}-${startIdx + batch.length})`);

    for (const product of batch) {
      const { name, product_name, image_url, image_drive_url } = product;
      const prodName = name || product_name;
      const imageUrl = image_url || image_drive_url;

      if (!imageUrl) {
        results.push({ ...product, product_description: null });
        continue;
      }

      console.log(`  → ${prodName}`);
      const description = await describeProduct(prodName, imageUrl);

      results.push({
        ...product,
        product_description: description,
      });

      // Rate limit: 2 sec entre appels
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return res.status(200).json({
      success: true,
      batch: { start: startIdx, limit: limitCount, total: products.length },
      results,
    });
  }

  // POST /api/describe-products { products: [...] }
  if (req.method === 'POST') {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'products must be an array' });
    }

    const batch = products.slice(0, MAX_BATCH_SIZE);
    const results = [];

    console.log(`[POST Batch] Processing ${batch.length} products`);

    for (const product of batch) {
      const { name, image_url } = product;

      if (!image_url) {
        results.push({ ...product, product_description: null });
        continue;
      }

      console.log(`  → ${name}`);
      const description = await describeProduct(name, image_url);
      results.push({ ...product, product_description: description });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return res.status(200).json({
      success: true,
      batch_size: batch.length,
      results,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

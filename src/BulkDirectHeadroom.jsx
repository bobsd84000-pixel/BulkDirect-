import React, { useState } from 'react';
import { Activity, Target, Zap, TrendingUp, CheckCircle, Users, Globe } from 'lucide-react';

export default function BulkDirectLanding() {
  const [niche, setNiche] = useState('');
  const [category, setCategory] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierError, setSupplierError] = useState('');

  const bulkDirectResults = [
    {
      author: 'supplier_hunt_2024',
      category: 'demande_fournisseur',
      confidence: 92,
      painPoints: ['Retards de livraison ±2 semaines', 'Recherche 500+ unités/mois', 'Problèmes de qualité']
    },
    {
      author: 'manufacturing_lead',
      category: 'probleme_qualite',
      confidence: 78,
      painPoints: ['Respect SLA ±3 jours', 'Budget: 2K-5K€/commande', 'Changement de fournisseur']
    }
  ];

  const getCachedSuppliers = (cat) => {
    const cached = localStorage.getItem(`suppliers_${cat}`);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > 30 * 60 * 1000) return null; // 30 min expiry
    return data;
  };

  const setCachedSuppliers = (cat, data) => {
    localStorage.setItem(`suppliers_${cat}`, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const fetchSuppliers = async (cat) => {
    const cached = getCachedSuppliers(cat);
    if (cached) {
      setSuppliers(cached);
      return;
    }

    setLoadingSuppliers(true);
    setSupplierError('');
    try {
      const res = await fetch(`/api/suppliers?category=${encodeURIComponent(cat)}&limit=10`);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setSupplierError(`Aucun fournisseur trouvé pour "${cat}". Essayez une autre catégorie.`);
        setSuppliers([]);
      } else {
        setCachedSuppliers(cat, data);
        setSuppliers(data);
      }
    } catch (err) {
      setSupplierError('Erreur lors du chargement des fournisseurs');
      console.error(err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleStartScout = async () => {
    setShowResults(!showResults);
    if (!showResults && category) {
      await fetchSuppliers(category);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900/20 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-blue-800/30 backdrop-blur-md sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">BULKDIRECT</h1>
            <span className="text-xs bg-blue-400/20 text-blue-300 px-2.5 py-1 rounded font-mono">agent scout</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="mb-12">
          <p className="text-slate-300 text-lg">Agent Scout Reddit — Swarm 4-agents pour génération de leads B2B avec routage intelligent de providers</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Control Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-blue-800/30 rounded-xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Activity className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold">Contrôle Agent Scout</h2>
              </div>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="text-sm text-slate-300 block mb-2 font-medium">Niche Reddit</label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="ex: entrepreneur, business, ecommerce"
                    className="w-full bg-slate-700/30 border border-slate-600/50 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500/50 transition"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300 block mb-2 font-medium">Catégorie produit (optionnel)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="ex: electronics, textiles, machinery"
                    className="w-full bg-slate-700/30 border border-slate-600/50 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500/50 transition"
                  />
                </div>

                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                  <p className="text-sm font-semibold text-blue-300 mb-2">Posts en attente (2)</p>
                  <div className="space-y-2 text-sm">
                    <div className="text-slate-300">• Cherche fournisseur fiable pour commandes en masse</div>
                    <div className="text-slate-300">• Problème qualité avec fournisseur actuel</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartScout}
                disabled={loadingSuppliers}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {loadingSuppliers ? 'Chargement...' : showResults ? 'Masquer résultats' : 'Démarrer cycle Scout'}
              </button>

              <p className="text-xs text-slate-400 mt-4 text-center bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20">
                Utilise Mistral (gratuit) — Fallback auto vers Anthropic si limite atteinte
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-6 hover:border-blue-400/50 transition">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-semibold text-slate-300 uppercase">Leads trouvés</p>
              </div>
              <p className="text-4xl font-bold text-blue-300">{showResults ? 2 : 0}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-6 hover:border-green-400/50 transition">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs font-semibold text-slate-300 uppercase">Haute confiance (≥80%)</p>
              </div>
              <p className="text-4xl font-bold text-green-300">{showResults ? 1 : 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-semibold text-slate-300 uppercase">Économies</p>
              </div>
              <p className="text-3xl font-bold text-purple-300">{showResults ? '16€' : '0€'}</p>
            </div>
          </div>
        </div>

        {/* Scout Results */}
        {showResults && (
          <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-blue-800/30 rounded-xl p-8 mb-8 shadow-2xl animate-in fade-in">
            <h3 className="text-lg font-semibold mb-4">Résultats Scout</h3>
            <div className="space-y-4">
              {bulkDirectResults.map((r, i) => (
                <div key={i} className="bg-slate-700/30 border border-slate-600/50 p-6 rounded-lg hover:border-blue-500/30 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-blue-300 text-lg">{r.author}</p>
                      <p className="text-sm text-slate-400 mt-1 capitalize">{r.category.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg font-semibold border border-blue-500/50">
                        {r.confidence}%
                      </div>
                      <p className="text-xs text-slate-500 mt-2 font-mono">via mistral</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-600/30">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Points de friction extraits</p>
                    <div className="space-y-2">
                      {r.painPoints.map((p, j) => (
                        <div key={j} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-blue-400 font-bold">→</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suppliers Grid */}
        {showResults && category && (
          <div className="mb-8">
            {supplierError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-4 text-red-300">
                {supplierError}
              </div>
            )}

            {suppliers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Fournisseurs - {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.map((s, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-md border border-blue-500/20 rounded-xl p-6 hover:border-blue-400/50 transition transform hover:scale-105 shadow-lg"
                      style={{
                        animation: `slideUp 0.5s ease-out ${i * 50}ms both`
                      }}
                    >
                      <div className="mb-4">
                        <p className="font-bold text-blue-300 text-base">{s.name}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                          <Globe className="w-3 h-3" />
                          {s.country}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">MOQ</p>
                          <p className="text-blue-300 font-semibold">{s.moq || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Délai</p>
                          <p className="text-green-300">{s.lead_days || '—'} jours</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Marge</p>
                          <p className="text-amber-300">{s.margin ? `${s.margin}%` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Fiabilité</p>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, j) => (
                              <span
                                key={j}
                                className={j < Math.round((s.reliability_score || 0) / 20) ? 'text-yellow-400' : 'text-slate-600'}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button className="w-full mt-4 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400/50 text-blue-300 py-2 rounded-lg transition text-sm font-medium">
                        Contacter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingSuppliers && (
              <div className="text-center py-8 text-slate-400">Chargement des fournisseurs...</div>
            )}
          </div>
        )}

        {/* 4-Agent Swarm Pipeline */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-blue-800/30 rounded-xl p-8 mb-8">
          <h3 className="text-lg font-semibold mb-6">Pipeline Swarm 4-Agents</h3>
          <div className="bg-slate-700/30 p-6 rounded-lg border border-slate-600/50 font-mono text-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500/30 rounded flex items-center justify-center text-xs font-bold text-blue-300">1</div>
              <span className="text-blue-300 font-semibold">Agent Scout</span>
              <span className="text-slate-500 ml-auto">Posts Reddit → leads bruts</span>
            </div>
            <div className="ml-6 text-slate-400 text-xs">↓ Mistral (50/min gratuit) | Fallback: Anthropic</div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500/30 rounded flex items-center justify-center text-xs font-bold text-green-300">2</div>
              <span className="text-green-300 font-semibold">Agent Analyseur</span>
              <span className="text-slate-500 ml-auto">Extraction intentions & scoring</span>
            </div>
            <div className="ml-6 text-slate-400 text-xs">↓ Analyse métrique confiance</div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-purple-500/30 rounded flex items-center justify-center text-xs font-bold text-purple-300">3</div>
              <span className="text-purple-300 font-semibold">Agent Filtre</span>
              <span className="text-slate-500 ml-auto">Portes qualité (≥75%)</span>
            </div>
            <div className="ml-6 text-slate-400 text-xs">↓ Seuls leads qualifiés passent</div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-500/30 rounded flex items-center justify-center text-xs font-bold text-amber-300">4</div>
              <span className="text-amber-300 font-semibold">Agent Export</span>
              <span className="text-slate-500 ml-auto">Sync CRM & notification</span>
            </div>
          </div>
        </div>

        {/* Provider Fallback Strategy */}
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-6 mb-8">
          <div className="flex gap-3 mb-4">
            <Zap className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <h3 className="font-semibold text-blue-300">Routage Intelligent des Providers</h3>
          </div>
          <div className="bg-slate-800/30 p-4 rounded text-sm space-y-2 font-mono text-slate-300 mb-4">
            <p>Scout utilise: <span className="text-purple-300">Mistral (gratuit)</span> → <span className="text-amber-300">Anthropic (fallback)</span></p>
            <p className="text-slate-400">Mistral: 50 appels/min gratuit ✅</p>
            <p className="text-slate-400">Si limite atteinte → Anthropic (circuit ouvre 60s)</p>
          </div>
          <p className="text-sm text-blue-200">
            Résultat: <strong>95% utilisation tier gratuit</strong>, fallback uniquement si nécessaire. Zéro temps d'arrêt.
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Mistral</p>
            <p className="text-2xl font-bold text-green-300">0€</p>
            <p className="text-xs text-slate-500 mt-1">/mois</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Fallback</p>
            <p className="text-2xl font-bold text-amber-300">~8€</p>
            <p className="text-xs text-slate-500 mt-1">/mois (si nécessaire)</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">vs Anthropic direct</p>
            <p className="text-2xl font-bold text-red-300">95%</p>
            <p className="text-xs text-slate-500 mt-1">d'économies</p>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { Activity, Target, Zap, TrendingUp, CheckCircle, Upload, Filter } from 'lucide-react';

export default function BulkDirectLandingV2() {
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  const validateLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: [
            { author: 'supplier_hunt_2024', category: 'demande_fournisseur', confidence: 92, painPoints: ['Retards', 'Volume'] },
            { author: 'manufacturing_lead', category: 'probleme_qualite', confidence: 78, painPoints: ['SLA', 'Budget'] }
          ]
        })
      });
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Validation error:', error);
    }
    setLoading(false);
  };

  const fetchSuppliers = async (category = '') => {
    setLoading(true);
    try {
      const params = category ? `?category=${category}` : '';
      const response = await fetch(`/api/suppliers${params}`);
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Supplier fetch error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900/20 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-blue-800/30 backdrop-blur-md sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">BULKDIRECT V2</h1>
              <span className="text-xs bg-blue-400/20 text-blue-300 px-2.5 py-1 rounded font-mono">leads + suppliers</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="mb-12">
          <p className="text-slate-300 text-lg">Validation de leads + routage intelligent de suppliers avec endpoints API</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-blue-800/30">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-3 font-semibold transition ${activeTab === 'leads' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Validate Leads
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-3 font-semibold transition ${activeTab === 'suppliers' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            Find Suppliers
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-blue-800/30 rounded-xl p-8 shadow-2xl">
              {activeTab === 'leads' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Validate Reddit Leads</h2>
                  <button
                    onClick={validateLeads}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-6 py-3 rounded-lg font-semibold transition mb-6"
                  >
                    {loading ? 'Validating...' : '▶ Validate Leads'}
                  </button>
                  <div className="space-y-4">
                    {leads.map((lead, idx) => (
                      <div key={idx} className="bg-slate-700/50 border border-blue-700/30 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">{lead.author}</span>
                          <span className={`px-2 py-1 rounded text-sm ${lead.isValid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {lead.isValid ? '✓ Valid' : '✗ Invalid'} ({Math.round(lead.score)} pts)
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm">{lead.category}</p>
                      </div>
                    ))}
                    {leads.length === 0 && (
                      <p className="text-slate-400">Aucun lead validé. Cliquez sur "Validate Leads" pour commencer.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'suppliers' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Find Suppliers</h2>
                  <button
                    onClick={() => fetchSuppliers()}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-6 py-3 rounded-lg font-semibold transition mb-6"
                  >
                    {loading ? 'Loading...' : '🔍 Fetch Suppliers'}
                  </button>
                  <div className="space-y-4">
                    {suppliers.map((sup) => (
                      <div key={sup.id} className="bg-slate-700/50 border border-blue-700/30 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">{sup.name}</span>
                          <span className="text-yellow-400">★ {sup.rating}</span>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{sup.category} • Min {sup.minOrder} units • {sup.leadTime}</p>
                        <span className={`text-xs px-2 py-1 rounded ${sup.verified ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                          {sup.verified ? '✓ Verified' : 'Unverified'}
                        </span>
                      </div>
                    ))}
                    {suppliers.length === 0 && (
                      <p className="text-slate-400">Aucun supplier. Cliquez sur "Fetch Suppliers" pour commencer.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-blue-800/30 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                API Endpoints
              </h3>
              <div className="space-y-3 text-sm text-slate-300">
                <div>
                  <p className="font-mono bg-slate-700/50 p-2 rounded">POST /api/validate</p>
                  <p className="text-xs mt-1">Valide les leads Reddit</p>
                </div>
                <div>
                  <p className="font-mono bg-slate-700/50 p-2 rounded">GET /api/suppliers</p>
                  <p className="text-xs mt-1">Liste les fournisseurs</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-blue-800/30 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Leads Validated:</span>
                  <span className="text-green-400">{leads.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Suppliers Found:</span>
                  <span className="text-green-400">{suppliers.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const mockSuppliers = [
  { name: 'TechSource Asia', country: 'China', moq: '100 units', lead_days: 14, margin: 35, reliability_score: 92, search_score: 0.95 },
  { name: 'EuroManufacture GmbH', country: 'Germany', moq: '50 units', lead_days: 10, margin: 42, reliability_score: 98, search_score: 0.89 },
  { name: 'Global Trade Partners', country: 'India', moq: '200 units', lead_days: 21, margin: 28, reliability_score: 85, search_score: 0.82 },
  { name: 'Nordic Supply Co', country: 'Sweden', moq: '30 units', lead_days: 8, margin: 48, reliability_score: 96, search_score: 0.88 },
  { name: 'Pacific Traders Ltd', country: 'Vietnam', moq: '150 units', lead_days: 16, margin: 32, reliability_score: 88, search_score: 0.80 }
];

function apiMockPlugin() {
  return {
    name: 'api-mock',
    configureServer(server) {
      return () => {
        server.middlewares.use('/api/suppliers', (req, res, next) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const limit = parseInt(url.searchParams.get('limit') || '10');
          const sorted = [...mockSuppliers].sort((a, b) => b.search_score - a.search_score).slice(0, limit);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sorted));
        });
      };
    }
  };
}

export default defineConfig({
  plugins: [react(), apiMockPlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

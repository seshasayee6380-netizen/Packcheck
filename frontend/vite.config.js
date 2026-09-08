import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

async function readPassport(id) {
  const response = await fetch(`http://127.0.0.1:8000/api/passports/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!response.ok || !data?.passport_id) {
    throw new Error(data?.detail || `Registry returned HTTP ${response.status}`)
  }
  return data
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function passportHtml(data) {
  const payload = data.payload || {}
  const declarations = payload.declarations || {}
  const labels = {
    product_name:'Product / common name', manufacturer:'Manufacturer', packer:'Packer', importer:'Importer',
    address:'Address', net_quantity:'Net quantity', mrp:'MRP', packed_date:'Packing / manufacture date',
    best_before:'Best before / use by', batch_number:'Batch / lot number', consumer_care:'Consumer care',
    consumer_phone:'Consumer care phone', consumer_email:'Consumer care email', country_of_origin:'Country of origin',
    unit_sale_price:'Unit sale price', gtin:'GTIN / identifier'
  }
  const visible = Object.entries(declarations).filter(([k,v]) => v != null && String(v).trim() && String(v).trim() !== 'Not detected')
  const declHtml = visible.length ? visible.map(([k,v]) => `<div class="decl"><div><span>${escapeHtml(labels[k] || k.replaceAll('_',' '))}</span><b>${escapeHtml(v)}</b></div><i>✓</i></div>`).join('') : '<div class="empty">No declaration snapshot is stored in this passport record.</div>'
  const evidenceCount = Array.isArray(payload.evidence_chain) ? payload.evidence_chain.length : 0
  const score = payload.verification?.score ?? '—'
  const created = data.created_at ? new Date(data.created_at).toLocaleString() : '—'
  const valid = Boolean(data.signature_valid)
  const badge = valid ? '<span class="badge ok">✓ VERIFIED</span>' : '<span class="badge bad">✕ UNVERIFIED</span>'
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(data.product_name || 'Product Passport')} · PackCheck</title><style>
  :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#16324f;background:#eef4f8}*{box-sizing:border-box}body{margin:0}.shell{min-height:100vh;padding:22px;background:radial-gradient(circle at top right,#e8f4ff 0,#f6f9fc 42%,#eef3f7 100%)}.wrap{max-width:940px;margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}.brand{display:flex;gap:10px;align-items:center}.mark{width:38px;height:38px;border-radius:12px;background:#1f6fb5;color:#fff;display:grid;place-items:center;font-weight:900}.brand b{display:block;font-size:16px}.brand span{display:block;color:#71869a;font-size:11px;margin-top:2px}.live{font-size:10px;font-weight:900;color:#21824a;background:#eaf8ef;border:1px solid #cde8d7;padding:8px 10px;border-radius:999px}.hero{background:#fff;border:1px solid #dce7ef;border-radius:22px;padding:24px;display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;box-shadow:0 14px 35px rgba(29,61,87,.08)}.hero-icon{width:60px;height:60px;border-radius:18px;display:grid;place-items:center;background:#eaf8ef;color:#238349;font-size:30px}.eyebrow{font-size:9px;letter-spacing:.12em;color:#71879b;font-weight:900;text-transform:uppercase}.hero h1{margin:7px 0 5px;font-size:30px;letter-spacing:-.04em}.hero p{margin:0;color:#687d90;font-size:12px;line-height:1.5}.badge{padding:9px 11px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}.badge.ok{background:#eaf8ef;color:#21824a;border:1px solid #cde8d7}.badge.bad{background:#fff0ef;color:#b63c37;border:1px solid #efd0cd}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-top:14px}.card{background:#fff;border:1px solid #dfe8ef;border-radius:18px;padding:20px;box-shadow:0 10px 26px rgba(29,61,87,.05)}.card h2{margin:6px 0 4px;font-size:22px}.id{font:9px ui-monospace,SFMono-Regular,Menlo,monospace;color:#7a8c9d;word-break:break-all}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:15px}.meta div{border:1px solid #e6edf3;background:#fbfcfe;border-radius:11px;padding:10px}.meta span,.meta b{display:block}.meta span{font-size:7px;color:#8796a4;text-transform:uppercase;letter-spacing:.08em}.meta b{font-size:9px;margin-top:4px}.decls{display:grid;gap:8px;margin-top:12px}.decl{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid #e6edf3;border-radius:11px;padding:10px 11px;background:#fbfcfe}.decl span{display:block;font-size:7px;color:#8393a2;text-transform:uppercase;letter-spacing:.06em}.decl b{display:block;font-size:9px;margin-top:4px;word-break:break-word}.decl i{font-style:normal;width:22px;height:22px;border-radius:50%;background:#eaf8ef;color:#238349;display:grid;place-items:center;font-weight:900}.verify{display:grid;gap:9px;margin-top:13px}.verify .row{display:flex;gap:9px;align-items:flex-start;border:1px solid #e6edf3;border-radius:11px;padding:11px;background:#fbfcfe}.verify .tick{width:22px;height:22px;border-radius:50%;background:#eaf8ef;color:#238349;display:grid;place-items:center;font-weight:900;flex:none}.verify b,.verify span{display:block}.verify b{font-size:9px}.verify span{font-size:8px;color:#708497;margin-top:3px;line-height:1.4}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.actions a{display:inline-flex;text-decoration:none;border:1px solid #d6e2eb;border-radius:10px;padding:10px 12px;color:#2d5e86;background:#fff;font-size:9px;font-weight:900}.footer{text-align:center;margin:16px 0 6px;color:#8999a8;font-size:8px}.note{margin-top:12px;font-size:9px;color:#6d8193;line-height:1.5;background:#f4f8fb;border:1px solid #dce8f1;border-radius:12px;padding:11px}.empty{font-size:9px;color:#77899a;padding:12px;background:#fbfcfe;border:1px dashed #d7e3ec;border-radius:10px}@media(max-width:760px){.shell{padding:14px}.top{align-items:flex-start}.hero{grid-template-columns:auto 1fr;padding:18px}.badge{grid-column:1/-1;justify-self:start}.grid{grid-template-columns:1fr}.meta{grid-template-columns:1fr}.hero h1{font-size:24px}.card{padding:16px}}
  </style></head><body><div class="shell"><div class="wrap"><div class="top"><div class="brand"><div class="mark">✓</div><div><b>PackCheck AI</b><span>Verified Product Passport</span></div></div><div class="live">LIVE REGISTRY</div></div><section class="hero"><div class="hero-icon">✓</div><div><div class="eyebrow">DIGITAL PRODUCT PASSPORT</div><h1>${escapeHtml(data.product_name || 'Verified product')}</h1><p>${valid ? 'The signed registry record matches this passport.' : 'The registry signature could not be validated.'}</p></div>${badge}</section><div class="grid"><article class="card"><div class="eyebrow">PRODUCT INFORMATION</div><h2>${escapeHtml(data.product_name || 'Verified product')}</h2><div class="id">${escapeHtml(data.passport_id)}</div><div class="meta"><div><span>Passport ID</span><b>${escapeHtml(data.passport_id)}</b></div><div><span>Status</span><b>${escapeHtml(data.status)}</b></div><div><span>Regulation</span><b>${escapeHtml(payload.rule_version || 'Not specified')}</b></div><div><span>Verification score</span><b>${escapeHtml(score)}/100</b></div><div><span>Verified at</span><b>${escapeHtml(created)}</b></div><div><span>GTIN</span><b>${escapeHtml(data.gtin || 'Not detected')}</b></div></div><div class="note">This passport represents a verified registry record. It does not by itself prove physical authenticity of every unit carrying a copied QR.</div></article><article class="card"><div class="eyebrow">VERIFIED DECLARATIONS</div><div class="decls">${declHtml}</div></article></div><section class="card" style="margin-top:14px"><div class="eyebrow">REGULATORY VERIFICATION</div><div class="verify"><div class="row"><div class="tick">✓</div><div><b>Registry record valid</b><span>Passport ID resolves to the central registry.</span></div></div><div class="row"><div class="tick">${valid?'✓':'!'}</div><div><b>${valid?'Signature valid':'Signature requires review'}</b><span>${valid?'The signed passport payload passed HMAC verification.':'The registry signature did not validate.'}</span></div></div><div class="row"><div class="tick">✓</div><div><b>Evidence linked</b><span>${evidenceCount} evidence-chain step${evidenceCount===1?'':'s'} linked to the inspection.</span></div></div></div><div class="actions"><a href="/">Open PackCheck</a><a href="${escapeHtml(data.registry_url || '#')}">View registry record</a></div></section><div class="footer">PackCheck AI · AI-assisted Legal Metrology screening · Prototype verification page</div></div></div></body></html>`
}

function publicPassportMiddleware() {
  return {
    name: 'packcheck-public-passport',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/passport\/([^/?#]+)\/?(?:\?.*)?$/)
        if (!match) return next()
        try {
          const data = await readPassport(match[1])
          const html = passportHtml(data)
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(html)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(`<html><body style="font-family:system-ui;padding:40px"><h1>Passport verification unavailable</h1><p>${escapeHtml(error.message || 'Registry unavailable')}</p><p>Start the PackCheck backend on port 8000 and retry.</p></body></html>`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [publicPassportMiddleware(), react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/demo': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/reports': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})

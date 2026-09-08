import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createWorker } from 'tesseract.js'
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Camera, CheckCircle2, ChevronDown,
  Receipt, QrCode, Send, MapPin, Clock, ExternalLink, ShieldAlert, BadgeCheck, FilePlus2, IndianRupee, PackageCheck, Scale, UserCheck, SearchCheck, ListPlus, Store, Globe2, Hash,
  ChevronRight, ClipboardCheck, CloudUpload, Download, FileDown, FileText, Filter,
  History, Image as ImageIcon, Info, ListChecks, Menu, RefreshCw, Search, Settings,
  ShieldCheck, Smartphone, Trash2, Upload, UserRound, X, Zap, Database, WifiOff, Link2, Layers, GitBranch, ScanLine, CloudOff, FileCheck2, LogIn, LockKeyhole
} from 'lucide-react'
import './styles.css'

const API = import.meta.env.VITE_API_URL || '/api'
const parseResponse = async (response) => {
  const raw = await response.text()
  if (!raw.trim()) {
    return { detail: response.ok ? 'The server returned an empty response.' : `Server returned HTTP ${response.status}.` }
  }
  try { return JSON.parse(raw) }
  catch { return { detail: raw.slice(0, 220) || `Server returned HTTP ${response.status}.` } }
}
const assetUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}

const fieldLabels = {
  product_name: 'Product / common name', manufacturer: 'Manufacturer', packer: 'Packer', importer: 'Importer',
  address: 'Address', net_quantity: 'Net quantity', mrp: 'MRP', packed_date: 'Packing / manufacture date',
  best_before: 'Best before / use by', batch_number: 'Batch / lot number', consumer_care: 'Consumer care',
  consumer_phone: 'Consumer care phone', consumer_email: 'Consumer care email', country_of_origin: 'Country of origin',
  unit_sale_price: 'Unit sale price', other_declarations: 'Other detected declarations'
}

const demoDefaults = {
  compliant: 'Product: ABC Basmati Rice\nManufacturer: ABC Foods Pvt Ltd\nAddress: 12 Market Road, Chennai, Tamil Nadu\nNet Quantity: 1 kg\nMRP: ₹120\nPacked: 10/05/2026\nBest Before: 12 months from packing\nConsumer Care: 1800-123-4567\nCountry of Origin: India\nUnit Sale Price: ₹120/kg',
  review: 'Product: Sunrise Biscuits\nManufacturer: Sunrise Foods Pvt Ltd\nAddress: 9 Industrial Estate, Pune, Maharashtra\nNet Quantity: 200 g\nMRP: ₹80\nPacked: 08/2026\nCountry of Origin: India',
  issue: 'Product: Tasty Chips\nManufacturer: XYZ Snacks\nNet Quantity: 50 g\nMRP: ₹20\nPacked: 06/2026'
}

const DEMO_ACCOUNTS = {
  consumer: { username: 'consumer', password: 'consumer123', name: 'Demo Consumer' },
  inspector: { username: 'inspector', password: 'inspector123', name: 'Demo Inspector' }
}

function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('packcheck_auth') || 'null') } catch { return null }
  })
  const [mode, setMode] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('packcheck_auth') || 'null')?.role || 'consumer' } catch { return 'consumer' }
  })
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('packcheck_sidebar') !== 'hidden')
  const [health, setHealth] = useState(null)
  const [dashboard, setDashboard] = useState({ total: 0, by_status: {}, average_score: 0, top_violations: [], severity: [] })
  const [scans, setScans] = useState([])
  const [rules, setRules] = useState([])
  const [activeScan, setActiveScan] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraSurface, setCameraSurface] = useState('Front label')
  const [cameraStatus, setCameraStatus] = useState({level:'idle', message:'Position the package inside the guide frame.'})
  const [capturedSurfaces, setCapturedSurfaces] = useState([])
  const cameraVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const surfaceOcrRef = useRef({})

  const [imagePreview, setImagePreview] = useState('')
  const [scanFile, setScanFile] = useState(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrStage, setOcrStage] = useState('')
  const [selectedDemo, setSelectedDemo] = useState('compliant')
  const [demoData, setDemoData] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [offlineMode, setOfflineMode] = useState(false)

  const changeMode = (nextMode) => {
    if (!auth || auth.role !== nextMode) return
    setMode(nextMode)
    setPage('dashboard')
    setActiveScan(null)
  }

  const handleLogin = (session) => {
    sessionStorage.setItem('packcheck_auth', JSON.stringify(session))
    setAuth(session)
    setMode(session.role)
    setPage('dashboard')
    setActiveScan(null)
    loadAll(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('packcheck_auth')
    setAuth(null)
    setMode('consumer')
    setPage('dashboard')
    setActiveScan(null)
    setHealth(null)
  }

  const toggleSidebar = () => {
    setSidebarOpen(v => {
      const next = !v
      localStorage.setItem('packcheck_sidebar', next ? 'open' : 'hidden')
      return next
    })
  }

  const loadAll = async (showToast=true) => {
    try {
      const hRes = await fetch(`${API}/health`, { cache: 'no-store' })
      const h = await parseResponse(hRes)
      if (!hRes.ok) throw new Error(h.detail || `Backend returned HTTP ${hRes.status}`)
      setHealth(h)

      const results = await Promise.allSettled([
        fetch(`${API}/dashboard`, { cache: 'no-store' }),
        fetch(`${API}/scans`, { cache: 'no-store' }),
        fetch(`${API}/rules`, { cache: 'no-store' }),
        fetch(`${API}/scenarios`, { cache: 'no-store' })
      ])
      const [dRes, sRes, rRes, dsRes] = results
      if (dRes.status === 'fulfilled' && dRes.value.ok) setDashboard(await parseResponse(dRes.value))
      if (sRes.status === 'fulfilled' && sRes.value.ok) setScans(await parseResponse(sRes.value))
      if (rRes.status === 'fulfilled' && rRes.value.ok) {
        const nextRules = await parseResponse(rRes.value)
        setRules(nextRules)
        localStorage.setItem('packcheck_cached_rules', JSON.stringify(nextRules))
      }
      if (dsRes.status === 'fulfilled' && dsRes.value.ok) setDemoData(await parseResponse(dsRes.value))
    } catch (err) {
      setHealth({ status: 'offline' })
      if (showToast) setToast(`Backend is not reachable. Start START_BACKEND.bat (FastAPI on port 8000).`)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (health?.status !== 'offline') return
    const timer = setInterval(() => loadAll(false), 3000)
    return () => clearInterval(timer)
  }, [health?.status])

  const chooseDemo = (key) => {
    setSelectedDemo(key)
    setScanFile(null)
    setCapturedSurfaces([])
    setImagePreview(assetUrl(demoData?.[key]?.image || ''))
    setOcrText(demoData?.[key]?.text || demoDefaults[key])
  }

  useEffect(() => {
    if (demoData) chooseDemo('compliant')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoData])

  const handleFile = async (file, surfaceKey = null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setToast('Please select a JPG, PNG or WebP image.'); return }
    if (file.size > 10 * 1024 * 1024) { setToast('Maximum image size is 10 MB.'); return }
    setScanFile(file)
    if (surfaceKey) setCapturedSurfaces(prev => prev.includes(surfaceKey) ? prev : [...prev, surfaceKey])
    else setCapturedSurfaces([])
    setImagePreview(URL.createObjectURL(file))
    setSelectedDemo('')
    if (!surfaceKey) {
      surfaceOcrRef.current = {}
      setOcrText('')
    }
    await runOCR(file, surfaceKey)
  }

  const canvasFromBlob = async (blob, mode='gray') => {
    const bitmap = await createImageBitmap(blob)
    const maxWidth = 2400
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      let value = gray
      if (mode === 'contrast') value = Math.max(0, Math.min(255, (gray - 128) * 1.45 + 128))
      if (mode === 'threshold') value = gray > 155 ? 255 : 0
      d[i] = d[i + 1] = d[i + 2] = value
    }
    ctx.putImageData(imageData, 0, 0)
    if (bitmap.close) bitmap.close()
    return canvas
  }

  const mergeOCRTexts = (texts) => {
    const lines = []
    const keys = []
    for (const text of texts) {
      for (const raw of String(text || '').split(/\r?\n/)) {
        const line = raw.replace(/\s+/g, ' ').trim()
        if (line.length < 2) continue
        const key = line.toLowerCase().replace(/[^a-z0-9]+/g, '')
        if (!key) continue
        const near = keys.some(k => {
          const shorter = Math.min(k.length, key.length)
          const longer = Math.max(k.length, key.length)
          if (!shorter || longer / shorter > 1.25) return false
          let common = 0
          const set = new Set(k)
          for (const ch of key) if (set.has(ch)) common++
          return common / longer > 0.88
        })
        if (!near) { keys.push(key); lines.push(line) }
      }
    }
    return lines.join('\n')
  }

  const runBrowserOCR = async (file) => {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (typeof m.progress === 'number') setOcrProgress(Math.max(20, Math.min(92, Math.round(m.progress * 72) + 20)))
      },
    })
    try {
      const modes = ['gray', 'contrast', 'threshold']
      const results = []
      for (let idx = 0; idx < modes.length; idx++) {
        const prepared = await canvasFromBlob(file, modes[idx])
        setOcrStage(`Reading package · pass ${idx + 1}/${modes.length}...`)
        setOcrProgress(24 + idx * 18)
        for (const psm of ['6', '11']) {
          await worker.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1' })
          const result = await worker.recognize(prepared)
          const text = (result?.data?.text || '').trim()
          const confidence = Math.round(Number(result?.data?.confidence || 0))
          if (text) results.push({ text, confidence })
        }
      }
      const ranked = [...results].sort((a, b) => (b.confidence * 4 + Math.min(b.text.length, 700)) - (a.confidence * 4 + Math.min(a.text.length, 700)))
      const top = ranked.slice(0, 6)
      return {
        text: mergeOCRTexts(top.map(r => r.text)),
        confidence: top.length ? Math.round(top.reduce((a, r) => a + r.confidence, 0) / top.length) : 0,
        passes: results.length,
      }
    } finally {
      await worker.terminate()
    }
  }

  const analyzeLive = async (text, confidence, imageUrl, coverage, readabilityStatus, readabilityScore, filename, fieldConfidences = null, ocrProvider = null) => {
    setOcrStage('Checking compliance...')
    const res = await fetch(`${API}/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text, product_category: 'general_prepackaged', image_coverage: coverage || 95, mode: 'live-ocr',
        image_url: imageUrl || undefined, readability_status: readabilityStatus || 'NEEDS_VERIFICATION',
        readability_score: readabilityScore || 72, filename: filename || 'uploaded-package', ocr_mean_confidence: confidence, ocr_confidences: fieldConfidences || undefined, ocr_provider: ocrProvider || undefined
      })
    })
    const data = await parseResponse(res)
    if (!res.ok) throw new Error(data.detail || 'Compliance analysis failed')
    setActiveScan(data)
    setImagePreview(imageUrl ? assetUrl(imageUrl) : imagePreview)
    setPage('result')
    await loadAll()
  }

  const runOCR = async (file, surfaceKey = null) => {
    setOcrRunning(true)
    setOcrProgress(5)
    setOcrStage('Uploading...')
    try {
      const fd = new FormData(); fd.append('file', file)
      const storeRes = await fetch(`${API}/store-image`, { method: 'POST', body: fd })
      const stored = await parseResponse(storeRes)
      if (!storeRes.ok) throw new Error(stored.detail || 'Image upload failed')
      setUploadedImageUrl(stored.image_url || '')
      setOcrProgress(18)

      setOcrStage('Reading package with multi-pass OCR...')
      // Browser OCR remains available offline/local; server OCR adds a second independent pass.
      const browserPromise = runBrowserOCR(file).catch(error => ({ text: '', confidence: 0, error }))
      const serverFd = new FormData(); serverFd.append('file', file)
      const serverPromise = fetch(`${API}/upload`, { method: 'POST', body: serverFd })
        .then(async r => ({ ok: r.ok, status: r.status, data: await parseResponse(r) }))
        .catch(error => ({ ok: false, data: {}, error }))
      const [browser, server] = await Promise.all([browserPromise, serverPromise])

      if (!server.ok && server.data?.detail) {
        setToast(`Server OCR unavailable (${server.status || 'network'}): ${server.data.detail}. Using browser OCR if available.`)
      }

      const browserText = browser.text || ''
      const serverText = server.ok ? (server.data.ocr_text || '') : ''
      // Prefer the server's structured OCR transcript. Browser OCR is a fallback only;
      // merging its raw text back in re-introduces UI/nutrition noise and corrupts fields.
      const text = (serverText || browserText).trim()
      const serverConfidence = Number(server.ok ? server.data.ocr_mean_confidence || 0 : 0)
      const confidenceValues = [Number(browser.confidence || 0), serverConfidence].filter(v => v > 0)
      const confidence = confidenceValues.length ? Math.round(confidenceValues.reduce((a, v) => a + v, 0) / confidenceValues.length) : 0
      if (surfaceKey) {
        surfaceOcrRef.current[surfaceKey] = text
        setOcrText(Object.entries(surfaceOcrRef.current).map(([surface, value]) => `--- ${surface} ---\n${value}`).join('\n\n'))
      } else {
        surfaceOcrRef.current = { 'Primary capture': text }
        setOcrText(text)
      }
      setOcrProgress(88)
      setOcrStage('Extracting fields...')
      if (!text || text.length < 12) {
        throw new Error('Text could not be extracted reliably. Retake the image with better lighting, less glare, and the label facing the camera.')
      }
      if (confidence < 60) {
        setToast('OCR confidence is low. PackCheck will treat uncertain fields as NEEDS REVIEW rather than a definite violation.')
      }
      const coverage = Number(server.ok ? server.data.quality_score || stored.coverage || 80 : stored.coverage || 80)
      const readStatus = server.ok ? (server.data.readability_status || stored.readability_status) : stored.readability_status
      const readScore = server.ok ? Number(server.data.readability_score || stored.readability_score || 72) : Number(stored.readability_score || 72)
      const fieldConfidences = server.ok ? (server.data.ocr_field_confidences || null) : null
      if (server.ok && Number(server.data.ocr_passes || 0) >= 2) setOcrStage(`OCR consensus complete · ${server.data.ocr_passes} passes`)
      await analyzeLive(text, confidence, stored.image_url, coverage, readStatus, readScore, file.name, fieldConfidences, server.ok ? (server.data.ocr_provider || null) : null)
      setOcrProgress(100)
    } catch (e) {
      setOcrStage('OCR failed')
      setOcrText('')
      setToast(e.message || 'OCR failed')
    } finally {
      setOcrRunning(false)
    }
  }

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop())
    cameraStreamRef.current = null
    setCameraOpen(false)
    setCameraStatus({level:'idle', message:'Camera closed.'})
  }

  const startCamera = async (surface = 'Front label') => {
    setCameraSurface(surface)
    setCameraOpen(true)
    setCameraStatus({level:'checking', message:'Starting rear camera…'})
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Live camera is unavailable in this browser. Use the mobile camera button below.')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
        audio: false
      })
      cameraStreamRef.current = stream
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream
        await cameraVideoRef.current.play()
      }
      setCameraStatus({level:'ready', message:'Move closer until the label fills the guide frame.'})
    } catch (e) {
      setCameraStatus({level:'error', message: e.message || 'Camera permission failed.'})
    }
  }

  const cameraQualityCheck = () => {
    const video = cameraVideoRef.current
    if (!video || video.readyState < 2 || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    const w = 320, h = Math.max(1, Math.round(320 * video.videoHeight / video.videoWidth))
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', {willReadFrequently:true})
    ctx.drawImage(video, 0, 0, w, h)
    const data = ctx.getImageData(0,0,w,h).data
    let sum=0, sum2=0, edges=0, prev=0, count=0
    for (let i=0;i<data.length;i+=16) {
      const lum=0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]
      sum += lum; sum2 += lum*lum
      if (count && Math.abs(lum-prev)>22) edges++
      prev=lum; count++
    }
    const mean=sum/count, variance=Math.max(0, sum2/count-mean*mean)
    if (mean < 55) setCameraStatus({level:'bad',message:'Too dark — move to brighter light.'})
    else if (mean > 235) setCameraStatus({level:'bad',message:'Too bright — reduce glare or direct light.'})
    else if (variance < 220) setCameraStatus({level:'bad',message:'Image may be blurry — hold steady and move slightly closer.'})
    else if (edges < 18) setCameraStatus({level:'bad',message:'Label details are weak — fill the guide frame with the package.'})
    else setCameraStatus({level:'good',message:'Good capture conditions — keep the package steady.'})
  }

  useEffect(() => {
    if (!cameraOpen) return
    const timer = setInterval(cameraQualityCheck, 450)
    return () => clearInterval(timer)
  }, [cameraOpen])

  const captureCameraFrame = async () => {
    const video = cameraVideoRef.current
    if (!video || !video.videoWidth) { setToast('Camera is not ready yet.'); return }
    const canvas = document.createElement('canvas')
    const maxWidth = 3000
    const scale = Math.min(1, maxWidth / video.videoWidth)
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video,0,0,canvas.width,canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',0.96))
    if (!blob) { setToast('Could not capture the camera frame.'); return }
    const file = new File([blob], `packcheck-${cameraSurface.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.jpg`, {type:'image/jpeg'})
    stopCamera()
    await handleFile(file, cameraSurface)
  }

  const analyzeDemo = async () => {
    try {
      const res = await fetch(`${API}/analyze-text`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedDemo, text: ocrText, mode: 'demo-text' })
      })
      const data = await parseResponse(res); if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setActiveScan(data); setPage('result'); await loadAll()
    } catch (e) { setToast(e.message || 'Analysis failed') }
  }

  const analyzeReal = async () => {
    if (!ocrText.trim()) { setToast('Upload a package image first so PackCheck can run real OCR.'); return }
    try {
      setOcrRunning(true)
      await analyzeLive(ocrText.trim(), 0, uploadedImageUrl, 95, 'NEEDS_VERIFICATION', 72, scanFile?.name || 'uploaded-package')
    } catch (e) { setToast(e.message || 'Analysis failed') }
    finally { setOcrRunning(false) }
  }

  const openScan = async (id) => {
    const data = await fetch(`${API}/scans/${id}`).then(r => r.json())
    setActiveScan(data)
    setImagePreview(data.image_url ? assetUrl(data.image_url) : '')
    setPage('result')
  }

  const deleteScan = async (id) => {
    if (!confirm('Delete this inspection record?')) return
    await fetch(`${API}/scans/${id}`, { method: 'DELETE' })
    if (activeScan?.id === id) setActiveScan(null)
    await loadAll(); setToast('Inspection deleted.')
  }

  const filteredScans = useMemo(() => scans.filter(s => {
    const q = search.toLowerCase().trim(); if (!q) return true
    return `${s.id} ${s.filename || ''} ${s.mode || ''} ${s.status || ''}`.toLowerCase().includes(q)
  }), [scans, search])

  // This prevents the verification effect from being skipped on QR routes.

  if (!auth) return <LoginPage onLogin={handleLogin} accounts={DEMO_ACCOUNTS} />

  return <div className={`app-shell ${sidebarOpen ? 'sidebar-is-open' : 'sidebar-is-hidden'}`}>
    <Sidebar page={page} setPage={setPage} mode={mode} setMode={changeMode} open={sidebarOpen} auth={auth} onLogout={handleLogout} />
    <button className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Hide navigation menu' : 'Show navigation menu'} title={sidebarOpen ? 'Hide menu' : 'Show menu'}>
      {sidebarOpen ? <X size={18} /> : <Menu size={20} />}
    </button>
    {sidebarOpen && <button className="sidebar-scrim" onClick={toggleSidebar} aria-label="Close navigation menu" />}
    <main className="main">
      <Topbar mode={mode} health={health} page={page} onRetry={() => loadAll()} />
      {page === 'dashboard' && <DashboardPage dashboard={dashboard} setPage={setPage} mode={mode} />}
      {page === 'scan' && <ScanPage mode={mode} demoData={demoData} selectedDemo={selectedDemo} chooseDemo={chooseDemo} imagePreview={imagePreview} handleFile={handleFile} ocrText={ocrText} setOcrText={setOcrText} ocrProgress={ocrProgress} ocrRunning={ocrRunning} ocrStage={ocrStage} analyzeDemo={analyzeDemo} analyzeReal={analyzeReal} startCamera={startCamera} captureCameraFrame={captureCameraFrame} stopCamera={stopCamera} cameraOpen={cameraOpen} cameraSurface={cameraSurface} setCameraSurface={setCameraSurface} cameraVideoRef={cameraVideoRef} cameraStatus={cameraStatus} capturedSurfaces={capturedSurfaces} />}
      {page === 'result' && activeScan && (mode === 'consumer' ? <ConsumerResultPage scan={activeScan} preview={imagePreview} setPage={setPage} setToast={setToast} /> : <ResultPage scan={activeScan} setScan={setActiveScan} preview={imagePreview} refresh={loadAll} setToast={setToast} setPage={setPage} />)}
      {page === 'complaints' && (mode === 'consumer' ? <ComplaintPage scan={activeScan} setToast={setToast} /> : <InspectorComplaintCenter setToast={setToast} openScan={openScan} />)}
      {page === 'fraud' && <FraudDetectorPage setToast={setToast} />}
      {page === 'passport' && <PassportPage scans={scans} activeScan={activeScan} setToast={setToast} />}
      {mode === 'inspector' && page === 'history' && <HistoryPage scans={filteredScans} search={search} setSearch={setSearch} openScan={openScan} deleteScan={deleteScan} />}
      {mode === 'inspector' && page === 'rules' && <RulesPage rules={rules} />}
      {mode === 'inspector' && page === 'regulatory' && <RegulatoryPage rules={rules} />}
      {mode === 'inspector' && page === 'evidence' && <EvidenceChainPage scan={activeScan} />}
      {mode === 'inspector' && page === 'offline' && <OfflineInspectionPage offlineMode={offlineMode} setOfflineMode={setOfflineMode} setToast={setToast} activeScan={activeScan} />}
      {mode === 'inspector' && page === 'impact' && <ChangeImpactPage />}
      {mode === 'inspector' && page === 'risk' && <RiskPrioritizationPage />}
      {mode === 'inspector' && page === 'analytics' && <AnalyticsPage dashboard={dashboard} scans={scans} />}
      {mode === 'inspector' && page === 'reports' && <ReportsPage scans={scans} openScan={openScan} />}
      {mode === 'inspector' && page === 'settings' && <SettingsPage />}
      {toast && <div className="toast"><Info size={16}/>{toast}</div>}
    </main>
  </div>
}


function LoginPage({ onLogin, accounts }) {
  const [role, setRole] = useState('consumer')
  const [username, setUsername] = useState(accounts.consumer.username)
  const [password, setPassword] = useState(accounts.consumer.password)
  const [error, setError] = useState('')
  const account = accounts[role]

  useEffect(() => {
    setUsername(account.username)
    setPassword(account.password)
    setError('')
  }, [role])

  const submit = (e) => {
    e.preventDefault()
    if (username.trim() === account.username && password === account.password) {
      onLogin({ role, name: account.name })
      return
    }
    setError('Invalid demo credentials.')
  }

  return <div className="login-shell">
    <div className="login-card">
      <div className="login-brand"><div className="brand-mark"><ShieldCheck size={28}/></div><div><b>PackCheck AI</b><span>Compliance Intelligence</span></div></div>
      <div className="login-copy"><span className="eyebrow">SECURE ROLE ACCESS</span><h1>Sign in to PackCheck AI</h1><p>Choose a demo role. Inspector tools are restricted to inspector accounts.</p></div>
      <div className="login-role-toggle"><button className={role === 'consumer' ? 'active' : ''} onClick={() => setRole('consumer')} type="button">Consumer</button><button className={role === 'inspector' ? 'active' : ''} onClick={() => setRole('inspector')} type="button">Inspector</button></div>
      <form onSubmit={submit} className="login-form">
        <label>Username<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></label>
        <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" /></label>
        {error && <div className="login-error">{error}</div>}
        <button className="primary login-submit" type="submit"><LogIn size={16}/> Sign in as {role}</button>
      </form>
      <div className="demo-credentials">
        <div><b>Consumer demo</b><span>consumer / consumer123</span></div>
        <div><b>Inspector demo</b><span>inspector / inspector123</span></div>
      </div>
      <div className="login-note"><LockKeyhole size={14}/> Demo role access for the prototype. Production deployment should use backend authentication and authorization.</div>
    </div>
  </div>
}

function Sidebar({ page, setPage, mode, setMode, open, auth, onLogout }) {
  const inspectorItems = [
    ['dashboard', 'Dashboard', BarChart3], ['scan', 'Scan Product', Camera], ['regulatory', 'Regulatory Intel', GitBranch], ['evidence', 'Evidence Chain', Link2], ['offline', 'Offline Inspection', WifiOff], ['impact', 'Change Impact', Zap], ['risk', 'Risk Prioritization', AlertTriangle], ['fraud', 'MRP & Quantity Fraud', Receipt], ['complaints', 'Complaint Center', FilePlus2], ['passport', 'Product Passport', QrCode], ['history', 'Scan History', History],
    ['rules', 'Rule Library', ListChecks], ['analytics', 'Analytics', Activity], ['reports', 'Reports', FileText], ['settings', 'Settings', Settings]
  ]
  const consumerItems = [
    ['dashboard', 'Home', BarChart3], ['scan', 'Check Product', Camera], ['fraud', 'MRP & Quantity Fraud', Receipt], ['complaints', 'File Complaint', FilePlus2], ['passport', 'Verify Product Passport', QrCode]
  ]
  const items = mode === 'inspector' ? inspectorItems : consumerItems
  return <aside className={`sidebar ${mode}-sidebar ${open ? 'open' : 'closed'}`}>
    <div className="brand"><div className="brand-mark"><ShieldCheck size={24}/></div><div><b>PackCheck AI</b><span>Compliance Intelligence</span></div></div>
    <div className="mode-toggle"><button className={mode === 'consumer' ? 'active' : ''} onClick={() => setMode('consumer')}>Consumer</button><button className={mode === 'inspector' ? 'active' : ''} onClick={() => setMode('inspector')}>Inspector</button></div>
    <nav>{items.map(([key,label,Icon]) => <button key={key} className={page === key ? 'nav-active' : ''} onClick={() => setPage(key)}><Icon size={17}/><span>{label}</span><ChevronRight size={14}/></button>)}</nav>
    <div className="sidebar-account"><div className="account-icon"><LockKeyhole size={15}/></div><div><b>{auth.name}</b><span>{auth.role === 'inspector' ? 'Protected inspector account' : 'Consumer account'}</span></div><button onClick={onLogout} title="Sign out"><LogIn size={14}/></button></div>
    <div className="sidebar-bottom">
      <div className="prototype-box"><b>{mode === 'inspector' ? 'INSPECTOR WORKSPACE' : 'CONSUMER VIEW'}</b><span>{mode === 'inspector' ? 'Detailed evidence, rules, verification and reports.' : 'Simple package screening for quick consumer understanding.'}</span></div>
      <div className="profile"><div className="profile-icon"><UserRound size={18}/></div><div><b>{mode === 'inspector' ? 'Inspector mode' : 'Consumer mode'}</b><span>{mode === 'inspector' ? 'Enforcement workspace' : 'Simple screening'}</span></div></div>
    </div>
  </aside>
}

function Topbar({ mode, health, page, onRetry }) {
  const titles = { dashboard:'Inspection command center', scan:'Multi-surface inspection', regulatory:'Regulatory intelligence engine', evidence:'Evidence chain', offline:'Offline-first inspection', impact:'Regulatory change impact', risk:'Risk-based inspection queue', fraud:'MRP & quantity fraud detector', complaints:mode === 'inspector' ? 'Complaint Center · Inspector Review' : 'One-click complaint filing', passport:'Verified product passport registry', result:'Compliance screening result', history:'Inspection history', rules:'Rule library', analytics:'Enforcement analytics', reports:'Screening reports', settings:'Prototype settings' }
  return <header className="topbar"><div><span className="eyebrow">LEGAL METROLOGY · AI-ASSISTED SCREENING</span><h1>{titles[page]}</h1></div><div className="system-status"><span className={health?.status === 'ok' ? 'dot-online' : 'dot-offline'}></span>{health?.status === 'ok' ? `System ready · ${mode}` : <><span>Backend offline</span><button className="backend-retry" onClick={onRetry} title="Retry backend connection"><RefreshCw size={12}/> Retry</button></>}</div></header>
}

function DashboardPage({ dashboard, setPage, mode }) {
  const green = dashboard.by_status?.GREEN || 0, yellow = dashboard.by_status?.YELLOW || 0, red = dashboard.by_status?.RED || 0
  if (mode === 'consumer') {
    return <>
      <section className="hero-card consumer-hero"><div className="hero-copy"><span className="eyebrow">CONSUMER MODE</span><h2>Check a package in <span>seconds.</span></h2><p>Upload a packaged product label and PackCheck AI will read the visible declarations and tell you what looks okay and what needs verification.</p><div className="hero-actions"><button className="primary" onClick={() => setPage('scan')}><Camera size={18}/> Check product</button><button className="secondary" onClick={() => setPage('scan')}><Zap size={17}/> Try demo</button></div></div><div className="hero-visual"><div className="orb"><ShieldCheck size={54}/></div><div className="floating-card"><b>Simple answer</b><span>Looks okay · Needs verification · Possible issue</span></div></div></section>
      <section className="consumer-benefits"><div className="consumer-benefit"><CheckCircle2 size={18}/><div><b>Simple result</b><span>No legal jargon — just a clear screening message.</span></div></div><div className="consumer-benefit"><ShieldCheck size={18}/><div><b>Read the label</b><span>See important declarations detected from the package.</span></div></div><div className="consumer-benefit"><AlertTriangle size={18}/><div><b>Know what to check</b><span>Get clear warnings when something needs manual verification.</span></div></div></section>
      <section className="panel consumer-scope"><div className="panel-head"><div><h3>Consumer view</h3><p>This mode intentionally hides enforcement-only tools such as rule IDs, audit history, analytics and report controls.</p></div></div><div className="consumer-flow"><span>1</span><b>Scan</b><ArrowRight size={15}/><span>2</span><b>Understand</b><ArrowRight size={15}/><span>3</span><b>Verify</b></div></section>
    </>
  }
  return <>
    <section className="hero-card"><div className="hero-copy"><span className="eyebrow">FIELD INSPECTION WORKSPACE</span><h2>Turn package labels into <span>explainable evidence.</span></h2><p>Scan a packaged commodity, extract declarations, apply a versioned prototype rule set and keep a human inspector in the loop.</p><div className="hero-actions"><button className="primary" onClick={() => setPage('scan')}><Camera size={18}/> Scan product</button><button className="secondary" onClick={() => setPage('scan')}><Zap size={17}/> Try demo</button></div></div><div className="hero-visual"><div className="orb"><ClipboardCheck size={54}/></div><div className="floating-card"><b>Evidence-first</b><span>Rule → Evidence → Decision</span></div></div></section>
    <section className="kpi-grid"><KPI icon={Camera} label="Total scans" value={dashboard.total || 0} tone="blue"/><KPI icon={CheckCircle2} label="Looks compliant" value={green} tone="green"/><KPI icon={AlertTriangle} label="Needs review" value={yellow} tone="amber"/><KPI icon={X} label="Potential violations" value={red} tone="red"/><KPI icon={Activity} label="Average score" value={`${dashboard.average_score || 0}/100`} tone="blue"/></section>
    <section className="content-grid"><div className="panel"><div className="panel-head"><div><h3>How PackCheck AI works</h3><p>From photograph to inspection evidence.</p></div></div><div className="flow-list"><Flow num="01" title="Capture" copy="Upload a label photo or run a deterministic demo case."/><Flow num="02" title="Understand" copy="Local OCR + declaration extraction + confidence."/><Flow num="03" title="Check" copy="Applicable prototype rules evaluate the extracted facts."/><Flow num="04" title="Explain" copy="Evidence, severity and recommended verification are shown."/><Flow num="05" title="Act" copy="Inspector verifies and exports a report."/></div></div><div className="panel accent-panel"><span className="eyebrow">WINNING DIFFERENTIATOR</span><h3>Not just OCR.</h3><p>PackCheck AI turns unstructured package imagery into <b>compliance intelligence</b> that a human inspector can verify.</p><div className="evidence-strip"><span>WHAT</span><span>WHERE</span><span>RULE</span><span>WHY</span><span>NEXT</span></div><div className="micro-note">Prototype only: rules and score are not legal certification.</div></div></section>
    <section className="winning-features"><FeatureCard icon={GitBranch} title="Versioned Regulatory Intelligence" text="Tracks rule version, effective date and source before deciding what to check." action="Open regulatory engine" onClick={()=>setPage('regulatory')}/><FeatureCard icon={Layers} title="Multi-Surface Package Inspection" text="Inspect front, back, side, barcode and seal evidence instead of trusting one photo." action="Run inspection" onClick={()=>setPage('scan')}/><FeatureCard icon={Link2} title="Evidence Chain" text="Every finding links the observed evidence to the exact rule, decision and inspector action." action="View evidence chain" onClick={()=>setPage('evidence')}/><FeatureCard icon={WifiOff} title="Offline-First Inspection" text="Continue in zero connectivity, queue evidence locally, then sync with an auditable trail." action="Open offline lab" onClick={()=>setPage('offline')}/></section>
  </>
}
function FeatureCard({icon:Icon,title,text,action,onClick}){return <div className="feature-card"><div className="feature-icon"><Icon size={20}/></div><div className="feature-copy"><b>{title}</b><span>{text}</span></div><button className="text-btn" onClick={onClick}>{action}<ArrowRight size={13}/></button></div>}

function KPI({icon:Icon,label,value,tone}){return <div className="kpi"><div className={`kpi-icon ${tone}`}><Icon size={18}/></div><div><span>{label}</span><b>{value}</b></div></div>}
function Flow({num,title,copy}){return <div className="flow-row"><span className="flow-num">{num}</span><div><b>{title}</b><p>{copy}</p></div><ArrowRight size={15}/></div>}

function ScanPage({mode,demoData,selectedDemo,chooseDemo,imagePreview,handleFile,ocrText,setOcrText,ocrProgress,ocrRunning,ocrStage,analyzeDemo,analyzeReal,startCamera,cameraOpen,cameraSurface,setCameraSurface,cameraVideoRef,cameraStatus,stopCamera,capturedSurfaces}) {
  const demo = demoData?.[selectedDemo]
  const isConsumer = mode === 'consumer'
  return <section className={`scan-section ${isConsumer ? 'consumer-scan' : 'inspector-scan'}`}>
    <div className="scan-toolbar"><div><span className="eyebrow">01 · {isConsumer ? 'CHECK' : 'CAPTURE'}</span><h2>{isConsumer ? 'Check a packaged product' : 'Scan a packaged product'}</h2><p>{isConsumer ? 'Upload a clear package image. OCR runs automatically and returns a simple screening result.' : 'Upload a real package image — OCR runs automatically before compliance screening.'}</p></div><div className="toolbar-badge"><ShieldCheck size={16}/> {isConsumer ? 'Consumer screening' : 'Inspector screening'}</div></div>
    <div className="scan-columns">
      <div className="panel">
        <div className="step-title"><span>01</span><div><b>{isConsumer ? 'Upload package photo' : 'Upload / capture package'}</b><small>JPG, PNG or WebP · maximum 10 MB</small></div></div>
        <label className="dropzone"><input type="file" accept="image/*" capture="environment" onChange={e=>handleFile(e.target.files?.[0])}/>{imagePreview ? <img className="upload-preview" src={imagePreview} /> : <><CloudUpload size={38}/><b>Drop product image here</b><span>Or click to select an image</span><div className="camera-tip"><Camera size={14}/> Mobile camera supported</div></>}</label>
        <div className="capture-actions"><button className="secondary" onClick={()=>startCamera('Front label')}><Camera size={16}/> Open guided camera</button><span>Rear camera · high-resolution capture · glare / blur guidance</span></div>
        <div className="demo-line"><span>{isConsumer ? 'Try a sample package' : 'Test / demo mode'}</span><div>{[['compliant','✅ Looks compliant'],['review','⚠ Needs review'],['issue','❌ Possible issue']].map(([key,label])=><button key={key} className={selectedDemo===key?'selected-demo':''} onClick={()=>chooseDemo(key)}>{label}</button>)}</div></div>
        {demo && <div className="selected-demo-card"><div><span>{isConsumer ? 'SELECTED SAMPLE' : 'SELECTED DEMO'}</span><b>{demo.label}</b></div><small>{demo.notes}</small></div>}
      </div>
      <div className="panel">
        <div className="step-title"><span>02</span><div><b>{isConsumer ? 'Detected label text' : 'Extracted Text'}</b><small>Hybrid OCR: ABBYY Cloud OCR SDK primary when configured; PaddleOCR + Tesseract provide local fallbacks.</small></div></div>
        {ocrRunning && <div className="progress-wrap"><div className="progress-head"><b>{ocrStage || 'Processing...'}</b><span>{ocrProgress}%</span></div><div className="progress"><span style={{width:`${Math.max(5,ocrProgress)}%`}}/></div></div>}
        {!isConsumer && <div className={`ocr-stage ${ocrRunning?'running':''}`}><div className="ocr-stage-list"><div className={ocrStage==='Uploading...'?'active':''}>Uploading...</div><div className={ocrStage==='Processing image...'?'active':''}>Processing image...</div><div className={ocrStage?.startsWith('Reading package')?'active':''}>Reading package...</div><div className={ocrStage==='Extracting fields...'?'active':''}>Extracting fields...</div><div className={ocrStage==='Checking compliance...'?'active':''}>Checking compliance...</div></div></div>}
        {isConsumer ? <pre className="consumer-ocr-output">{ocrText || 'Upload a clear package image to read the visible label text automatically.'}</pre> : <textarea className="ocr-output" value={ocrText} onChange={e=>setOcrText(e.target.value)} readOnly={!ocrText} placeholder="Detected package text will appear here automatically." />}
        {!ocrText && !ocrRunning && <div className="ocr-empty"><Info size={17}/><span>{isConsumer ? 'No typing required. Upload the package and let OCR read it.' : 'Upload a clear package image. Do not type the label text.'}</span></div>}
        <div className="button-stack"><button className="primary wide" onClick={selectedDemo ? analyzeDemo : analyzeReal} disabled={ocrRunning || (!selectedDemo && !ocrText.trim())}>{ocrRunning ? <><RefreshCw size={17} className="spin"/> Processing…</> : <><ClipboardCheck size={17}/> {selectedDemo ? (isConsumer ? 'See sample result' : 'Analyze selected demo') : (isConsumer ? 'Check product' : 'Re-run compliance check')}</>}</button></div>
      </div>
    </div>
    {!isConsumer && <div className="panel surfaces-panel"><div className="panel-head"><div><h3>Multi-surface package inspection</h3><p>Don't trust a single angle. Capture the surfaces needed to establish evidence.</p></div><span className="tiny-pill">5 SURFACES</span></div><div className="surface-grid">{[['Front label','Primary declarations'],['Back label','Mandatory declarations'],['Side panel','Dates / batch / quantity'],['Barcode / GTIN','Product identity'],['Seal / physical pack','Tamper / package evidence']].map(([a,b],i)=>{const captured=capturedSurfaces.includes(a); const optional=a==='Seal / physical pack'; return <button className={`surface-card ${captured?'captured':''}`} key={a} onClick={()=>startCamera(a)}><div className="surface-icon"><ScanLine size={17}/></div><div><b>{a}</b><span>{b}</span></div><em>{captured?'Captured':(optional?'Optional':'Capture')}</em></button>})}</div><div className="surface-note"><Layers size={15}/><span>The compliance decision can require evidence from more than one package surface before an inspector can close the inspection.</span></div></div>}
    {cameraOpen && <div className="camera-modal" role="dialog" aria-modal="true">
      <div className="camera-dialog">
        <div className="camera-dialog-head"><div><span className="eyebrow">GUIDED CAPTURE · {cameraSurface.toUpperCase()}</span><h3>Capture a clear package surface</h3></div><button className="icon-button" onClick={stopCamera} aria-label="Close camera"><X size={18}/></button></div>
        <div className="camera-view"><video ref={cameraVideoRef} playsInline muted /><div className="camera-frame"><span>Keep label inside frame</span></div><div className={`camera-status ${cameraStatus.level}`}><span className="camera-status-dot"></span>{cameraStatus.message}</div></div>
        <div className="camera-controls"><button className="secondary" onClick={stopCamera}>Cancel</button><button className="primary" onClick={captureCameraFrame} disabled={cameraStatus.level==='bad' || cameraStatus.level==='checking'}><Camera size={18}/> Capture {cameraSurface}</button></div>
        <p className="camera-footnote">Use good lighting, avoid glare, hold steady, and fill most of the frame with the label. The captured frame is saved at high JPEG quality before OCR preprocessing.</p>
      </div>
    </div>}
    {isConsumer ? <div className="consumer-privacy"><ShieldCheck size={17}/><div><b>Simple consumer view</b><span>This screen does not expose legal rule IDs, enforcement analytics, manual OCR correction or report controls.</span></div></div> : <div className="three-cards"><InfoCard title="REAL OCR" text="Uploaded images are checked with PaddleOCR on the server and Tesseract.js in the browser; the fused OCR result is sent to the compliance engine." icon={Zap}/><InfoCard title="LOW CONFIDENCE" text="If OCR cannot confidently read the package, PackCheck asks for a clearer image or manual verification instead of inventing text." icon={AlertTriangle}/><InfoCard title="HUMAN IN THE LOOP" text="Inspectors can correct extracted values and re-run the deterministic screening engine." icon={UserRound}/></div>}
  </section>
}
function InfoCard({title,text,icon:Icon}){return <div className="info-card"><Icon size={17}/><div><b>{title}</b><span>{text}</span></div></div>}

function ConsumerResultPage({scan,preview,setPage,setToast}) {
  const status = scan.status === 'GREEN' ? ['LOOKS COMPLIANT','green','✅ Looks okay'] : scan.status === 'RED' ? ['POSSIBLE ISSUE','red','❌ Possible issue detected'] : ['NEEDS VERIFICATION','amber','⚠ Needs verification']
  const fields = Object.entries(scan.fields || {}).filter(([,value])=>value).slice(0,10)
  const findings = (scan.violations || []).slice(0,4)
  return <section className="result-section consumer-result">
    <div className={`result-hero ${status[1]}`}><div><span className="eyebrow">CONSUMER SCREENING RESULT</span><div className="score-line"><strong>{scan.score}</strong><span>/100</span></div><h2>{status[0]}</h2><p>{status[2]}. This is a screening result, not legal certification.</p></div><div className="result-meta"><div><span>What to do</span><b>{scan.status === 'GREEN' ? 'Usually okay' : 'Check package'}</b></div><div><span>Image coverage</span><b>{scan.image_coverage}%</b></div><div><span>Readability</span><b>{scan.readability_score}/100</b></div><div><span>OCR confidence</span><b>{scan.ocr_mean_confidence || 0}%</b></div></div></div>
    {scan.ocr_text && <div className="panel extracted-text-panel consumer-text-panel"><div className="panel-head"><div><h3>Detected label text</h3><p>Text read from the visible package image.</p></div><span className="tiny-pill">OCR</span></div><pre className="ocr-result-pre">{scan.ocr_text}</pre></div>}
    <div className="consumer-result-grid">
      <div className="panel"><div className="panel-head"><div><h3>What we found</h3><p>Important declarations detected from the package.</p></div></div><div className="consumer-field-list">{fields.map(([key,value])=><div className="consumer-field" key={key}><span>{fieldLabels[key] || key}</span><b>{value}</b><small>Detected</small></div>)}{!fields.length&&<div className="empty-state"><Info size={28}/><b>No declarations could be confidently detected</b><span>Retake the photo with the whole label visible.</span></div>}</div></div>
      <div className="panel"><div className="panel-head"><div><h3>What should you check?</h3><p>Plain-language guidance for consumers.</p></div></div>{findings.length ? <div className="consumer-findings">{findings.map((v,i)=><div className="consumer-finding" key={i}><span className={`severity ${v.severity.toLowerCase()}`}>{v.severity}</span><div><b>{v.title}</b><span>{v.recommendation}</span></div></div>)}</div> : <div className="success-box"><CheckCircle2 size={19}/><div><b>No review items detected</b><span>The visible declarations matched the active prototype screening rules.</span></div></div>}<div className="consumer-note"><ShieldCheck size={16}/><span>PackCheck AI screens the visible label. It does not issue a legally binding certificate.</span></div></div>
    </div>
    {preview && <div className="panel"><div className="panel-head"><div><h3>Package image</h3><p>The image used for this screening.</p></div></div><EvidenceImage src={preview}/></div>}
    <div className="bottom-actions"><button className="primary" onClick={()=>setPage('complaints')}><FilePlus2 size={16}/> Report a suspected issue</button><button className="secondary" onClick={()=>setPage('fraud')}><Receipt size={16}/> Check price & quantity</button><button className="secondary" onClick={()=>setPage('scan')}><Camera size={16}/> Check another product</button></div>
  </section>
}

function ResultPage({scan,setScan,preview,refresh,setToast,setPage}) {
  const [editing, setEditing] = useState({...scan.fields})
  const [open, setOpen] = useState(null)
  const [saving, setSaving] = useState(false)
  useEffect(()=>setEditing({...scan.fields}),[scan.id])
  const status = scan.status === 'GREEN' ? ['LOOKS COMPLIANT','green'] : scan.status === 'RED' ? ['POTENTIAL VIOLATION','red'] : ['NEEDS REVIEW','amber']
  const save = async()=>{setSaving(true); try { const r=await fetch(`${API}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scan_id:scan.id,changes:editing,user_id:'inspector-demo'})}); const d=await r.json(); if(!r.ok) throw new Error(d.detail||'Verification failed'); setScan(d); refresh(); setToast('Verification saved and compliance re-checked.')} catch(e){setToast(e.message)} finally{setSaving(false)} }
  return <section className="result-section">
    <div className={`result-hero ${status[1]}`}><div><span className="eyebrow">AI-ASSISTED SCREENING RESULT</span><div className="score-line"><strong>{scan.score}</strong><span>/100</span></div><h2>{status[0]}</h2><p>Screening support for human verification — not legal certification.</p></div><div className="result-meta"><div><span>Inspection ID</span><b>{scan.id.slice(0,12)}</b></div><div><span>Mode</span><b>{scan.mode}</b></div><div><span>Coverage</span><b>{scan.image_coverage}%</b></div><div><span>Readability</span><b>{scan.readability_score}/100</b></div></div></div>
    {scan.ocr_text && <div className="panel extracted-text-panel"><div className="panel-head"><div><h3>Structured OCR extraction</h3><p>Reconstructed from multiple OCR passes and field-level validation.</p></div><span className="tiny-pill">{scan.ocr_provider || 'PADDLEOCR + TESSERACT'}</span></div><pre className="ocr-result-pre">{scan.ocr_text}</pre></div>}
    <div className="result-grid"><div className="panel"><div className="panel-head"><div><h3>Extracted declarations</h3><p>Edit a value, then re-run the screening.</p></div><span className="tiny-pill">{scan.verified?'VERIFIED':'AI / OCR'}</span></div><div className="field-list">{Object.entries(scan.fields).map(([key,value])=><FieldEditor key={key} field={key} value={value} confidence={scan.ocr_confidence?.[key]||0} status={scan.field_status?.[key]} onChange={(v)=>setEditing({...editing,[key]:v})} />)}</div><button className="secondary wide" onClick={save} disabled={saving}>{saving?<><RefreshCw size={16} className="spin"/> Saving…</>:<><RefreshCw size={16}/> Re-run compliance check</>}</button></div>
      <div className="panel"><div className="panel-head"><div><h3>Why this result?</h3><p>Every finding explains what to verify next.</p></div></div>{preview ? <EvidenceImage src={preview} /> : <div className="evidence-placeholder"><ImageIcon size={31}/><b>No package image attached</b><span>Use a real upload to show the image alongside the extracted result.</span></div>}<div className="review-summary"><div><span>Applicability-aware</span><b>Yes</b></div><div><span>Rule version</span><b>{scan.rule_version || 'PCR-2026-07'}</b></div><div><span>Mean OCR confidence</span><b>{scan.ocr_mean_confidence || 0}%</b></div></div><div className="verification-card"><div><span className="eyebrow">HUMAN-IN-THE-LOOP</span><b>AI recommendation requires inspector verification.</b><small>Confidence: {scan.ocr_mean_confidence || 0}% · Screening support only</small></div><div className="verify-actions"><button className="secondary" onClick={()=>setToast('Finding marked for inspector review.')}>Needs review</button><button className="primary" onClick={save} disabled={saving}><CheckCircle2 size={15}/> {saving?'Confirming…':'Confirm finding'}</button></div></div><div className="fingerprint-card"><div><span className="eyebrow">COMPLIANCE FINGERPRINT</span><b>INS-{String(scan.id||'').slice(0,8).toUpperCase()} · {scan.fingerprint || 'fingerprint pending'}</b><small>SHA-256 fingerprint generated from this inspection's evidence, declarations, findings and verification history.</small></div><span className="tiny-pill">TRACEABLE</span></div><div className="violations-list">{scan.violations.length===0 ? <div className="success-box"><CheckCircle2 size={19}/><div><b>No review items</b><span>No findings from the active prototype rule set.</span></div></div> : scan.violations.map((v,i)=><div className="violation-card" key={i}><button onClick={()=>setOpen(open===i?null:i)}><span className={`severity ${v.severity.toLowerCase()}`}>{v.severity}</span><b>{v.title}</b><ChevronRight size={16} className={open===i?'rotate':''}/></button>{open===i&&<div className="violation-details"><p><b>Rule</b>{v.rule_id}</p><p><b>Evidence</b>{v.evidence}</p><p><b>Confidence</b>{v.confidence}%</p><p><b>Recommendation</b>{v.recommendation}</p></div>}</div>)}</div></div></div>
    <div className="bottom-actions"><button className="primary" onClick={()=>setPage('complaints')}><FilePlus2 size={17}/> File complaint from this finding</button>{scan.status==='GREEN' && <button className="secondary" onClick={()=>setPage('passport')}><QrCode size={17}/> Create product passport</button>}<a className="secondary" href={`${API}/report/${scan.id}`} target="_blank" rel="noreferrer"><FileDown size={17}/> PDF report</a><a className="secondary" href={`${API}/report/${scan.id}/csv`}><Download size={17}/> Editable CSV</a></div>
  </section>
}
function FieldEditor({field,value,confidence,status,onChange}){return <div className="field-card"><div className="field-main"><div><b>{fieldLabels[field]||field}</b><span className={value?'':'muted'}>{value||'Not detected'}</span></div><div className="field-meta"><span className={`field-status ${(status||'').toLowerCase()}`}>{status||(!value?'NOT_DETECTED':'DETECTED')}</span><b>{confidence}%</b></div></div><div className="confidence-bar"><span style={{width:`${confidence}%`}}/></div><input value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Manual verification / correction" /></div>}
function EvidenceImage({src}){return <div className="evidence-wrap"><div className="evidence-image"><img src={src} /></div><div className="legend"><span><i className="dot green-dot"/> package image</span><span><i className="dot amber-dot"/> OCR / rule evidence shown beside image</span></div></div>}

function RegulatoryPage({rules}){
  const [selected,setSelected]=useState('LM-PKG-001')
  const demoRules=[
    {id:'LM-PKG-001',name:'Country-of-origin e-commerce filter',status:'APPLICABLE',effective:'01 Jul 2026',version:'2026-07-01',condition:'Imported product offered on an e-commerce platform',check:'Listing provides a searchable and sortable country-of-origin filter.',source:'G.S.R. 128(E), Legal Metrology (Packaged Commodities) Amendment Rules, 2026'},
    {id:'LM-PKG-002',name:'Net quantity declaration',status:'APPLICABLE',effective:'01 Apr 2011',version:'2011-consolidated',condition:'Pre-packaged commodity sold by quantity',check:'Net quantity is present and readable.',source:'Legal Metrology (Packaged Commodities) Rules, 2011'},
    {id:'LM-PKG-003',name:'Unit sale price',status:'CONDITIONAL',effective:'Current rule set',version:'2011-consolidated',condition:'Applicable category / declaration conditions satisfied',check:'Unit sale price is present where required.',source:'Legal Metrology (Packaged Commodities) Rules, 2011 and applicable amendments'}
  ]
  const r=demoRules.find(x=>x.id===selected)||demoRules[0]
  return <section className="intel-page"><div className="panel intel-hero"><div><span className="eyebrow">REGULATORY APPLICABILITY ENGINE</span><h2>Don't check every rule. <span>Find the rules that apply.</span></h2><p>The engine combines product facts, origin, category and effective dates before selecting the compliance checks.</p></div><div className="engine-badge"><GitBranch size={28}/><b>Decision-ready</b><span>Version + date + condition</span></div></div><div className="intel-flow"><Flow num="01" title="Product facts" copy="Imported · pre-packaged · 200 g"/><Flow num="02" title="Applicability" copy="Evaluate conditions before checking"/><Flow num="03" title="Version selection" copy="Choose the rule active on inspection date"/><Flow num="04" title="Compliance check" copy="Return requirement + reason + source"/></div><div className="panel"><div className="panel-head"><div><h3>Regulation timeline</h3><p>Effective-date aware rule selection. Official source is the Department of Consumer Affairs.</p></div><span className="tiny-pill">ACTIVE · PCR-2026-07</span></div><div className="timeline-compact"><div><b>2011-04-01</b><span>Baseline Packaged Commodities Rules</span></div><div><b>2025-12-02</b><span>Second Amendment — superseded by later amendment</span></div><div className="active"><b>2026-07-01</b><span>Active: imported-product e-commerce country-of-origin filter</span></div><div><b>2027-07-01</b><span>Future amendment already published</span></div></div></div><div className="reg-grid"><div className="panel"><div className="panel-head"><div><h3>Applicable rule set</h3><p>Demo rules are separated from UI logic so the legal source can be updated independently.</p></div><span className="tiny-pill">{demoRules.length} CANDIDATES</span></div><div className="rule-cards">{demoRules.map(x=><button key={x.id} className={`rule-card ${selected===x.id?'selected':''}`} onClick={()=>setSelected(x.id)}><div><b>{x.id}</b><span>{x.name}</span></div><em>{x.status}</em><small>Effective {x.effective} · v{x.version}</small></button>)}</div></div><div className="panel"><div className="panel-head"><div><h3>Why this rule applies</h3><p>Explainable applicability decision.</p></div></div><div className="decision-box"><div className="decision-top"><span className="status-dot"></span><b>{r.status}</b></div><h3>{r.name}</h3><div className="decision-row"><span>Condition</span><b>{r.condition}</b></div><div className="decision-row"><span>Effective</span><b>{r.effective}</b></div><div className="decision-row"><span>Version</span><b>{r.version}</b></div><div className="decision-row"><span>Check</span><b>{r.check}</b></div><div className="source-box"><FileCheck2 size={16}/><div><b>Source trace</b><span>{r.source}</span></div></div></div></div></div><div className="notice"><Info size={16}/><span><b>Prototype guardrail:</b> this engine demonstrates architecture. Production deployment must ingest and validate the latest official government texts before making legal determinations.</span></div></section>
}

function EvidenceChainPage({scan}){const [chain,setChain]=useState(scan?.evidence_chain||[]); const [selectedId,setSelectedId]=useState(scan?.id||''); const [liveScan,setLiveScan]=useState(scan||null); const [loading,setLoading]=useState(false); useEffect(()=>{let cancelled=false; const load=async()=>{setLoading(true); try{let target=scan; if(!target?.id){const sr=await fetch(`${API}/scans`); if(!sr.ok)throw new Error('Unable to load inspections'); const list=await sr.json(); target=list?.[0]||null;} if(!target?.id) {if(!cancelled){setChain([]);setLiveScan(null)} return;} if(!cancelled){setSelectedId(target.id);setLiveScan(target)} const r=await fetch(`${API}/scans/${encodeURIComponent(target.id)}/evidence`); if(!r.ok)throw new Error('Unable to load evidence chain'); const d=await r.json(); if(!cancelled)setChain(d.events||[]);}catch{if(!cancelled)setChain(scan?.evidence_chain||[])}finally{if(!cancelled)setLoading(false)}}; load(); return()=>{cancelled=true}},[scan?.id]); const steps=chain.length?chain.map(e=>[e.event_type,e.title,e.detail]):[['OBSERVATION','No inspection selected','Run a scan to generate a live evidence chain.']]; return <section className="evidence-page"><div className="panel evidence-hero"><div><span className="eyebrow">BIGGEST WOW FEATURE</span><h2>Every decision has a <span>traceable evidence chain.</span></h2><p>Each step below is generated from the selected inspection record — image, extraction, applicability, rule evaluation and human verification.</p></div><div className="chain-score"><Link2 size={28}/><b>{chain.length || 0} linked steps</b><span>{loading?'Loading live chain…':'Live inspection record'}</span></div></div><div className="chain">{steps.map((s,i)=><div className="chain-step" key={`${s[0]}-${i}`}><div className="chain-node">{i+1}</div><div className="chain-line"></div><div className="chain-body"><span>{s[0]}</span><b>{s[1]}</b><small>{s[2]}</small></div>{i<steps.length-1&&<ArrowRight className="chain-arrow" size={17}/>}</div>)}</div><div className="panel audit-panel"><div className="panel-head"><div><h3>Audit-ready record</h3><p>Cryptographic fingerprint generated from this inspection's evidence and decisions.</p></div><span className="tiny-pill">{liveScan?'LIVE RECORD':'NO SCAN SELECTED'}</span></div><div className="audit-grid"><div><span>Inspection ID</span><b>{liveScan?.id ? `INS-${String(liveScan.id).slice(0,8).toUpperCase()}` : '—'}</b></div><div><span>Regulation version</span><b>{liveScan?.rule_version || '—'}</b></div><div><span>Created</span><b>{liveScan?.created_at ? new Date(liveScan.created_at).toLocaleString() : '—'}</b></div><div><span>SHA-256 fingerprint</span><b className="mono">{liveScan?.fingerprint || '—'}</b></div></div></div></section>}

function OfflineInspectionPage({offlineMode,setOfflineMode,setToast,activeScan}){
  const loadQueue=()=>{try{return JSON.parse(localStorage.getItem('packcheck_offline_queue_v2')||'[]')}catch{return[]}}
  const [queue,setQueue]=useState(loadQueue)
  const [syncing,setSyncing]=useState(false)
  const [rulesCached,setRulesCached]=useState(()=>{try{return JSON.parse(localStorage.getItem('packcheck_cached_rules')||'[]')}catch{return[]}})
  const [deviceOnline,setDeviceOnline]=useState(()=>navigator.onLine)
  useEffect(()=>{localStorage.setItem('packcheck_offline_queue_v2',JSON.stringify(queue))},[queue])
  useEffect(()=>{const on=()=>setDeviceOnline(true), off=()=>setDeviceOnline(false); window.addEventListener('online',on); window.addEventListener('offline',off); return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[])
  useEffect(()=>{try{setRulesCached(JSON.parse(localStorage.getItem('packcheck_cached_rules')||'[]'))}catch{}},[deviceOnline])

  const cacheRules=async()=>{
    if(!navigator.onLine){setToast('Cannot refresh rules while offline. Cached snapshot remains available.');return}
    try{const r=await fetch(`${API}/rules`,{cache:'no-store'}); const d=await parseResponse(r); if(!r.ok)throw new Error(d.detail||'Unable to cache rules'); localStorage.setItem('packcheck_cached_rules',JSON.stringify(d)); setRulesCached(d); setToast(`Cached ${Array.isArray(d)?d.length:0} active rules.`)}catch(e){setToast(e.message)}
  }

  const createOfflineInspection=()=>{
    const source=activeScan || {id:null,category:'food',image_coverage:92,readability_status:'NEEDS_VERIFICATION',readability_score:72,ocr_mean_confidence:78,fields:{product_name:'Offline field capture',manufacturer:'Not captured',packer:null,importer:null,address:null,net_quantity:null,mrp:null,packed_date:null,best_before:null,batch_number:null,consumer_care:null,consumer_phone:null,consumer_email:null,country_of_origin:null,unit_sale_price:null,other_declarations:'Captured offline for later verification'},ocr_text:'Offline inspection record created on field device',ocr_provider:'PaddleOCR (local offline)'}
    const offlineId=`OFF-${Date.now()}-${Math.random().toString(16).slice(2,8).toUpperCase()}`
    const item={
      offline_id:offlineId, created_at:new Date().toISOString(), filename:source.filename||'offline-field-capture.jpg',
      category:source.category||'general_prepackaged', mode:'offline-first', image_coverage:Number(source.image_coverage||92),
      readability_status:source.readability_status||'NEEDS_VERIFICATION', readability_score:Number(source.readability_score||72),
      ocr_mean_confidence:Number(source.ocr_mean_confidence||0), ocr_text:source.ocr_text||'Offline field capture',
      ocr_provider:'PaddleOCR (local offline)', fields:source.fields||{}, confidences:source.ocr_confidence||{},
      evidence_notes:['Created on device while offline','Rules snapshot: PCR-2026-07','Evidence retained locally until synchronization.']
    }
    setQueue(prev=>[...prev,item]);
    setToast(`Inspection ${offlineId} saved locally. ${queue.length+1} pending.`)
  }

  const runSync=async()=>{
    if(!deviceOnline || offlineMode){setToast('Go online before synchronizing the queued inspections.');return}
    if(!queue.length){setToast('No offline inspections are pending.');return}
    setSyncing(true)
    const remaining=[]
    let syncedCount=0
    for(const item of queue){
      try{
        const r=await fetch(`${API}/offline/sync`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),signal:AbortSignal.timeout(12000)})
        const d=await parseResponse(r)
        if(!r.ok) throw new Error(d.detail||`Sync failed (${r.status})`)
        syncedCount++
      }catch(e){remaining.push({...item,last_error:e.message})}
    }
    setQueue(remaining)
    setSyncing(false)
    setToast(remaining.length?`${syncedCount} synced · ${remaining.length} still pending.`:`${syncedCount} inspection${syncedCount===1?'':'s'} synchronized successfully.`)
  }

  const effectiveOffline=offlineMode || !deviceOnline
  return <section className="offline-page">
    <div className="panel offline-hero"><div><span className="eyebrow">OFFLINE-FIRST INSPECTION</span><h2>Keep inspecting when the network <span>disappears.</span></h2><p>This mode stores real inspection records locally, uses the cached rule snapshot and uploads queued records when connectivity returns.</p></div><button className={effectiveOffline?'offline-toggle active':'offline-toggle'} onClick={()=>{const next=!offlineMode;setOfflineMode(next);setToast(next?'Offline mode forced — new inspections will stay on this device.':'Normal connectivity mode restored.')}}>{effectiveOffline?<><WifiOff size={18}/> OFFLINE MODE</>:<><Smartphone size={18}/> ONLINE MODE</>}</button></div>

    <div className="offline-grid">
      <div className="panel"><div className="panel-head"><div><h3>Field device status</h3><p>Capabilities available without internet.</p></div><span className={`tiny-pill ${effectiveOffline?'pill-warn':''}`}>{effectiveOffline?'OFFLINE':'ONLINE'}</span></div>
        <div className="offline-checks"><CheckItem icon={Database} text={`Rules cached · ${Array.isArray(rulesCached)?rulesCached.length:0} rules`}/><CheckItem icon={Camera} text="Multi-surface evidence can be captured"/><CheckItem icon={FileText} text="Inspection records stored locally"/><CheckItem icon={Link2} text="Evidence notes retained on-device"/><CheckItem icon={CloudOff} text={`Sync queue · ${queue.length} pending`}/></div>
        <button className="secondary wide" onClick={cacheRules} disabled={!deviceOnline || offlineMode}>Refresh cached rules</button>
      </div>

      <div className="panel"><div className="panel-head"><div><h3>Offline inspection queue</h3><p>These are real records stored on this device, not a simulated counter.</p></div><span className="queue-count">{queue.length}</span></div>
        {!queue.length?<div className="success-box"><CheckCircle2 size={19}/><div><b>No pending inspections</b><span>Create one while offline to test the complete workflow.</span></div></div>:<div className="sync-list">{queue.map((item,i)=><SyncRow key={item.offline_id} title={`${item.offline_id}`} meta={`${item.fields?.product_name||'Field inspection'} · ${item.evidence_notes?.length||0} evidence notes`} error={item.last_error}/>)}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}><button className="secondary" onClick={createOfflineInspection}><FilePlus2 size={16}/> Save offline inspection</button><button className="primary" onClick={runSync} disabled={syncing||!queue.length||effectiveOffline}>{syncing?<><RefreshCw size={16} className="spin"/> Syncing…</>:<><CloudUpload size={16}/> Sync queue</>}</button></div>
      </div>
    </div>

    <div className="panel"><div className="panel-head"><div><h3>How this really works</h3><p>Offline records keep their own regulatory snapshot and become normal inspection records after synchronization.</p></div><span className="tiny-pill">{deviceOnline?'NETWORK AVAILABLE':'NETWORK LOST'}</span></div><div className="offline-timeline"><div className="timeline-card"><WifiOff size={18}/><b>1. Network lost</b><span>The device switches to the cached inspection dataset.</span></div><ArrowRight size={17}/><div className="timeline-card"><Database size={18}/><b>2. Inspect locally</b><span>Record product facts, findings and evidence without the server.</span></div><ArrowRight size={17}/><div className="timeline-card"><CloudUpload size={18}/><b>3. Sync later</b><span>Each queued record is sent to the real backend and becomes part of inspection history.</span></div></div></div>
  </section>
}

function CheckItem({icon:Icon,text}){return <div className="check-item"><Icon size={17}/><span>{text}</span><CheckCircle2 size={15}/></div>}
function SyncRow({title,meta,error}){return <div className="sync-row"><div><b>{title}</b><span>{meta}</span>{error&&<span style={{color:'#b63c37'}}>{error}</span>}</div><span className="sync-pending">{error?'RETRY':'QUEUED'}</span></div>}

function ChangeImpactPage(){
  const [year,setYear]=useState('2027')
  const [run,setRun]=useState(false)
  const scenarios={
    '2026':{title:'2026 Country-of-Origin Filter',effective:'01 Jul 2026',affected:'1,247',checks:'3',impact:'E-commerce listings for imported products',actions:['Add searchable country-of-origin filter','Validate imported-product listing metadata','Refresh applicable inspection checklist']},
    '2027':{title:'2027 Country-of-Origin Expansion',effective:'01 Jul 2027',affected:'2,086',checks:'5',impact:'Expanded e-commerce country-of-origin controls',actions:['Update applicability rules','Re-run affected listing checks','Notify inspection teams of changed evidence requirements']}
  }
  const d=scenarios[year]
  return <section className="impact-page"><div className="panel impact-hero"><div><span className="eyebrow">REGULATORY CHANGE IMPACT SIMULATOR</span><h2>Don't just track amendments. <span>See what they change.</span></h2><p>Simulate a future effective date and identify which checks, products and inspection workflows would be affected.</p></div><div className="engine-badge"><GitBranch size={28}/><b>What-if analysis</b><span>Version → impact → action</span></div></div><div className="impact-controls panel"><div><span className="eyebrow">SELECT AMENDMENT</span><h3>Future regulation scenario</h3></div><div className="impact-buttons"><button className={year==='2026'?'impact-option active':'impact-option'} onClick={()=>{setYear('2026');setRun(false)}}>2026 · Effective now</button><button className={year==='2027'?'impact-option active':'impact-option'} onClick={()=>{setYear('2027');setRun(false)}}>2027 · Future effective date</button><button className="primary" onClick={()=>setRun(true)}><Zap size={16}/> Simulate impact</button></div></div>{run&&<><div className="impact-metrics"><Metric label="Affected products" value={d.affected}/><Metric label="Checks requiring update" value={d.checks}/><Metric label="Effective date" value={d.effective}/><Metric label="Impact scope" value="Operational"/></div><div className="reg-grid"><div className="panel"><div className="panel-head"><div><h3>{d.title}</h3><p>{d.impact}</p></div><span className="tiny-pill pill-warn">CHANGE DETECTED</span></div><div className="impact-action-list">{d.actions.map((x,i)=><div className="impact-action" key={x}><span>{i+1}</span><div><b>{x}</b><small>Workflow update recommended</small></div></div>)}</div></div><div className="panel"><div className="panel-head"><div><h3>Before → After</h3><p>Operational effect of the selected version.</p></div></div><div className="before-after"><div><span>BEFORE</span><b>Static compliance checklist</b><small>Inspector checks the existing rule set.</small></div><ArrowRight size={20}/><div className="after"><span>AFTER</span><b>Version-aware checklist</b><small>Applicability and evidence requirements update with the effective rule.</small></div></div></div></div></>}</section>
}

function RiskPrioritizationPage(){
  const [sort,setSort]=useState('risk')
  const rows=[
    {rank:1,product:'Imported Cosmetics',risk:94,level:'HIGH',signals:'Origin declaration · missing importer address · prior finding'},
    {rank:2,product:'Imported Packaged Food',risk:87,level:'HIGH',signals:'Imported · low OCR confidence · incomplete back panel'},
    {rank:3,product:'Online Electronics Listing',risk:78,level:'MEDIUM',signals:'E-commerce · country-of-origin filter review'},
    {rank:4,product:'Household Cleaning Product',risk:61,level:'MEDIUM',signals:'Net quantity readability · side panel pending'},
    {rank:5,product:'Local Grocery Item',risk:22,level:'LOW',signals:'No major findings · complete evidence'}
  ]
  const list=sort==='risk'?[...rows].sort((a,b)=>b.risk-a.risk):[...rows].sort((a,b)=>a.product.localeCompare(b.product))
  return <section className="risk-page"><div className="panel risk-hero"><div><span className="eyebrow">RISK-BASED INSPECTION PRIORITIZATION</span><h2>Inspect the <span>highest-risk cases first.</span></h2><p>Prioritize field work using explainable signals. Risk supports scheduling; it never declares a legal violation by itself.</p></div><div className="engine-badge"><AlertTriangle size={28}/><b>Decision support</b><span>Signals → priority</span></div></div><div className="panel"><div className="panel-head"><div><h3>Inspection queue</h3><p>Transparent risk signals behind every priority.</p></div><div className="impact-buttons"><button className={sort==='risk'?'impact-option active':'impact-option'} onClick={()=>setSort('risk')}>Highest risk</button><button className={sort==='name'?'impact-option active':'impact-option'} onClick={()=>setSort('name')}>Product name</button></div></div><div className="risk-table">{list.map(r=><div className="risk-row" key={r.product}><div className="risk-rank">#{r.rank}</div><div className="risk-product"><b>{r.product}</b><span>{r.signals}</span></div><div className="risk-score"><b>{r.risk}</b><span>/100</span></div><span className={`risk-level ${r.level.toLowerCase()}`}>{r.level}</span><button className="secondary" onClick={()=>alert(`Priority case: ${r.product}\nRisk ${r.risk}/100\nSignals: ${r.signals}`)}>Why?</button></div>)}</div></div><div className="panel risk-note"><AlertTriangle size={18}/><div><b>Important: prioritization ≠ enforcement decision</b><span>The system ranks which inspections may deserve attention first. The inspector still reviews the evidence and applicable regulation before recording a finding.</span></div></div></section>
}

function HistoryPage({scans,search,setSearch,openScan,deleteScan}){return <section className="panel history-panel"><div className="panel-head"><div><h3>Scan history</h3><p>Search, open and delete inspection records.</p></div><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inspections…"/></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Inspection</th><th>Mode</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead><tbody>{scans.map(s=><tr key={s.id}><td>{new Date(s.created_at).toLocaleString()}</td><td><b>#{s.id.slice(0,8)}</b><small>{s.filename||'Demo scan'}</small></td><td>{s.mode}</td><td><b>{s.score}</b></td><td><span className={`table-status ${s.status}`}>{s.status==='GREEN'?'Looks compliant':s.status==='YELLOW'?'Needs review':'Potential issue'}</span></td><td className="row-actions"><button className="open-btn" onClick={()=>openScan(s.id)}>Open</button><button className="delete-btn" onClick={()=>deleteScan(s.id)}><Trash2 size={14}/></button></td></tr>)}{!scans.length&&<tr><td colSpan="6" className="empty-row">No scans yet.</td></tr>}</tbody></table></div></section>}

function RulesPage({rules}){return <section className="panel"><div className="panel-head"><div><h3>Versioned prototype rule library</h3><p>Rule logic is structured independently from the UI.</p></div><span className="tiny-pill">{rules.length} RULES</span></div><div className="notice"><ShieldCheck size={17}/><span>Prototype rule set — verify against the latest official regulations before production use.</span></div><div className="table-wrap"><table><thead><tr><th>Rule</th><th>Field</th><th>Requirement</th><th>Severity</th><th>Weight</th><th>Version</th><th>Applicability</th></tr></thead><tbody>{rules.map(r=><tr key={r.rule_id}><td><b>{r.rule_id}</b></td><td>{fieldLabels[r.field]||r.field}</td><td>{r.requirement}</td><td><span className={`severity ${r.severity.toLowerCase()}`}>{r.severity}</span></td><td>{r.weight}</td><td>{r.version}</td><td>{r.applicability||'Always'}</td></tr>)}</tbody></table></div></section>}

function AnalyticsPage({dashboard,scans}){const bars=dashboard.top_violations?.slice(0,6)||[]; const max=Math.max(1,...bars.map(x=>x.c)); return <section className="analytics-grid"><div className="panel"><div className="panel-head"><div><h3>Violation intelligence</h3><p>Recurring findings from local inspection history.</p></div></div>{bars.length ? <div className="bar-list">{bars.map((x,i)=><div className="bar-row" key={i}><div><b>{x.title}</b><span>{x.c} occurrence{x.c===1?'':'s'}</span></div><div className="bar-bg"><i style={{width:`${Math.round(x.c/max*100)}%`}}/></div></div>)} </div> : <div className="empty-state"><BarChart3 size={30}/><b>No analytics yet</b><span>Run a few inspections to populate recurring violations.</span></div>}</div><div className="panel"><div className="panel-head"><div><h3>Inspection health</h3><p>Useful operating metrics.</p></div></div><div className="metric-stack"><Metric label="Total scans" value={dashboard.total||0}/><Metric label="Average screening score" value={`${dashboard.average_score||0}/100`}/><Metric label="Looks compliant" value={dashboard.by_status?.GREEN||0}/><Metric label="Needs review" value={dashboard.by_status?.YELLOW||0}/><Metric label="Potential violations" value={dashboard.by_status?.RED||0}/><Metric label="Stored inspections" value={scans.length}/></div></div></section>}
function Metric({label,value}){return <div className="metric"><span>{label}</span><b>{value}</b></div>}

function ReportsPage({scans,openScan}){return <section className="panel"><div className="panel-head"><div><h3>Screening reports</h3><p>Open a scan, then export PDF or editable CSV.</p></div></div>{scans.length ? <div className="report-grid">{scans.slice(0,12).map(s=><div className="report-card" key={s.id}><div className="report-icon"><FileText size={20}/></div><div><b>Inspection #{s.id.slice(0,8)}</b><span>{new Date(s.created_at).toLocaleString()}</span><span>{s.score}/100 · {s.status}</span></div><button className="secondary" onClick={()=>openScan(s.id)}>Open</button></div>)}</div> : <div className="empty-state"><FileText size={30}/><b>No reports yet</b><span>Run an inspection to generate a report.</span></div>}</section>}

function ComplaintPage({scan,setToast}){
  const [form,setForm]=useState({product_name:scan?.fields?.product_name||'',shop_or_website:'',location:'',incident_at:new Date().toISOString().slice(0,16),description:''})
  const [files,setFiles]=useState([]); const [submitted,setSubmitted]=useState(null); const [tracking,setTracking]=useState(''); const [status,setStatus]=useState(null); const [busy,setBusy]=useState(false)
  const submit=async()=>{setBusy(true); try{const fd=new FormData(); if(scan?.id) fd.append('scan_id',scan.id); Object.entries(form).forEach(([k,v])=>fd.append(k,v)); files.forEach(f=>fd.append('files',f)); const r=await fetch(`${API}/complaints`,{method:'POST',body:fd}); const d=await r.json(); if(!r.ok) throw new Error(d.detail||'Complaint submission failed'); setSubmitted(d); setTracking(d.reference_no); setToast('Complaint submitted with a reference number.')}catch(e){setToast(e.message)}finally{setBusy(false)}}
  const track=async()=>{if(!tracking)return; const r=await fetch(`${API}/complaints/${encodeURIComponent(tracking)}`); const d=await r.json(); if(!r.ok){setStatus(null);setToast(d.detail||'Complaint not found');return} setStatus(d)}
  return <section className="feature-page"><div className="feature-hero"><div><span className="eyebrow">CONSUMER → INSPECTOR WORKFLOW</span><h2>One-click <span>complaint filing.</span></h2><p>Attach evidence, automatically carry the detected screening finding, and receive a trackable reference number. A complaint is a preliminary report — an inspector must verify it.</p></div><div className="feature-icon"><FilePlus2 size={30}/><b>PRELIMINARY REPORT</b><span>Verification required</span></div></div>
    <div className="feature-grid"><div className="panel"><div className="panel-head"><div><h3>Submit suspected violation</h3><p>Fields marked by PackCheck are pre-filled from the current scan.</p></div><span className="tiny-pill">{scan?.violations?.length||0} FINDINGS ATTACHED</span></div>
      {scan?.violations?.length ? <div className="attached-finding"><ShieldAlert size={17}/><div><b>Detected violation attached automatically</b><span>{scan.violations.slice(0,3).map(v=>v.title).join(' · ')}</span></div></div>:<div className="notice"><Info size={16}/><span>Open a scan first if you want PackCheck to attach a detected finding automatically.</span></div>}
      <div className="form-grid"><label>Product name<input value={form.product_name} onChange={e=>setForm({...form,product_name:e.target.value})}/></label><label>Shop / website<input value={form.shop_or_website} onChange={e=>setForm({...form,shop_or_website:e.target.value})}/></label><label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>Date & time<input type="datetime-local" value={form.incident_at} onChange={e=>setForm({...form,incident_at:e.target.value})}/></label></div>
      <label className="full-label">Description<textarea rows="5" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe what you observed…"/></label>
      <label className="upload-box"><Upload size={20}/><b>Attach product photos / bill / invoice</b><span>Up to 6 files, max 10 MB each.</span><input type="file" multiple accept="image/*,.pdf" onChange={e=>setFiles([...e.target.files])}/></label>
      <div className="selected-files">{files.map(f=><span key={f.name}>{f.name}</span>)}</div><button className="primary" disabled={busy} onClick={submit}>{busy?<><RefreshCw className="spin" size={16}/> Submitting…</>:<><Send size={16}/> Submit complaint</>}</button>
    </div><div className="panel"><div className="panel-head"><div><h3>Track a complaint</h3><p>Use the reference number returned after submission.</p></div><Hash size={18}/></div><div className="track-box"><input value={tracking} onChange={e=>setTracking(e.target.value.toUpperCase())} placeholder="PC-20260826-ABC123"/><button className="secondary" onClick={track}><Search size={15}/> Track</button></div>{submitted&&<ComplaintStatus item={submitted}/>} {status&&<ComplaintStatus item={status}/>} {!submitted&&!status&&<div className="empty-state"><Clock size={28}/><b>No complaint selected</b><span>Submit one or enter a reference number.</span></div>}</div></div>
    <div className="panel safety-note"><UserCheck size={18}/><div><b>Preliminary report, not proof of guilt</b><span>PackCheck attaches its screening finding as evidence to help an inspector start an investigation. It does not determine legal guilt or automatically trigger enforcement.</span></div></div></section>
}
function ComplaintStatus({item}){return <div className="complaint-status"><div><span>Reference</span><b>{item.reference_no}</b></div><div><span>Status</span><b>{item.status}</b></div><div><span>Detected finding</span><b>{item.detected_violation||'None attached'}</b></div><div><span>Evidence files</span><b>{item.attached_files?.length||0}</b></div></div>}

function InspectorComplaintCenter({setToast,openScan}){
  const [items,setItems]=useState([]); const [selected,setSelected]=useState(null); const [busy,setBusy]=useState(true)
  const load=async()=>{setBusy(true); try{const r=await fetch(`${API}/complaints`,{cache:'no-store'}); const d=await parseResponse(r); if(!r.ok)throw new Error(d.detail||'Could not load complaints'); setItems(Array.isArray(d)?d:[]); if(selected){const fresh=(Array.isArray(d)?d:[]).find(x=>x.reference_no===selected.reference_no); if(fresh)setSelected(fresh)} else if(d?.length)setSelected(d[0])}catch(e){setToast(e.message||'Could not load complaints')}finally{setBusy(false)}}
  useEffect(()=>{load()},[])
  return <section className="feature-page">
    <div className="feature-hero"><div><span className="eyebrow">CONSUMER → INSPECTOR WORKFLOW</span><h2>Review submitted <span>consumer complaints.</span></h2><p>Every complaint appears here with its reference number, product details, detected finding and attached evidence so an inspector can investigate it.</p></div><div className="feature-icon"><ShieldAlert size={30}/><b>INSPECTOR REVIEW</b><span>{items.length} submitted</span></div></div>
    <div className="feature-grid complaints-inspector-grid">
      <div className="panel"><div className="panel-head"><div><h3>Complaint inbox</h3><p>Newest submissions appear first.</p></div><button className="secondary" onClick={load} disabled={busy}><RefreshCw size={15} className={busy?'spin':''}/> Refresh</button></div>
        {busy?<div className="empty-state"><RefreshCw size={28} className="spin"/><b>Loading complaints…</b></div>:!items.length?<div className="empty-state"><FilePlus2 size={30}/><b>No consumer complaints yet</b><span>A complaint submitted in Consumer Mode will appear here automatically.</span></div>:<div className="complaint-list">{items.map(item=><button key={item.reference_no} className={`complaint-list-item ${selected?.reference_no===item.reference_no?'active':''}`} onClick={()=>setSelected(item)}><div><b>{item.reference_no}</b><span>{item.product_name||'Product not specified'}</span><small>{new Date(item.created_at).toLocaleString()}</small></div><strong className={`complaint-chip ${item.status==='SUBMITTED'?'submitted':''}`}>{item.status}</strong></button>)}</div>}
      </div>
      <div className="panel">{selected?<InspectorComplaintDetail item={selected} openScan={openScan}/>:<div className="empty-state"><ShieldAlert size={30}/><b>Select a complaint</b><span>Review the consumer's submitted report and evidence.</span></div>}</div>
    </div>
  </section>
}

function InspectorComplaintDetail({item,openScan}){
  const [scan,setScan]=useState(null);
  useEffect(()=>{let ok=true; if(item.scan_id){fetch(`${API}/scans/${item.scan_id}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(ok)setScan(d)}).catch(()=>{})} return()=>{ok=false}},[item.scan_id])
  return <div className="complaint-detail"><div className="panel-head"><div><span className="eyebrow">COMPLAINT RECORD</span><h3>{item.reference_no}</h3><p>Submitted {new Date(item.created_at).toLocaleString()}</p></div><span className="tiny-pill pill-warn">{item.status}</span></div>
    <div className="complaint-detail-grid">
      <div className="complaint-detail-block"><span>Product</span><b>{item.product_name||'Not specified'}</b></div>
      <div className="complaint-detail-block"><span>Shop / Website</span><b>{item.shop_or_website||'Not specified'}</b></div>
      <div className="complaint-detail-block"><span>Location</span><b>{item.location||'Not specified'}</b></div>
      <div className="complaint-detail-block"><span>Incident</span><b>{item.incident_at?new Date(item.incident_at).toLocaleString():'Not specified'}</b></div>
    </div>
    <div className="attached-finding"><ShieldAlert size={17}/><div><b>Detected finding</b><span>{item.detected_violation||'No automated finding attached; inspect the consumer description and evidence.'}</span></div></div>
    <div className="complaint-description"><span>Consumer description</span><p>{item.description||'No additional description provided.'}</p></div>
    <div><div className="panel-head"><div><h4>Evidence submitted</h4><p>{item.attached_files?.length||0} file(s)</p></div></div>{item.attached_files?.length?<div className="complaint-evidence">{item.attached_files.map(name=><a key={name} className="evidence-file" href={`/complaint-files/${encodeURIComponent(name)}`} target="_blank" rel="noreferrer"><FileText size={15}/><span>{name}</span><ExternalLink size={13}/></a>)}</div>:<div className="notice"><Info size={15}/><span>No files were attached.</span></div>}</div>
    {scan&&<div className="complaint-linked-scan"><div><span>Linked PackCheck inspection</span><b>{scan.id.slice(0,8)} · {scan.score}/100 · {scan.status}</b></div><button className="secondary" onClick={()=>openScan(scan.id)}><ExternalLink size={14}/> Open inspection</button></div>}
    <div className="safety-note"><UserCheck size={18}/><div><b>Inspector action</b><span>Review evidence, open the linked inspection and verify the allegation before taking enforcement action. A consumer complaint is a lead, not a legal finding.</span></div></div>
  </div>
}

function FraudDetectorPage({setToast}){
  const [f,setF]=useState({mrp:'100',selling_price:'100',quantity:'800',unit:'g',compare_price:'110',compare_quantity:'1000',compare_unit:'g',listing_price:'100',listing_quantity:'800',listing_unit:'g'}); const [r,setR]=useState(null); const [busy,setBusy]=useState(false)
  const calc=async()=>{setBusy(true); try{const payload={...f}; ['mrp','selling_price','quantity','compare_price','compare_quantity','listing_price','listing_quantity'].forEach(k=>payload[k]=payload[k]===''?null:Number(payload[k])); const res=await fetch(`${API}/fraud/check`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const d=await res.json(); if(!res.ok)throw new Error(d.detail||'Fraud check failed'); setR(d)}catch(e){setToast(e.message)}finally{setBusy(false)}}
  const field=(k,label)=><label>{label}<input type="number" min="0" value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>
  return <section className="feature-page"><div className="feature-hero"><div><span className="eyebrow">CONSUMER PRICE & QUANTITY INTELLIGENCE</span><h2>Detect MRP & quantity <span>anomalies.</span></h2><p>Normalize package sizes and compare printed MRP, selling price, unit price and e-commerce listing values. Results are screening signals that should be verified against the invoice and physical pack.</p></div><div className="feature-icon"><Receipt size={30}/><b>UNIT PRICE ENGINE</b><span>₹ / kg · litre · metre · unit</span></div></div>
    <div className="feature-grid"><div className="panel"><div className="panel-head"><div><h3>Package values</h3><p>Try the real example: ₹100 for 800 g vs ₹110 for 1 kg.</p></div></div><div className="form-grid">{field('mrp','Printed MRP (₹)')}{field('selling_price','Shop / online selling price (₹)')}{field('quantity','Net quantity') }<label>Unit<select value={f.unit} onChange={e=>setF({...f,unit:e.target.value})}><option>g</option><option>kg</option><option>ml</option><option>l</option><option>m</option><option>unit</option></select></label></div><h4>Comparison product</h4><div className="form-grid">{field('compare_price','Comparison price (₹)')}{field('compare_quantity','Comparison quantity')}<label>Comparison unit<select value={f.compare_unit} onChange={e=>setF({...f,compare_unit:e.target.value})}><option>g</option><option>kg</option><option>ml</option><option>l</option><option>m</option><option>unit</option></select></label></div><h4>E-commerce listing</h4><div className="form-grid">{field('listing_price','Listing price (₹)')}{field('listing_quantity','Listing quantity')}<label>Listing unit<select value={f.listing_unit} onChange={e=>setF({...f,listing_unit:e.target.value})}><option>g</option><option>kg</option><option>ml</option><option>l</option><option>m</option><option>unit</option></select></label></div><button className="primary" onClick={calc} disabled={busy}>{busy?<><RefreshCw className="spin" size={16}/> Checking…</>:<><SearchCheck size={16}/> Run fraud screen</>}</button></div>
      <div className="panel">{r?<FraudResult result={r}/>:<div className="empty-state"><IndianRupee size={30}/><b>Run a comparison</b><span>The detector will calculate normalized unit prices and flag potential mismatches.</span></div>}</div></div></section>
}
function FraudResult({result:r}){return <div className="fraud-result"><div className={`fraud-banner ${r.potential_overcharge||r.listing_mismatch?'warn':'good'}`}><div><span className="eyebrow">SCREENING RESULT</span><h3>{r.potential_overcharge?'Potential overcharging signal':r.listing_mismatch?'Listing mismatch signal':'No obvious mismatch detected'}</h3><p>{r.flags.join(' ')}</p></div><div className="fraud-big">₹{r.printed_unit_price}<small>{r.unit_label}</small></div></div><div className="fraud-metrics"><Metric label="Printed unit price" value={`₹${r.printed_unit_price} ${r.unit_label}`}/><Metric label="Selling unit price" value={`₹${r.selling_unit_price} ${r.unit_label}`}/><Metric label="Potential overcharge" value={`₹${r.overcharge_amount}`}/>{r.comparison&&<Metric label="Vs comparison" value={`${r.comparison.delta_percent}%`}/>}</div>{r.comparison&&<div className="comparison-callout"><b>Unit economics</b><span>Your package is {Math.abs(r.comparison.delta_percent)}% {r.comparison.delta_percent>0?'more expensive':'cheaper'} per normalized unit than the comparison product.</span></div>}{r.listing&&<div className="comparison-callout"><b>E-commerce check</b><span>Listing unit price ₹{r.listing.unit_price} vs package-derived ₹{r.listing.package_unit_price} ({r.listing.delta_percent}% difference).</span></div>}<div className="notice"><ShieldAlert size={16}/><span>Potential mismatch ≠ automatic legal violation. Verify the invoice, package, quantity and applicable rule before action.</span></div></div>}

function PassportPage({scans,activeScan,setToast}){
  const eligibleScans = useMemo(() => {
    const seenDemoScenarios = new Set()
    return scans.filter(s=>s.status==='GREEN').filter(s=>{
      // Demo scans are intentionally repeated when testing. Keep one option per demo scenario,
      // but never collapse real/live inspections that have unique IDs.
      if (s.scenario) {
        if (seenDemoScenarios.has(s.scenario)) return false
        seenDemoScenarios.add(s.scenario)
      }
      return true
    })
  }, [scans])
  const [selected,setSelected]=useState(activeScan?.id || eligibleScans[0]?.id || '')
  const [passport,setPassport]=useState(null); const [registry,setRegistry]=useState([]); const [busy,setBusy]=useState(false)
  useEffect(()=>{
    if (!selected && eligibleScans[0]?.id) setSelected(eligibleScans[0].id)
    if (selected && !eligibleScans.some(s=>s.id===selected)) setSelected(eligibleScans[0]?.id || '')
  },[eligibleScans,selected])
  const load=async()=>{try{const r=await fetch(`${API}/passports`,{cache:'no-store'}); if(r.ok)setRegistry(await r.json())}catch{setRegistry([])}}; useEffect(()=>{load()},[])
  const create=async()=>{if(!selected)return;setBusy(true);try{const r=await fetch(`${API}/passports/from-scan/${selected}`,{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Passport creation failed');setPassport(d);load();setToast('Verified product passport created in the registry.')}catch(e){setToast(e.message)}finally{setBusy(false)}}
  return <section className="feature-page"><div className="feature-hero"><div><span className="eyebrow">SIGNED PRODUCT IDENTITY</span><h2>Verified Product <span>Passport.</span></h2><p>A registry record links the product declaration snapshot, regulation version and inspection. The QR carries a signed registry reference so the record can be integrity-checked.</p></div><div className="feature-icon"><QrCode size={30}/><b>REGISTRY + QR</b><span>Signed verification record</span></div></div>
    <div className="feature-grid"><div className="panel"><div className="panel-head"><div><h3>Create passport from a compliant scan</h3><p>Only GREEN screening records can issue a prototype passport.</p></div><span className="tiny-pill">{eligibleScans.length} ELIGIBLE</span></div><label>Choose compliant inspection<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select a scan…</option>{eligibleScans.map(s=><option key={s.id} value={s.id}>{s.scenario ? `${s.scenario.toUpperCase()} · ` : ''}{s.filename||s.category||'Inspection'} · {s.score}/100</option>)}</select></label><button className="primary" onClick={create} disabled={!selected||busy}>{busy?<><RefreshCw className="spin" size={16}/> Creating…</>:<><QrCode size={16}/> Create / refresh passport</>}</button>{passport&&<div className="passport-card"><div><span className="eyebrow">VERIFIED PRODUCT PASSPORT</span><h3>{passport.product_name}</h3><p>{passport.passport_id}</p><div className="passport-status"><BadgeCheck size={16}/> {passport.signature_valid?'SIGNATURE VALID':'SIGNATURE INVALID'}</div></div><img src={`${API}${passport.qr_url.replace(/^\/api/, '')}?v=${encodeURIComponent(passport.passport_id)}`} alt="Passport QR"/><div className="passport-details"><span>Registry status</span><b>{passport.status}</b><span>Regulation snapshot</span><b>{passport.payload.rule_version}</b><span>Created</span><b>{new Date(passport.created_at).toLocaleString()}</b></div><div className="passport-public-link"><span>Phone scan URL</span><code>{passport.public_url}</code></div><a className="secondary" href={passport.public_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open passport page</a></div>}</div>
      <div className="panel"><div className="panel-head"><div><h3>Central registry</h3><p>Every verified passport can be checked independently.</p></div><Store size={18}/></div>{registry.length?<div className="passport-registry">{registry.map(p=><div className="registry-row" key={p.passport_id}><div className="registry-icon"><QrCode size={17}/></div><div><b>{p.product_name}</b><span>{p.passport_id} · {p.status}</span></div><span className={p.signature_valid?'valid-chip':'invalid-chip'}>{p.signature_valid?'SIGNED':'INVALID'}</span><a href={`${API}${p.registry_url}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a></div>)}</div>:<div className="empty-state"><QrCode size={28}/><b>No passports issued</b><span>Run the compliant demo, then create a passport.</span></div>}</div></div>
    <div className="panel safety-note"><ShieldCheck size={18}/><div><b>What “tamper-evident” means here</b><span>The prototype signs the registry payload with an HMAC and checks the signature when the passport is opened. This detects record modification; it does not prevent someone from copying a QR code, so production would require stronger product-identity binding.</span></div></div></section>
}

function PublicPassportRoute({passportId}) {
  const [state, setState] = useState({ phase: 'loading', step: 1, data: null, error: '' })

  const verify = async () => {
    setState({ phase: 'loading', step: 1, data: null, error: '' })
    const encoded = encodeURIComponent(passportId)
    const originUrl = `${window.location.origin}/api/passports/${encoded}`
    const backendHost = window.location.hostname || '127.0.0.1'
    const directUrl = `${window.location.protocol}//${backendHost}:8000/api/passports/${encoded}`
    const urls = [originUrl, directUrl]

    let lastError = 'Unable to verify passport.'
    for (const url of urls) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } })
        const raw = await response.text()
        let data = null
        try { data = raw ? JSON.parse(raw) : null } catch { data = null }
        if (!response.ok || !data?.passport_id) {
          throw new Error(data?.detail || `Registry returned HTTP ${response.status}.`)
        }
        setState({ phase: 'loading', step: 2, data: null, error: '' })
        await new Promise(r => setTimeout(r, 160))
        setState({ phase: 'loading', step: 3, data: null, error: '' })
        await new Promise(r => setTimeout(r, 160))
        setState({ phase: 'ready', step: 4, data, error: '' })
        return
      } catch (err) {
        lastError = err?.name === 'AbortError'
          ? 'Registry verification timed out. Make sure the PackCheck backend is running on port 8000.'
          : (err?.message || lastError)
      } finally {
        clearTimeout(timeout)
      }
    }
    setState({ phase: 'error', step: 0, data: null, error: lastError })
  }

  useEffect(() => { verify() }, [passportId])

  if (state.phase === 'loading') return <PublicPassportLoading step={state.step}/>
  if (state.phase === 'error') return <div className="public-passport-shell"><div className="public-passport-card public-error"><div className="public-badge invalid"><X size={16}/> VERIFICATION UNAVAILABLE</div><h1>Passport verification could not complete</h1><p>{state.error}</p><p className="public-hint">The QR page is reachable, but the registry record could not be fetched.</p><button className="primary" onClick={verify}><RefreshCw size={15}/> Retry verification</button><a href="/" className="public-back">Open PackCheck</a></div></div>
  return <PublicPassportPage passport={state.data}/>
}

function PublicPassportLoading({step=1}){return <div className="public-passport-shell"><div className="public-passport-loader"><QrCode size={34}/><span className="public-eyebrow">DIGITAL PRODUCT PASSPORT</span><h1>Verifying product passport…</h1><p>Checking the signed registry record and integrity signature.</p><div className="passport-verify-steps"><span className={step>=1?'done':''}><i>1</i> Passport ID located</span><span className={step>=2?'done':'active'}><i>2</i> Registry record checked</span><span className={step>=3?'done':''}><i>3</i> Signature validated</span></div><div className="passport-verify-progress"><span className="passport-verify-spinner"/> {step>=3?'Loading verified passport':'Live registry verification in progress'}</div></div></div>}
function PublicPassportPage({passport}){
  if(passport?.__error) return <div className="public-passport-shell"><div className="public-passport-card public-error"><div className="public-badge invalid"><X size={16}/> VERIFICATION UNAVAILABLE</div><h1>Passport verification could not complete</h1><p>{passport.__error}</p><p className="public-hint">The page is reachable, but the registry API did not return a valid passport record. Make sure the FastAPI backend is running and the HTTPS PackCheck URL points to the frontend on port 5173.</p><button className="primary" onClick={()=>window.location.reload()}><RefreshCw size={15}/> Retry verification</button><a href="/" className="public-back">Open PackCheck</a></div></div>
  const valid=Boolean(passport?.signature_valid)
  if(!passport) return <div className="public-passport-shell"><div className="public-passport-card public-error"><div className="public-badge invalid"><X size={16}/> NOT FOUND</div><h1>Passport not found</h1><p>This QR code does not match a registered PackCheck product passport.</p><a href="/" className="public-back">Open PackCheck</a></div></div>
  const payload=passport.payload||{}
  return <div className="public-passport-shell">
    <div className="public-passport-topbar"><div className="public-brand"><div className="public-brand-mark"><ShieldCheck size={22}/></div><div><b>PackCheck</b><span>Verified Product Passport</span></div></div><div className="public-live"><span/> LIVE REGISTRY</div></div>
    <main className="public-passport-main">
      <section className={`public-status-hero ${valid?'verified':'invalid'}`}>
        <div className="public-status-icon">{valid?<BadgeCheck size={34}/>:<ShieldAlert size={34}/>}</div>
        <div><span className="public-eyebrow">DIGITAL PRODUCT PASSPORT</span><h1>{valid?'Verified product':'Verification failed'}</h1><p>{valid?'The signed registry record matches this passport.':'The registry record could not be verified.'}</p></div>
        <div className={`public-status-pill ${valid?'ok':'bad'}`}><span className="status-dot"/>{valid?'SIGNATURE VALID':'SIGNATURE INVALID'}</div>
      </section>

      <section className="public-grid">
        <article className="public-panel product-panel"><div className="public-panel-label">PRODUCT</div><h2>{passport.product_name}</h2><p className="public-passport-id">{passport.passport_id}</p><div className="public-details">
          <div><span>Passport ID</span><b>{passport.passport_id}</b></div>
          <div><span>Status</span><b>{passport.status}</b></div>
          <div><span>Regulation snapshot</span><b>{payload.rule_version || 'Not specified'}</b></div>
          <div><span>GTIN / identifier</span><b>{passport.gtin || 'Not detected'}</b></div>
          <div><span>Verified at</span><b>{new Date(passport.created_at).toLocaleString()}</b></div>
          <div><span>Integrity</span><b>{valid?'Registry signature matched':'Signature mismatch'}</b></div>
        </div></article>

        <article className="public-panel qr-panel"><div className="public-panel-label">SCAN RESULT</div><div className="qr-check"><div className="qr-mini"><QrCode size={68}/></div><div><b>{valid?'This QR is linked to a verified registry record.':'This QR could not be verified.'}</b><span>No raw API data is exposed to the consumer.</span></div></div><div className="public-actions"><button onClick={()=>window.location.reload()}><RefreshCw size={15}/> Verify again</button><a href="/" className="public-back">Open PackCheck</a></div></article>
      </section>

      <section className="public-panel assurance-panel"><div className="public-panel-label">WHAT THIS VERIFICATION MEANS</div><div className="assurance-grid"><div><BadgeCheck size={18}/><div><b>Registry match</b><span>The QR resolves to a stored passport record.</span></div></div><div><ShieldCheck size={18}/><div><b>Integrity check</b><span>The signed payload was verified before showing this result.</span></div></div><div><Info size={18}/><div><b>Human verification</b><span>AI screening supports inspection; it does not certify legal compliance by itself.</span></div></div></div></section>
      <footer className="public-footer">PackCheck AI · AI-assisted Legal Metrology screening · Prototype verification page</footer>
    </main>
  </div>
}

function SettingsPage(){return <section className="settings-grid"><div className="panel"><div className="panel-head"><div><h3>Prototype settings</h3><p>Safe defaults for the hackathon build.</p></div></div><div className="setting-row"><div><b>Rule set</b><span>{'PCR-2026-07 · effective 01 Jul 2026'}</span></div><span className="settings-badge">ACTIVE</span></div><div className="setting-row"><div><b>Data retention</b><span>Uploaded images are stored locally for demo/reporting.</span></div><span className="settings-badge">LOCAL</span></div><div className="setting-row"><div><b>AI positioning</b><span>Screening support only — no legal certification claim.</span></div><span className="settings-badge">SAFE</span></div><div className="setting-row"><div><b>OCR</b><span>ABBYY Cloud OCR SDK primary when configured; PaddleOCR + Tesseract local fallbacks.</span></div><span className="settings-badge">LOCAL</span></div></div><div className="panel"><div className="panel-head"><div><h3>Demo checklist</h3><p>Use this sequence for the SIH presentation.</p></div></div><Checklist text="Select Needs review demo"/><Checklist text="Show 71/100 result and findings"/><Checklist text="Open a violation card"/><Checklist text="Edit a declaration and re-check"/><Checklist text="Export PDF report"/></div></section>}
function Checklist({text}){return <div className="check-item"><CheckCircle2 size={17}/><span>{text}</span></div>}

const publicPassportIdAtBoot = window.location.pathname.match(/^\/passport\/([^/]+)\/?$/)?.[1] || ''
createRoot(document.getElementById('root')).render(publicPassportIdAtBoot ? <PublicPassportRoute passportId={publicPassportIdAtBoot}/> : <App />)

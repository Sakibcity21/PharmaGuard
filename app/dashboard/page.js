"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { simulateDoseChange } from "../../lib/whatIfSimulator";
import DashboardTour from "./DashboardTour";

// ── Inline clinical note generator ──
function buildClinicalNote(results, safetyIndex) {
    const ts = new Date().toISOString();
    const pid = results[0]?.patient_id || "UNKNOWN";
    const drugSections = results.map(r => {
        const risk = r.risk_assessment;
        const pgx = r.pharmacogenomic_profile;
        const rec = r.clinical_recommendation;
        const vars = (pgx.detected_variants || []).map(v =>
            `    - ${v.rsid} (${v.gene} ${v.star_allele || ""}): Genotype ${v.genotype}, Impact: ${v.functional_impact}`
        ).join("\n") || "    - No pharmacogenomic variants detected; reference genotype assumed.";
        return `DRUG: ${r.drug}\n  Gene: ${pgx.primary_gene}\n  Diplotype: ${pgx.diplotype}\n  Phenotype: ${pgx.phenotype}\n  Risk: ${risk.risk_label} (${risk.severity})\n  Confidence: ${(risk.confidence_score * 100).toFixed(0)}%\n  Action: ${rec.action}\n  Dosing: ${rec.dosing_guideline}\n  Monitoring: ${rec.monitoring}${rec.alternatives?.length ? "\n  Alternatives: " + rec.alternatives.join(", ") : ""}\n  CPIC Level: A (Strong)\n  Reference: ${rec.cpic_guideline_reference}\n  Variants:\n${vars}`;
    }).join("\n\n" + "─".repeat(60) + "\n\n");
    return `══════════════════════════════════════════════════════════════\n  PHARMACOGENOMIC CLINICAL NOTE — PharmaGuard\n══════════════════════════════════════════════════════════════\nPatient ID: ${pid}\nGenerated: ${new Date(ts).toLocaleString()}\nSafety Index: ${safetyIndex?.score ?? "N/A"} / 100 (${safetyIndex?.level ?? ""})\n══════════════════════════════════════════════════════════════\n\n${drugSections}\n\n══════════════════════════════════════════════════════════════\nDISCLAIMER: For clinical decision support only. Not a substitute\nfor professional medical judgment. CPIC Guidelines 2024.\nGenerated: ${ts}\n══════════════════════════════════════════════════════════════`;
}

function buildPatientSummary(results, safetyIndex) {
    const lines = ["YOUR MEDICATION SAFETY REPORT", `Generated: ${new Date().toLocaleDateString()}`, ""];
    if (safetyIndex) {
        const e = safetyIndex.score >= 80 ? "✅" : safetyIndex.score >= 50 ? "⚠️" : "🚫";
        lines.push(`${e} Overall Safety Score: ${safetyIndex.score} / 100 (${safetyIndex.level})`, "");
    }
    for (const r of results) {
        const l = r.risk_assessment.risk_label;
        const e = l === "Safe" ? "✅" : l === "Adjust Dosage" ? "⚠️" : "🚫";
        lines.push(`${e} ${r.drug}`);
        lines.push(l === "Safe" ? "   Your body processes this medicine normally. Safe at standard doses."
            : l === "Adjust Dosage" ? "   Your body handles this differently. Your doctor may adjust the dose."
                : l === "Toxic" ? "   Your body could react seriously. Your doctor will likely use an alternative."
                    : "   This medicine may not work well for you. Better options exist.");
        lines.push("");
    }
    lines.push("─".repeat(50), "This report is for informational purposes only.", "Please discuss with your doctor.");
    return lines.join("\n");
}

// ============================================================
// CONSTANTS
// ============================================================
const SUPPORTED_DRUGS = [
    "CODEINE", "WARFARIN", "CLOPIDOGREL",
    "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
];

const GENES = [
    { name: "CYP2D6", desc: "Metabolizes ~25% of clinical drugs", chr: "22" },
    { name: "CYP2C19", desc: "Clopidogrel & PPI metabolism", chr: "10" },
    { name: "CYP2C9", desc: "Warfarin & NSAID metabolism", chr: "10" },
    { name: "SLCO1B1", desc: "Statin hepatic uptake transporter", chr: "12" },
    { name: "TPMT", desc: "Thiopurine metabolism", chr: "6" },
    { name: "DPYD", desc: "Fluoropyrimidine catabolism", chr: "1" },
];

const DRUG_META = {
    CODEINE: { gene: "CYP2D6", color: "#3b82f6", category: "Analgesic", indication: "Pain Management" },
    WARFARIN: { gene: "CYP2C9", color: "#f43f5e", category: "Anticoagulant", indication: "Blood Clot Prevention" },
    CLOPIDOGREL: { gene: "CYP2C19", color: "#0d9488", category: "Antiplatelet", indication: "Cardiovascular Protection" },
    SIMVASTATIN: { gene: "SLCO1B1", color: "#f59e0b", category: "Statin", indication: "Cholesterol Management" },
    AZATHIOPRINE: { gene: "TPMT", color: "#10b981", category: "Immunosuppressant", indication: "Autoimmune Disorders" },
    FLUOROURACIL: { gene: "DPYD", color: "#e11d48", category: "Chemotherapy", indication: "Cancer Treatment" },
};

const ANCESTRY_OPTIONS = [
    { id: "global", label: "Global Average" },
    { id: "south_asian", label: "South Asian" },
    { id: "east_asian", label: "East Asian" },
    { id: "african", label: "African / African American" },
    { id: "european", label: "European" },
    { id: "other", label: "Other / Mixed" },
];

const GENE_PLAIN = {
    CYP2D6: "a liver enzyme that processes pain medicines",
    CYP2C19: "a liver enzyme that activates heart medicines",
    CYP2C9: "a liver enzyme that breaks down blood thinners",
    SLCO1B1: "a liver transporter that absorbs cholesterol medicines",
    TPMT: "an enzyme that processes immune system medicines",
    DPYD: "an enzyme that breaks down chemotherapy medicines",
};

// ============================================================
// HELPERS
// ============================================================
const riskClass = (label) => {
    if (!label) return "unknown";
    const l = label.toLowerCase();
    if (l === "safe") return "safe";
    if (l === "adjust dosage") return "adjust";
    if (l === "toxic") return "toxic";
    if (l === "ineffective") return "ineff";
    return "unknown";
};

const sevLevel = (s) => ({ none: 0, low: 1, moderate: 2, high: 3, critical: 4 }[s] ?? 0);

// ============================================================
// PAGE
// ============================================================
export default function DashboardPage() {
    const router = useRouter();
    const [vcfFile, setVcfFile] = useState(null);
    const [drugInput, setDrugInput] = useState("");
    const [selected, setSelected] = useState([]);
    const [results, setResults] = useState(null);
    const [safetyIndex, setSafetyIndex] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({});
    const [toast, setToast] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef(null);
    const resultsRef = useRef(null);

    const [viewMode, setViewMode] = useState("clinician");
    const [ancestry, setAncestry] = useState("global");
    const [showSafetyBreakdown, setShowSafetyBreakdown] = useState(false);
    const [clinicalNote, setClinicalNote] = useState(null);
    const [whatIf, setWhatIf] = useState({});
    const [showTour, setShowTour] = useState(false);

    const flash = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const pickFile = useCallback((f) => {
        if (!f) return;
        if (!f.name.endsWith(".vcf")) { setError({ t: "Invalid File", d: "Upload a .vcf file." }); return; }
        if (f.size > 5 * 1024 * 1024) { setError({ t: "File Too Large", d: "Max 5 MB." }); return; }
        setVcfFile(f); setError(null);
    }, []);

    const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }, [pickFile]);

    const toggle = useCallback((d) => setSelected((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]), []);

    const loadSample = useCallback(async (name) => {
        try {
            const r = await fetch(`/samples/${name}`);
            const t = await r.text();
            setVcfFile(new File([t], name, { type: "text/plain" }));
            setError(null);
            flash("ok", `Loaded ${name}`);
        } catch { setError({ t: "Load Failed", d: "Could not fetch sample." }); }
    }, []);

    const analyze = useCallback(async () => {
        setError(null); setResults(null); setSafetyIndex(null); setClinicalNote(null); setWhatIf({});
        if (!vcfFile) { setError({ t: "No VCF File", d: "Upload a VCF file first." }); return; }
        const drugs = selected.length ? selected
            : drugInput.trim() ? drugInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : [];
        if (!drugs.length) { setError({ t: "No Drug", d: "Select or type a drug name." }); return; }

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("vcfFile", vcfFile);
            fd.append("drugNames", drugs.join(","));
            fd.append("ancestry", ancestry);
            const res = await fetch("/api/analyze", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) { setError({ t: data.error || "Error", d: data.details || "" }); setLoading(false); return; }

            const resultsList = data.results || (Array.isArray(data) ? data : [data]);
            setResults(resultsList);
            setSafetyIndex(data.safety_index || null);
            flash("ok", "Analysis complete!");
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
        } catch (e) { setError({ t: "Network Error", d: e.message }); }
        setLoading(false);
    }, [vcfFile, selected, drugInput, ancestry]);

    const handleWhatIf = (idx, dose) => {
        if (!results?.[idx]) return;
        const simResult = simulateDoseChange(results[idx], dose);
        setWhatIf(prev => ({ ...prev, [idx]: { dose, result: simResult } }));
    };

    const genNote = () => {
        if (!results) return;
        try {
            const note = buildClinicalNote(results, safetyIndex);
            setClinicalNote(note);
            flash("ok", "Clinical note generated!");
        } catch (err) {
            console.error("Clinical note error:", err);
            flash("err", "Failed to generate note");
        }
    };

    const downloadNote = () => {
        if (!clinicalNote) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([clinicalNote], { type: "text/plain" }));
        a.download = `pharmaguard_clinical_note_${Date.now()}.txt`;
        a.click();
    };

    const downloadPatientSummary = () => {
        if (!results) return;
        try {
            const summary = buildPatientSummary(results, safetyIndex);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([summary], { type: "text/plain" }));
            a.download = `patient_summary_${Date.now()}.txt`;
            a.click();
            flash("ok", "Patient summary downloaded!");
        } catch (err) {
            console.error("Patient summary error:", err);
            flash("err", "Failed to generate summary");
        }
    };

    const jsonStr = results ? JSON.stringify(results.length === 1 ? results[0] : results, null, 2) : "";
    const copyJson = () => { navigator.clipboard.writeText(jsonStr); setCopied(true); flash("ok", "Copied!"); setTimeout(() => setCopied(false), 2000); };
    const downloadJson = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([jsonStr], { type: "application/json" })); a.download = `pharmaguard_${Date.now()}.json`; a.click(); flash("ok", "Downloaded!"); };

    const toggleAcc = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

    const stats = results ? {
        total: results.length,
        safe: results.filter((r) => r.risk_assessment.risk_label === "Safe").length,
        warn: results.filter((r) => r.risk_assessment.risk_label === "Adjust Dosage").length,
        alert: results.filter((r) => ["Toxic", "Ineffective"].includes(r.risk_assessment.risk_label)).length,
    } : null;

    const isPatient = viewMode === "patient";

    return (
        <div className="app-layout">
            <DashboardTour forceStart={showTour} onClose={() => setShowTour(false)} />
            {/* ---- Sidebar ---- */}
            <aside className="sidebar">
                <div className="sidebar-brand"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="28" height="28"><defs><linearGradient id="sbGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0D9488" /><stop offset="50%" stopColor="#14B8A6" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs><path d="M32 4 L56 14 L56 30 Q56 48 32 60 Q8 48 8 30 L8 14 Z" fill="url(#sbGrad)" /><path d="M26 18 Q34 22 26 26 Q18 30 26 34 Q34 38 26 42 Q18 46 26 50" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" /><path d="M38 18 Q30 22 38 26 Q46 30 38 34 Q30 38 38 42 Q46 46 38 50" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" /><line x1="27" y1="22" x2="37" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="24" y1="26" x2="40" y2="26" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="27" y1="30" x2="37" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="24" y1="34" x2="40" y2="34" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="27" y1="38" x2="37" y2="38" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="24" y1="42" x2="40" y2="42" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="27" y1="46" x2="37" y2="46" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><rect x="30" y="11" width="4" height="8" rx="1" fill="rgba(255,255,255,0.35)" /><rect x="28" y="13" width="8" height="4" rx="1" fill="rgba(255,255,255,0.35)" /></svg></div>
                <nav className="sidebar-nav">
                    {/* Back to Home Button */}
                    <button className="sidebar-item" title="Back to Home" onClick={() => router.push("/")}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button className="sidebar-item active" title="Dashboard">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
                    </button>
                </nav>
                <div className="sidebar-bottom">
                    <button className="sidebar-item" title="Guided Tour" onClick={() => setShowTour(true)}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </button>
                </div>
            </aside>

            {/* ---- Main ---- */}
            <main className="main">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <button className="back-to-home-btn" onClick={() => router.push("/")} title="Back to Home">
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                                Home
                            </button>
                            <div>
                                <h1>PharmaGuard</h1>
                                <p>Pharmacogenomic Risk Prediction — Precision Medicine Dashboard</p>
                            </div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div id="tour-view-toggle" className="view-toggle" onClick={() => setViewMode(v => v === "clinician" ? "patient" : "clinician")}>
                            <span className={viewMode === "clinician" ? "vt-active" : ""}>🔬 Clinician</span>
                            <span className={viewMode === "patient" ? "vt-active" : ""}>👤 Patient</span>
                        </div>
                        <div className="header-status"><span className="status-dot" />System Active</div>
                        <div className="header-avatar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32"><defs><linearGradient id="haGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0D9488" /><stop offset="50%" stopColor="#14B8A6" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs><path d="M32 4 L56 14 L56 30 Q56 48 32 60 Q8 48 8 30 L8 14 Z" fill="url(#haGrad)" /><path d="M26 18 Q34 22 26 26 Q18 30 26 34 Q34 38 26 42 Q18 46 26 50" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" /><path d="M38 18 Q30 22 38 26 Q46 30 38 34 Q30 38 38 42 Q46 46 38 50" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" /><line x1="27" y1="22" x2="37" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="24" y1="26" x2="40" y2="26" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="27" y1="30" x2="37" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="24" y1="34" x2="40" y2="34" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="27" y1="38" x2="37" y2="38" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="24" y1="42" x2="40" y2="42" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><line x1="27" y1="46" x2="37" y2="46" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" /><rect x="30" y="11" width="4" height="8" rx="1" fill="rgba(255,255,255,0.35)" /><rect x="28" y="13" width="8" height="4" rx="1" fill="rgba(255,255,255,0.35)" /></svg></div>
                    </div>
                </header>

                {/* Safety Index Banner */}
                {safetyIndex && (
                    <div className={`safety-banner sb-${safetyIndex.score >= 80 ? "green" : safetyIndex.score >= 50 ? "yellow" : "red"}`}>
                        <div className="safety-main">
                            <div className="safety-score-ring" style={{ "--score-color": safetyIndex.color }}>
                                <span className="safety-score-num">{safetyIndex.score}</span>
                            </div>
                            <div className="safety-info">
                                <div className="safety-title">Genomic Drug Safety Index</div>
                                <div className="safety-level">{safetyIndex.level} · {results?.length} drugs analyzed</div>
                                {ancestry !== "global" && (
                                    <div className="pop-badge">🌍 Population-aware interpretation applied ({ANCESTRY_OPTIONS.find(a => a.id === ancestry)?.label})</div>
                                )}
                            </div>
                            <button className="safety-expand-btn" onClick={() => setShowSafetyBreakdown(p => !p)}>
                                {showSafetyBreakdown ? "Hide" : "View"} Breakdown ▾
                            </button>
                        </div>
                        {showSafetyBreakdown && (
                            <div className="safety-breakdown">
                                {safetyIndex.breakdown.map((b, i) => (
                                    <div key={i} className="sb-row">
                                        <span className={`sb-drug risk-tag ${riskClass(b.riskLabel)}`}>{b.drug}</span>
                                        <span className="sb-penalty">{b.penalty > 0 ? `−${b.penalty}` : "✓ No penalty"}</span>
                                        <span className="sb-reasons">{b.reasons.join(" · ") || "Safe — no deductions"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="disclaimer-bar">⚕️ For clinical decision support only — not a substitute for professional medical judgment</div>
                    </div>
                )}

                {/* Stat cards */}
                {stats && (
                    <div className="stats-row">
                        <div className="stat-card" data-accent="blue">
                            <div className="stat-top"><div className="stat-icon blue">🧬</div><span className="stat-label">Analyzed</span></div>
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-sub">Drug interactions tested</div>
                        </div>
                        <div className="stat-card" data-accent="emerald">
                            <div className="stat-top"><div className="stat-icon emerald">✓</div><span className="stat-label">Safe</span></div>
                            <div className="stat-value">{stats.safe}</div>
                            <div className="stat-sub">Standard dosing OK</div>
                        </div>
                        <div className="stat-card" data-accent="amber">
                            <div className="stat-top"><div className="stat-icon amber">⚠</div><span className="stat-label">Adjust</span></div>
                            <div className="stat-value">{stats.warn}</div>
                            <div className="stat-sub">Dose modification needed</div>
                        </div>
                        <div className="stat-card" data-accent="rose">
                            <div className="stat-top"><div className="stat-icon rose">✕</div><span className="stat-label">Alert</span></div>
                            <div className="stat-value">{stats.alert}</div>
                            <div className="stat-sub">Toxic or ineffective</div>
                        </div>
                    </div>
                )}

                {/* Content Grid */}
                <div className="content-grid">
                    {/* ---- LEFT ---- */}
                    <div className="left-col">
                        {/* Upload card */}
                        <div className="card">
                            <div className="card-head">
                                <div>
                                    <div className="card-title"><span className="card-title-icon">📁</span> Upload Patient VCF File</div>
                                    <div className="card-subtitle">Variant Call Format (.vcf) — up to 5 MB</div>
                                </div>
                                <span className="card-badge">VCF v4.x</span>
                            </div>

                            <div
                                id="tour-upload"
                                className={`upload-area${dragging ? " dragging" : ""}${vcfFile ? " loaded" : ""}`}
                                onDrop={onDrop}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onClick={() => fileRef.current?.click()}
                            >
                                <input ref={fileRef} type="file" accept=".vcf" style={{ display: "none" }}
                                    onChange={(e) => pickFile(e.target.files[0])} />
                                <div className="upload-circle">{vcfFile ? "✓" : "🧬"}</div>
                                <div className="upload-title">{vcfFile ? "File Ready" : "Drop VCF file here or click to browse"}</div>
                                <div className="upload-sub">{vcfFile ? "Click to replace" : "Supports VCF v4.x with pharmacogenomic annotations"}</div>
                                {!vcfFile && <div className="upload-meta">Max 5 MB · .vcf format</div>}
                                {vcfFile && (
                                    <div className="file-pill" onClick={(e) => e.stopPropagation()}>
                                        📄 {vcfFile.name}
                                        <span>{(vcfFile.size / 1024).toFixed(1)} KB</span>
                                        <button onClick={(e) => { e.stopPropagation(); setVcfFile(null); }}>✕</button>
                                    </div>
                                )}
                            </div>

                            <div className="input-group" id="tour-drugs">
                                <label className="input-label">Select Drugs to Analyze</label>
                                <div className="chips-row">
                                    {SUPPORTED_DRUGS.map((d) => (
                                        <button key={d} className={`chip${selected.includes(d) ? " on" : ""}`} onClick={() => toggle(d)}>{d}</button>
                                    ))}
                                </div>
                                <input className="text-input" type="text" placeholder="Or type drug names (comma-separated)..."
                                    value={drugInput} onChange={(e) => setDrugInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && analyze()} />
                            </div>

                            <div className="input-group" id="tour-ancestry">
                                <label className="input-label">Population / Ancestry (Optional)</label>
                                <select className="text-input ancestry-select" value={ancestry} onChange={e => setAncestry(e.target.value)}>
                                    {ANCESTRY_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                </select>
                            </div>

                            <button id="tour-analyze" className="analyze-btn" onClick={analyze} disabled={loading}>
                                {loading ? <><div className="spinner" />Analyzing Genomic Data...</> : <>🔬 Analyze Pharmacogenomic Risk</>}
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="error-box">
                                <span style={{ fontSize: 18 }}>⚠</span>
                                <div><strong>{error.t}</strong>{error.d}</div>
                            </div>
                        )}

                        {/* Results */}
                        {results && (
                            <div className="results-wrap" ref={resultsRef}>
                                <div className="results-header">📊 Analysis Results</div>

                                {/* Action buttons — above results */}
                                <div className="action-row">
                                    <button className="action-btn note-btn" onClick={genNote}>📋 Generate Clinical Note</button>
                                    <button className="action-btn patient-btn" onClick={downloadPatientSummary}>👤 Download Patient Summary</button>
                                </div>

                                {/* Simple English + JSON Output */}
                                <div className="output-grid">
                                    <div className="card explain-card">
                                        <div className="card-head">
                                            <div>
                                                <div className="card-title"><span className="card-title-icon">💬</span> {isPatient ? "What Your Results Mean" : "Simple English Explanation"}</div>
                                                <div className="card-subtitle">{isPatient ? "Written for you, the patient" : "What your results mean in plain language"}</div>
                                            </div>
                                        </div>
                                        <div className="explain-content">
                                            {results.map((r, i) => {
                                                const risk = r.risk_assessment;
                                                const pgx = r.pharmacogenomic_profile;
                                                const llm = r.llm_generated_explanation;
                                                const rc = riskClass(risk.risk_label);
                                                const emoji = rc === "safe" ? "✅" : rc === "adjust" ? "⚠️" : rc === "toxic" ? "🚫" : rc === "ineff" ? "❌" : "❓";
                                                return (
                                                    <div key={i} className={`explain-drug-block eb-${rc}`}>
                                                        <div className="explain-drug-header">
                                                            <span className="explain-emoji">{emoji}</span>
                                                            <div>
                                                                <div className="explain-drug-name">{r.drug}</div>
                                                                <div className={`explain-verdict ${rc}`}>
                                                                    {isPatient
                                                                        ? (risk.risk_label === "Safe" ? "This medicine is safe for you at normal doses"
                                                                            : risk.risk_label === "Adjust Dosage" ? "Your doctor may need to change the dose of this medicine"
                                                                                : risk.risk_label === "Toxic" ? "This medicine could cause serious side effects for you"
                                                                                    : risk.risk_label === "Ineffective" ? "This medicine may not work well for you"
                                                                                        : "Results unclear")
                                                                        : (risk.risk_label === "Safe" ? "Safe to use at standard dose"
                                                                            : risk.risk_label === "Adjust Dosage" ? "Dose adjustment recommended"
                                                                                : risk.risk_label === "Toxic" ? "Avoid — risk of serious side effects"
                                                                                    : risk.risk_label === "Ineffective" ? "This drug may not work for you"
                                                                                        : "Results unclear")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="explain-body">
                                                            {isPatient ? (
                                                                <p className="explain-summary">
                                                                    Your body uses {GENE_PLAIN[pgx.primary_gene] || `the ${pgx.primary_gene} gene`} to process {r.drug.toLowerCase()}.
                                                                    Based on your DNA, {risk.risk_label === "Safe"
                                                                        ? "your body handles this medicine normally, so it works safely at standard doses."
                                                                        : risk.risk_label === "Adjust Dosage"
                                                                            ? "your body handles this medicine a bit differently, so your doctor may need to adjust the dose."
                                                                            : risk.risk_label === "Toxic"
                                                                                ? "your body may not break down this medicine properly, which could lead to a buildup and side effects. Your doctor will likely recommend a different medicine."
                                                                                : "your body breaks down this medicine too quickly, so it may not have enough effect. Your doctor can suggest better alternatives."}
                                                                </p>
                                                            ) : (
                                                                <>
                                                                    {llm?.summary ? (
                                                                        <p className="explain-summary">{llm.summary}</p>
                                                                    ) : (
                                                                        <p className="explain-summary">
                                                                            Your body processes {r.drug.toLowerCase()} through the {pgx.primary_gene} gene.
                                                                            Based on your DNA, you are classified as a <strong>{pgx.phenotype}</strong>,
                                                                            which means this drug is considered <strong>{risk.risk_label.toLowerCase()}</strong> for you.
                                                                        </p>
                                                                    )}
                                                                    {llm?.mechanism && (
                                                                        <div className="explain-section">
                                                                            <div className="explain-section-title">🔬 How it works</div>
                                                                            <p>{llm.mechanism}</p>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                            <div className="explain-section">
                                                                <div className="explain-section-title">👉 {isPatient ? "What to tell your doctor" : "What to do"}</div>
                                                                <p>{isPatient
                                                                    ? (risk.risk_label === "Safe" ? "No special action needed. Continue taking this medicine as prescribed."
                                                                        : "Show this report to your doctor. They can help decide the best option for you.")
                                                                    : (r.clinical_recommendation?.action || risk.explanation)}</p>
                                                            </div>
                                                        </div>
                                                        {!isPatient && llm?.model_used && (
                                                            <div className="explain-model">AI Model: {llm.model_used}</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="card json-card">
                                        <div className="card-head">
                                            <div className="card-title"><span className="card-title-icon">{"{ }"}</span> JSON Output</div>
                                            <div className="json-actions">
                                                <button className={`btn-sm${copied ? " copied" : ""}`} onClick={copyJson}>{copied ? "✓ Copied" : "📋 Copy"}</button>
                                                <button className="btn-sm" onClick={downloadJson}>⬇ Download</button>
                                            </div>
                                        </div>
                                        <pre className="json-pre">{jsonStr}</pre>
                                    </div>
                                </div>

                                {/* Drug Analysis Cards */}
                                {results.map((r, i) => (
                                    <RiskCard key={i} r={r} i={i} expanded={expanded} toggleAcc={toggleAcc}
                                        isPatient={isPatient} whatIf={whatIf[i]} onWhatIf={(dose) => handleWhatIf(i, dose)} />
                                ))}

                                {clinicalNote && (
                                    <div className="card note-card">
                                        <div className="card-head">
                                            <div className="card-title"><span className="card-title-icon">📋</span> Clinical Note (EHR-Ready)</div>
                                            <div className="json-actions">
                                                <button className="btn-sm" onClick={() => { navigator.clipboard.writeText(clinicalNote); flash("ok", "Note copied!"); }}>📋 Copy</button>
                                                <button className="btn-sm" onClick={downloadNote}>⬇ Download</button>
                                            </div>
                                        </div>
                                        <pre className="note-pre">{clinicalNote}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ---- RIGHT SIDEBAR ---- */}
                    <div className="right-col">
                        {/* Quick Info */}
                        <div className="card">
                            <div className="card-head">
                                <div>
                                    <div className="card-title"><span className="card-title-icon">ℹ️</span> Quick Guide</div>
                                    <div className="card-subtitle">How to use this dashboard</div>
                                </div>
                            </div>
                            <div className="quick-guide-content">
                                <div className="guide-step">
                                    <div className="guide-step-num">1</div>
                                    <div className="guide-step-text">Upload a patient VCF file or load a sample</div>
                                </div>
                                <div className="guide-step">
                                    <div className="guide-step-num">2</div>
                                    <div className="guide-step-text">Select drugs to analyze from the chip list</div>
                                </div>
                                <div className="guide-step">
                                    <div className="guide-step-num">3</div>
                                    <div className="guide-step-text">Optionally set the patient ancestry for precision</div>
                                </div>
                                <div className="guide-step">
                                    <div className="guide-step-num">4</div>
                                    <div className="guide-step-text">Click Analyze to get risk predictions & clinical notes</div>
                                </div>
                            </div>
                        </div>

                        {/* Genes */}
                        <div id="tour-genes" className="card">
                            <div className="card-head">
                                <div>
                                    <div className="card-title"><span className="card-title-icon">🧬</span> {isPatient ? "Your Genes We Check" : "Target Genes"}</div>
                                    <div className="card-subtitle">6 pharmacogenes analyzed</div>
                                </div>
                            </div>
                            {GENES.map((g) => (
                                <div key={g.name} className="gene-row">
                                    <div className="gene-badge">{g.chr}</div>
                                    <div className="gene-info">
                                        <div className="gene-name">{g.name}</div>
                                        <div className="gene-desc">{isPatient ? (GENE_PLAIN[g.name] || g.desc) : g.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Drugs with more data */}
                        <div className="card">
                            <div className="card-head">
                                <div>
                                    <div className="card-title"><span className="card-title-icon">💊</span> Supported Drugs</div>
                                    <div className="card-subtitle">CPIC-guided analysis</div>
                                </div>
                            </div>
                            {SUPPORTED_DRUGS.map((d) => (
                                <div key={d} className="drug-row-enhanced">
                                    <span className="drug-dot" style={{ background: DRUG_META[d].color }} />
                                    <div className="drug-row-info">
                                        <span className="drug-row-name">{d}</span>
                                        <span className="drug-row-category">{DRUG_META[d].category} · {DRUG_META[d].indication}</span>
                                    </div>
                                    <span className="drug-gene-chip">{DRUG_META[d].gene}</span>
                                </div>
                            ))}
                        </div>

                        {/* Samples */}
                        <div id="tour-samples" className="card">
                            <div className="card-head">
                                <div>
                                    <div className="card-title"><span className="card-title-icon">📂</span> Sample VCF Files</div>
                                    <div className="card-subtitle">Quick-load test data</div>
                                </div>
                            </div>
                            <button className="sample-btn" onClick={() => loadSample("sample_patient_001.vcf")}>
                                📄 Patient 001 — Moderate Risk
                            </button>
                            <button className="sample-btn" onClick={() => loadSample("sample_patient_002.vcf")}>
                                📄 Patient 002 — High Risk
                            </button>
                            <button className="sample-btn" onClick={() => loadSample("sample_patient_003.vcf")}>
                                📄 Patient 003 — Low Risk
                            </button>
                            <button className="sample-btn" onClick={() => loadSample("TC_P1_PATIENT_001_Normal.vcf")}>
                                🧪 TC Patient 001 — Clinical Normal
                            </button>
                        </div>

                        {/* CPIC Standards */}
                        <div className="card">
                            <div className="card-head">
                                <div>
                                    <div className="card-title"><span className="card-title-icon">📜</span> Standards & Compliance</div>
                                    <div className="card-subtitle">Regulatory framework</div>
                                </div>
                            </div>
                            <div className="compliance-list">
                                <div className="compliance-item"><span className="compliance-check">✓</span> CPIC Guidelines 2024</div>
                                <div className="compliance-item"><span className="compliance-check">✓</span> PharmGKB Database Mapping</div>
                                <div className="compliance-item"><span className="compliance-check">✓</span> HIPAA Compliant Processing</div>
                                <div className="compliance-item"><span className="compliance-check">✓</span> FDA-Listed Analytics</div>
                                <div className="compliance-item"><span className="compliance-check">✓</span> CLIA Validated Methods</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Toast */}
            {toast && <div className={`toast ${toast.type}`}>{toast.type === "ok" ? "✓" : "⚠"} {toast.msg}</div>}
        </div>
    );
}

// ============================================================
// RISK CARD
// ============================================================
function RiskCard({ r, i, expanded, toggleAcc, isPatient, whatIf, onWhatIf }) {
    const risk = r.risk_assessment;
    const pgx = r.pharmacogenomic_profile;
    const rec = r.clinical_recommendation;
    const llm = r.llm_generated_explanation;
    const rc = riskClass(risk.risk_label);
    const sl = sevLevel(risk.severity);
    const rareWarnings = r.rare_variant_warnings || [];

    const cd = risk.confidence_details || { score: risk.confidence_score, avgQual: 0, variantCount: 0, level: risk.confidence_score >= 0.75 ? "High" : risk.confidence_score >= 0.50 ? "Moderate" : "Low" };
    const confPct = (cd.score * 100).toFixed(0);
    const confCls = cd.level === "High" ? "hi" : cd.level === "Moderate" ? "md" : "lo";

    const simResult = whatIf?.result;
    const simRisk = simResult?.risk_assessment;
    const simRc = simResult ? riskClass(simRisk.risk_label) : null;

    return (
        <div className={`risk-card rs-${rc}`}>
            <div className="risk-card-top">
                <div className="risk-drug-name">💊 {r.drug}</div>
                <div className="risk-right">
                    {rareWarnings.length > 0 && <span className="rare-badge">⚠ Rare Variant</span>}
                    <span className={`risk-tag ${rc}`}>{risk.risk_label}</span>
                    <div className="sev-dots">
                        {[0, 1, 2, 3, 4].map((n) => (
                            <span key={n} className={`sev-dot${n <= sl ? ` on ${risk.severity}` : ""}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="risk-body">
                <div className="metric-row">
                    <div className="metric-box">
                        <div className="metric-label">{isPatient ? "Gene Tested" : "Primary Gene"}</div>
                        <div className="metric-val">{pgx.primary_gene}</div>
                    </div>
                    <div className="metric-box">
                        <div className="metric-label">{isPatient ? "Your Gene Type" : "Diplotype"}</div>
                        <div className="metric-val">{pgx.diplotype}</div>
                    </div>
                    <div className="metric-box">
                        <div className="metric-label">{isPatient ? "How You Process It" : "Phenotype"}</div>
                        <div className="metric-val">{pgx.phenotype}</div>
                    </div>
                </div>

                <div className="conf-section">
                    <div className="conf-header">
                        <div className="conf-title-row">
                            <span className="conf-title">Confidence Score</span>
                            <span className={`conf-level-badge ${confCls}`}>{cd.level}</span>
                        </div>
                        <div className="conf-pct-big">{confPct}<span className="conf-pct-unit">%</span></div>
                    </div>
                    <div className="conf-bar-track">
                        <div className="conf-bar-segments">
                            {[0, 1, 2, 3, 4].map((n) => <span key={n} className="conf-seg-tick" />)}
                        </div>
                        <div className={`conf-bar-fill ${confCls}`} style={{ width: `${confPct}%` }} />
                    </div>
                    <div className="conf-bar-labels">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                </div>

                {rareWarnings.length > 0 && (
                    <div className="rare-warning-box">
                        <div className="rare-warning-title">⚠️ Rare Variant Alert</div>
                        {rareWarnings.map((w, j) => (
                            <div key={j} className="rare-warning-item">
                                <strong>{w.rsid}</strong> ({w.gene}) — {w.message}
                            </div>
                        ))}
                        <div className="rare-warning-note">Confidence has been adjusted. Closer monitoring is recommended instead of hard contraindication.</div>
                    </div>
                )}

                {pgx.detected_variants?.some(v => v.inheritance) && (
                    <div className="family-insight-box">
                        <div className="family-insight-title">👪 Family & Inheritance Insight</div>
                        {pgx.detected_variants.filter(v => v.inheritance).map((v, j) => (
                            <div key={j} className="family-insight-item">
                                <strong>{v.rsid}</strong>: {v.inheritance.zygosity} — {isPatient ? v.inheritance.message : v.inheritance.familyNote}
                            </div>
                        ))}
                    </div>
                )}

                <div className="whatif-panel">
                    <div className="whatif-header">
                        <span className="whatif-title">🔄 What-If Prescribing Simulator</span>
                        <span className="whatif-disclaimer">Simulated — Not Final</span>
                    </div>
                    <div className="whatif-controls">
                        <label className="whatif-label">
                            Dose: <strong>{whatIf?.dose ?? 100}%</strong>
                            <input type="range" className="whatif-slider" min="0" max="100" step="10"
                                value={whatIf?.dose ?? 100}
                                onChange={e => onWhatIf(parseInt(e.target.value))} />
                            <div className="whatif-range-labels"><span>0%</span><span>50%</span><span>100%</span></div>
                        </label>
                    </div>
                    {simResult && (
                        <div className={`whatif-result ws-${simRc}`}>
                            <div className="whatif-result-row">
                                <span>Simulated Risk:</span>
                                <span className={`risk-tag ${simRc}`}>{simRisk.risk_label}</span>
                            </div>
                            <div className="whatif-result-row">
                                <span>Confidence:</span>
                                <span>{(simRisk.confidence_score * 100).toFixed(0)}%</span>
                            </div>
                            {simRisk.risk_label === "Toxic" && (
                                <div className="whatif-toxicity-warn">🚫 Toxicity Warning — {simRisk.severity} severity risk at this dose</div>
                            )}
                            <div className="whatif-sim-disclaimer">⚕️ Simulated Recommendation (Not Final Prescription)</div>
                        </div>
                    )}
                </div>

                {!isPatient && (
                    <>
                        <Acc id={`rec-${i}`} title="📋 Clinical Recommendation" open={expanded[`rec-${i}`]} toggle={toggleAcc}>
                            <p><strong>Action:</strong> {rec.action}</p>
                            <p><strong>Dosing:</strong> {rec.dosing_guideline}</p>
                            <p><strong>Monitoring:</strong> {rec.monitoring}</p>
                            {rec.alternatives?.length > 0 && <p><strong>Alternatives:</strong> {rec.alternatives.join(", ")}</p>}
                            <p style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>{rec.cpic_guideline_reference}</p>
                        </Acc>

                        <Acc id={`llm-${i}`} title="🤖 AI Clinical Explanation" open={expanded[`llm-${i}`]} toggle={toggleAcc}>
                            {llm.summary && <p><strong>Summary:</strong> {llm.summary}</p>}
                            {llm.mechanism && <p><strong>Mechanism:</strong> {llm.mechanism}</p>}
                            {llm.clinical_significance && <p><strong>Significance:</strong> {llm.clinical_significance}</p>}
                            {llm.variant_citations && <p><strong>Citations:</strong> {llm.variant_citations}</p>}
                            {llm.confidence_explanation && <p><strong>Confidence:</strong> {llm.confidence_explanation}</p>}
                            <p style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>
                                Model: {llm.model_used || "template"} · {llm.generated_at ? new Date(llm.generated_at).toLocaleString() : ""}
                            </p>
                        </Acc>

                        {pgx.detected_variants?.length > 0 && (
                            <Acc id={`var-${i}`} title={`🔬 Detected Variants (${pgx.detected_variants.length})`} open={expanded[`var-${i}`]} toggle={toggleAcc}>
                                <table className="vtable">
                                    <thead>
                                        <tr><th>rsID</th><th>Gene</th><th>Star Allele</th><th>Genotype</th><th>Impact</th><th>Quality</th><th>Pop. Freq</th></tr>
                                    </thead>
                                    <tbody>
                                        {pgx.detected_variants.map((v, j) => (
                                            <tr key={j}>
                                                <td className="rsid-text">{v.rsid}</td>
                                                <td>{v.gene}</td>
                                                <td>{v.star_allele || "—"}</td>
                                                <td>{v.genotype}</td>
                                                <td>{v.functional_impact}</td>
                                                <td>{v.quality_score ?? "—"}</td>
                                                <td>{v.population_freq?.frequencyPercent ? `${v.population_freq.frequencyPercent}%` : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Acc>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ============================================================
// ACCORDION
// ============================================================
function Acc({ id, title, open, toggle, children }) {
    return (
        <div className="accordion">
            <button className="acc-header" onClick={() => toggle(id)}>
                <span>{title}</span>
                <span className={`acc-arrow${open ? " open" : ""}`}>▼</span>
            </button>
            {open && <div className="acc-body">{children}</div>}
        </div>
    );
}

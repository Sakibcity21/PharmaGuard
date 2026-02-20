# 🧬 PharmaGuard — Pharmacogenomic Risk Prediction System

> AI-powered precision medicine platform that analyzes patient genetic data (VCF files) and predicts personalized pharmacogenomic risks with clinically actionable recommendations.

Built for **RIFT 2026 Hackathon** — HealthTech / Pharmacogenomics Track

![Hero Section](/hero%20section.png)

---

## 🌐 Live Demo

🔗 **Live Application**: [Your Deployed URL Here]

🎥 **LinkedIn Demo Video**: [Your LinkedIn Post URL Here]

---

## 📸 Screenshots

### Dashboard
![Dashboard](/dashboard.png)

### Analysis Results
![Analysis Results](/web%20application%20out%20put.png)

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────┐
│                   Frontend                   │
│  Next.js 14 App Router + React Components    │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐   │
│  │VCF Upload│ │ Drug Input│ │Results View│   │
│  └──────────┘ └───────────┘ └────────────┘   │
└──────────────────┬───────────────────────────┘
                   │ POST /api/analyze
┌──────────────────▼───────────────────────────┐
│              API Route Layer                 │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐   │
│  │VCF Parser│ │Risk Engine│ │LLM Explainer│  │
│  └──────────┘ └──────────┘ └─────────────┘   │
└──────────────────────────────────────────────┘
```

### Data Flow
1. **VCF Upload** → Parse & validate VCF v4.x file
2. **Variant Extraction** → Identify pharmacogenomic variants across 6 genes
3. **Risk Prediction** → Map diplotype → phenotype → risk label using CPIC guidelines
4. **LLM Explanation** → Generate clinical explanations via Google Gemini API
5. **Results Display** → Color-coded risk cards with expandable clinical details

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Vanilla CSS |
| **Backend** | Next.js API Routes |
| **AI/LLM** | Groq API (Llama 3), Google Gemini API (gemini-2.0-flash) |
| **Design** | Dark glassmorphism theme, Inter font |
| **Deployment** | Vercel |
| **Pharmacogenomics** | CPIC-aligned knowledge base |

---

## 🧬 Supported Genes & Drugs

| Drug | Primary Gene | Clinical Use |
|------|-------------|-------------|
| **Codeine** | CYP2D6 | Pain management |
| **Warfarin** | CYP2C9 | Anticoagulation |
| **Clopidogrel** | CYP2C19 | Antiplatelet therapy |
| **Simvastatin** | SLCO1B1 | Cholesterol management |
| **Azathioprine** | TPMT | Immunosuppression |
| **Fluorouracil** | DPYD | Cancer chemotherapy |

### Risk Labels
- 🟢 **Safe** — Standard dosing appropriate
- 🟡 **Adjust Dosage** — Dose modification required
- 🔴 **Toxic** — High risk of adverse effects
- 🔴 **Ineffective** — Therapeutic failure expected
- ⚪ **Unknown** — Insufficient data

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pharmaguard.git
cd pharmaguard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 📡 API Documentation

### `GET /api/analyze`
Health check endpoint. Returns service info and supported drugs.

**Response:**
```json
{
  "service": "PharmaGuard API",
  "version": "1.0.0",
  "status": "operational",
  "supported_drugs": ["CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"]
}
```

### `POST /api/analyze`
Analyze a VCF file against one or more drugs.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|------------|
| `vcfFile` | File | VCF file (.vcf, max 5 MB) |
| `drugNames` | String | Comma-separated drug names |

**Response:** JSON object (single drug) or array (multiple drugs), matching the required output schema:

```json
{
  "patient_id": "PATIENT_XXX",
  "drug": "CODEINE",
  "timestamp": "2026-02-19T08:00:00.000Z",
  "risk_assessment": {
    "risk_label": "Ineffective",
    "confidence_score": 0.85,
    "severity": "high"
  },
  "pharmacogenomic_profile": {
    "primary_gene": "CYP2D6",
    "diplotype": "*4/*2",
    "phenotype": "Intermediate Metabolizer",
    "detected_variants": [...]
  },
  "clinical_recommendation": {
    "action": "Use alternative analgesic...",
    "dosing_guideline": "...",
    "monitoring": "...",
    "alternatives": ["Morphine", "Acetaminophen", "NSAIDs"],
    "cpic_guideline_reference": "CPIC Guideline for CYP2D6 and CODEINE"
  },
  "llm_generated_explanation": {
    "summary": "...",
    "mechanism": "...",
    "clinical_significance": "...",
    "variant_citations": "...",
    "confidence_explanation": "..."
  },
  "quality_metrics": {
    "vcf_parsing_success": true,
    "variants_detected": 2,
    "gene_coverage": "CYP2D6",
    "analysis_version": "PharmaGuard v1.0"
  }
}
```

---

## 📁 Usage Examples

### Using the Web Interface
1. Navigate to the app URL
2. Upload a VCF file (drag-and-drop or click to browse)
3. Select one or more drugs from the quick-select chips
4. Click **"Analyze Pharmacogenomic Risk"**
5. Review color-coded risk results with clinical recommendations
6. Download or copy the JSON output

### Using Sample Files
The app includes two sample VCF files in `public/samples/`:
- `sample_patient_001.vcf` — Moderate risk profile
- `sample_patient_002.vcf` — High risk profile

Click the **"Sample VCF Files"** buttons in the right panel to quick-load them.

### Using the API Directly

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "vcfFile=@public/samples/sample_patient_001.vcf" \
  -F "drugNames=CODEINE,WARFARIN"
```

---

## 📂 Project Structure

```
pharmaguard/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.js          # API endpoint
│   ├── globals.css               # Design system & styles
│   ├── layout.js                 # Root layout with SEO
│   └── page.js                   # Main dashboard UI
├── lib/
│   ├── pharmacogenomics.js       # CPIC knowledge base
│   ├── vcfParser.js              # VCF file parser
│   ├── riskEngine.js             # Risk prediction engine
│   └── llmExplainer.js           # Gemini LLM integration
├── public/
│   └── samples/
│       ├── sample_patient_001.vcf
│       └── sample_patient_002.vcf
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## 🏥 Clinical Disclaimer

> ⚠️ **This application is for educational and demonstration purposes only.** It is NOT intended for clinical use. Pharmacogenomic data is simplified from CPIC guidelines. Always consult a healthcare professional for medical decisions.

---

## 👥 Team Members

| Name | Role |
|------|------|
| [Your Name] | Full-Stack Developer |

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🏷️ Hackathon Tags

`#RIFT2026` `#PharmaGuard` `#Pharmacogenomics` `#AIinHealthcare` `#PrecisionMedicine`

# PharmaGuard

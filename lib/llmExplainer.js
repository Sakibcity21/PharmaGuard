/**
 * PharmaGuard — LLM Explainer
 * Priority: 1) Groq API (fast cloud)  2) Gemini API  3) Template fallback
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Generate LLM-powered clinical explanation for a risk assessment result.
 */
export async function generateExplanation(riskResult) {
    // 1️⃣ Try Groq API first (fastest cloud inference)
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey && groqKey !== "your_groq_api_key_here") {
            const groqResult = await callGroq(riskResult, groqKey);
            if (groqResult) return groqResult;
        }
    } catch (err) {
        console.warn("Groq API error:", err.message);
    }

    // 2️⃣ Try Gemini API
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== "your_gemini_api_key_here") {
            const geminiResult = await callGemini(riskResult, apiKey);
            if (geminiResult) return geminiResult;
        }
    } catch (err) {
        console.warn("Gemini API error:", err.message);
    }

    // 3️⃣ Template fallback
    return generateFallbackExplanation(riskResult);
}

// ============================================================
// GROQ API (OpenAI-compatible)
// ============================================================

async function callGroq(riskResult, apiKey) {
    const prompt = buildPrompt(riskResult);

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a clinical pharmacogenomics expert. Provide clear, evidence-based explanations using the exact format requested."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.9,
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    if (!text.trim()) {
        throw new Error("Empty response from Groq");
    }

    return parseLLMResponse(text, `groq/${GROQ_MODEL}`);
}

// ============================================================
// GEMINI API
// ============================================================

async function callGemini(riskResult, apiKey) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = buildPrompt(riskResult);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseLLMResponse(text, "gemini-2.0-flash");
}

// ============================================================
// SHARED PROMPT
// ============================================================

function buildPrompt(riskResult) {
    const { drug, pharmacogenomic_profile: pgx, risk_assessment: risk, clinical_recommendation: rec } = riskResult;

    const variantsList = pgx.detected_variants
        .map((v) => `- ${v.rsid} (${v.gene} ${v.star_allele || ""}): ${v.ref_allele}→${v.alt_allele}, Genotype: ${v.genotype}, Impact: ${v.functional_impact}`)
        .join("\n");

    return `You are a clinical pharmacogenomics expert. Provide a clear, evidence-based explanation for a patient's drug risk assessment.

PATIENT PHARMACOGENOMIC DATA:
- Drug: ${drug}
- Primary Gene: ${pgx.primary_gene}
- Diplotype: ${pgx.diplotype}
- Phenotype: ${pgx.phenotype}
- Risk Label: ${risk.risk_label}
- Severity: ${risk.severity}
- Confidence: ${risk.confidence_score}

DETECTED VARIANTS:
${variantsList || "No specific variants detected — assumed reference genotype (*1/*1)"}

CLINICAL RECOMMENDATION:
${rec.action}
Dosing: ${rec.dosing_guideline}

Please provide a response in EXACTLY this format (use these exact headers):

SUMMARY:
[2-3 sentence patient-friendly summary of what this means]

MECHANISM:
[Explain the biological mechanism — how the gene affects drug metabolism/response, citing specific variants]

CLINICAL_SIGNIFICANCE:
[Clinical importance and what actions should be taken]

VARIANT_CITATIONS:
[List each variant with its clinical evidence, referencing CPIC guidelines]

CONFIDENCE_EXPLANATION:
[Explain the confidence level and any limitations of this assessment]

Keep explanations accessible but scientifically accurate. Reference CPIC guidelines where applicable.`;
}

// ============================================================
// RESPONSE PARSER (shared by all LLM backends)
// ============================================================

function parseLLMResponse(text, modelName) {
    const sections = {
        summary: extractSection(text, "SUMMARY"),
        mechanism: extractSection(text, "MECHANISM"),
        clinical_significance: extractSection(text, "CLINICAL_SIGNIFICANCE"),
        variant_citations: extractSection(text, "VARIANT_CITATIONS"),
        confidence_explanation: extractSection(text, "CONFIDENCE_EXPLANATION"),
        model_used: modelName,
        generated_at: new Date().toISOString(),
    };

    if (!sections.summary) {
        sections.summary = text.substring(0, 500);
    }

    return sections;
}

function extractSection(text, sectionName) {
    const patterns = [
        new RegExp(`${sectionName}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, "i"),
        new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*[A-Z_]+\\*\\*|$)`, "i"),
        new RegExp(`## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"),
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return null;
}

// ============================================================
// TEMPLATE FALLBACK
// ============================================================

function generateFallbackExplanation(riskResult) {
    const { drug, pharmacogenomic_profile: pgx, risk_assessment: risk, clinical_recommendation: rec } = riskResult;

    const variants = pgx.detected_variants;
    const variantCitations = variants.length > 0
        ? variants.map((v) =>
            `${v.rsid} in ${v.gene} (${v.star_allele || "unknown allele"}): ${v.functional_impact}. ` +
            `This variant is classified by CPIC as having ${v.functional_impact.toLowerCase()} functional impact on ${v.gene} enzyme activity.`
        ).join(" ")
        : `No specific variants detected. The patient is assumed to carry the reference genotype (*1/*1) for ${pgx.primary_gene}, indicating normal enzyme function.`;

    return {
        summary: `Based on pharmacogenomic analysis, the patient's ${pgx.primary_gene} genotype (${pgx.diplotype}) classifies them as a ${pgx.phenotype}. ` +
            `For ${drug}, this results in a risk assessment of "${risk.risk_label}" with ${risk.severity} severity. ` +
            `${rec.action}`,
        mechanism: riskResult.llm_generated_explanation?.mechanism ||
            `${pgx.primary_gene} encodes an enzyme/transporter critical for ${drug} metabolism. The patient's ${pgx.diplotype} diplotype ` +
            `results in ${pgx.phenotype.toLowerCase()} activity, which directly affects drug efficacy and safety.`,
        clinical_significance: `Risk Level: ${risk.risk_label} (${risk.severity}). ${rec.action}. ` +
            `Dosing guidance: ${rec.dosing_guideline}.`,
        variant_citations: variantCitations,
        confidence_explanation: `Confidence score: ${risk.confidence_score}. This assessment is based on ` +
            `${variants.length} detected pharmacogenomic variant(s) in ${pgx.primary_gene}. ` +
            `${risk.confidence_score >= 0.8 ? "High confidence — well-characterized variants with strong CPIC evidence." :
                risk.confidence_score >= 0.6 ? "Moderate confidence — known variants detected but assessment may benefit from confirmatory testing." :
                    "Lower confidence — limited variant data available. Consider comprehensive pharmacogenomic panel for definitive results."}`,
        model_used: "template-fallback",
        generated_at: new Date().toISOString(),
    };
}

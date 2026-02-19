/**
 * PharmaGuard — API Route: POST /api/analyze
 * Orchestrates VCF parsing, risk assessment, LLM explanation,
 * population context, rare variant warnings, and safety index.
 */

import { NextResponse } from "next/server";
import { parseVCF, validateVCF } from "@/lib/vcfParser";
import { assessRisk } from "@/lib/riskEngine";
import { generateExplanation } from "@/lib/llmExplainer";
import { SUPPORTED_DRUGS } from "@/lib/pharmacogenomics";
import { computeSafetyIndex } from "@/lib/safetyIndex";
import { getPopulationContext, isRareVariant, getInheritanceInfo } from "@/lib/populationData";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const vcfFile = formData.get("vcfFile");
        const drugNames = formData.get("drugNames");
        const ancestry = formData.get("ancestry") || "global";

        // Validate inputs
        if (!vcfFile) {
            return NextResponse.json(
                { error: "No VCF file provided", details: "Please upload a valid .vcf file" },
                { status: 400 }
            );
        }

        if (!drugNames || !drugNames.trim()) {
            return NextResponse.json(
                { error: "No drug name provided", details: "Please enter at least one drug name" },
                { status: 400 }
            );
        }

        // Read file content
        const fileContent = await vcfFile.text();

        // Validate VCF format
        const validation = validateVCF(fileContent);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    error: "Invalid VCF file",
                    details: validation.error,
                    quality_metrics: { vcf_parsing_success: false },
                },
                { status: 400 }
            );
        }

        // Parse VCF
        const { variants, metadata, errors: parseErrors } = parseVCF(fileContent);

        if (parseErrors.length > 0 && variants.length === 0) {
            return NextResponse.json(
                {
                    error: "VCF parsing failed",
                    details: parseErrors.join("; "),
                    quality_metrics: { vcf_parsing_success: false, parse_errors: parseErrors },
                },
                { status: 400 }
            );
        }

        // Parse drug names (comma-separated)
        const drugs = drugNames
            .split(",")
            .map((d) => d.trim().toUpperCase())
            .filter((d) => d.length > 0);

        if (drugs.length === 0) {
            return NextResponse.json(
                { error: "No valid drug names provided", details: `Supported drugs: ${SUPPORTED_DRUGS.join(", ")}` },
                { status: 400 }
            );
        }

        // ── Population context for all variants ───────────────
        const populationContext = getPopulationContext(variants, ancestry);

        // ── Assess risk for each drug ─────────────────────────
        const results = [];
        for (const drug of drugs) {
            const riskResult = assessRisk(variants, drug);

            // Generate LLM explanation
            const llmExplanation = await generateExplanation(riskResult);
            riskResult.llm_generated_explanation = {
                ...riskResult.llm_generated_explanation,
                ...llmExplanation,
            };

            // ── Rare variant warnings ─────────────────────────
            const detectedVars = riskResult.pharmacogenomic_profile.detected_variants || [];
            const rareWarnings = [];
            for (const v of detectedVars) {
                if (isRareVariant(v.rsid, ancestry)) {
                    rareWarnings.push({
                        rsid: v.rsid,
                        gene: v.gene,
                        message: "Rare Variant – Limited Clinical Evidence",
                    });
                }
            }
            riskResult.rare_variant_warnings = rareWarnings;

            // ── Inheritance info per variant ───────────────────
            riskResult.pharmacogenomic_profile.detected_variants = detectedVars.map(v => ({
                ...v,
                inheritance: getInheritanceInfo(v.genotype),
                population_freq: populationContext.find(p => p.rsid === v.rsid) || null,
            }));

            // ── Confidence reduction for rare variants ────────
            if (rareWarnings.length > 0) {
                riskResult.risk_assessment.confidence_score = Math.max(
                    0.2,
                    riskResult.risk_assessment.confidence_score - (rareWarnings.length * 0.05)
                );
            }

            // Add parse metadata to quality metrics
            riskResult.quality_metrics = {
                ...riskResult.quality_metrics,
                vcf_parsing_success: true,
                total_variants_in_file: metadata.totalVariants,
                pgx_variants_detected: metadata.pgxVariants,
                parse_warnings: parseErrors.length > 0 ? parseErrors : undefined,
                vcf_version: metadata.fileformat,
            };

            // Population annotation
            riskResult.population_context = { ancestry, applied: ancestry !== "global" };

            results.push(riskResult);
        }

        // ── Compute safety index ──────────────────────────────
        const safetyIndex = computeSafetyIndex(results);

        // Return enriched response — always an object with results + safetyIndex
        return NextResponse.json({
            results,
            safety_index: safetyIndex,
            ancestry,
            metadata: {
                total_variants: metadata.totalVariants,
                pgx_variants: metadata.pgxVariants,
                drugs_analyzed: drugs.length,
            },
        });
    } catch (error) {
        console.error("Analysis error:", error);
        return NextResponse.json(
            {
                error: "Internal analysis error",
                details: error.message,
                quality_metrics: { vcf_parsing_success: false },
            },
            { status: 500 }
        );
    }
}

// Also support GET for API health check
export async function GET() {
    return NextResponse.json({
        service: "PharmaGuard API",
        version: "2.0.0",
        status: "operational",
        supported_drugs: SUPPORTED_DRUGS,
        features: [
            "Pharmacogenomic Risk Assessment",
            "Genomic Drug Safety Index",
            "Population-Aware Interpretation",
            "Rare Variant Detection",
            "Family Inheritance Insights",
            "What-If Prescribing Simulator",
            "Clinical Note Generation",
        ],
        endpoints: {
            analyze: {
                method: "POST",
                path: "/api/analyze",
                body: "FormData with 'vcfFile', 'drugNames', optional 'ancestry'",
            },
        },
    });
}


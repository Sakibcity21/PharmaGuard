/**
 * PharmaGuard — Risk Prediction Engine
 * Analyzes parsed VCF variants against drug-gene risk matrix.
 */

import {
    GENE_DEFINITIONS,
    DRUG_GENE_MAP,
    determinePhenotype,
    PHENOTYPE_NAMES,
    SUPPORTED_DRUGS,
} from "./pharmacogenomics";

/**
 * Assess pharmacogenomic risk for a given drug based on parsed variants.
 * @param {Array} variants - Parsed VCF variants (from vcfParser)
 * @param {string} drugName - Drug name (uppercase)
 * @returns {Object} Complete risk assessment result
 */
export function assessRisk(variants, drugName) {
    const drug = drugName.toUpperCase().trim();
    const timestamp = new Date().toISOString();

    // Check if drug is supported
    if (!DRUG_GENE_MAP[drug]) {
        return buildResult({
            drug,
            timestamp,
            riskLabel: "Unknown",
            confidence: 0,
            severity: "none",
            phenotype: "Unknown",
            diplotype: "Unknown",
            primaryGene: "Unknown",
            detectedVariants: [],
            recommendation: `Drug "${drug}" is not in the supported drug list. Supported drugs: ${SUPPORTED_DRUGS.join(", ")}`,
            dosingGuideline: "No guideline available for this drug",
            explanation: `The drug "${drug}" is not currently supported by PharmaGuard.`,
        });
    }

    const drugInfo = DRUG_GENE_MAP[drug];
    const primaryGene = drugInfo.gene;
    const geneDef = GENE_DEFINITIONS[primaryGene];

    // Filter variants relevant to the primary gene
    const geneVariants = variants.filter((v) =>
        v.pgxAnnotations.some((a) => a.gene === primaryGene)
    );

    // Determine star alleles from detected variants
    const { diplotype, allele1, allele2, detectedStarAlleles, activityScore } =
        determineDiplotype(geneVariants, primaryGene, geneDef);

    // Determine phenotype from activity score
    const phenotype = determinePhenotype(primaryGene, activityScore);
    const phenotypeName = PHENOTYPE_NAMES[phenotype] || "Unknown";

    // Look up risk from drug-gene matrix
    const riskInfo = drugInfo.phenotypeRiskMap[phenotype];

    if (!riskInfo) {
        return buildResult({
            drug,
            timestamp,
            riskLabel: "Unknown",
            confidence: geneVariants.length > 0 ? 0.4 : 0.1,
            severity: "none",
            phenotype: phenotypeName,
            diplotype,
            primaryGene,
            detectedVariants: formatDetectedVariants(geneVariants, primaryGene),
            recommendation: `Phenotype "${phenotypeName}" does not have a specific risk mapping for ${drug}. Consider standard dosing with monitoring.`,
            dosingGuideline: "No specific guideline — use clinical judgment",
            explanation: drugInfo.description,
        });
    }

    // Calculate confidence score (returns object with score, avgQual, variantCount, level)
    const conf = calculateConfidence(geneVariants, detectedStarAlleles);

    return buildResult({
        drug,
        timestamp,
        riskLabel: riskInfo.riskLabel,
        confidence: conf.score,
        confidenceDetails: conf,
        severity: riskInfo.severity,
        phenotype: phenotypeName,
        diplotype,
        primaryGene,
        detectedVariants: formatDetectedVariants(geneVariants, primaryGene),
        recommendation: riskInfo.recommendation,
        dosingGuideline: riskInfo.dosingGuideline,
        explanation: riskInfo.explanation,
        mechanism: drugInfo.mechanism,
    });
}

/**
 * Determine diplotype (pair of star alleles) from detected variants
 */
function determineDiplotype(geneVariants, geneName, geneDef) {
    const detectedStarAlleles = new Set();
    let totalActivityScore = 0;

    // Collect star alleles from detected variants
    for (const variant of geneVariants) {
        for (const ann of variant.pgxAnnotations) {
            if (ann.gene === geneName && ann.starAllele) {
                detectedStarAlleles.add(ann.starAllele);
            }
        }
    }

    const alleles = Array.from(detectedStarAlleles);

    if (alleles.length === 0) {
        // No pharmacogenomic variants detected → assume *1/*1 (reference/normal)
        return {
            diplotype: "*1/*1",
            allele1: "*1",
            allele2: "*1",
            detectedStarAlleles: [],
            activityScore: 2.0,
        };
    }

    // Determine diplotype
    let allele1, allele2;

    if (alleles.length === 1) {
        // Single variant allele detected — check genotype for homozygosity
        const variant = geneVariants.find((v) =>
            v.pgxAnnotations.some((a) => a.starAllele === alleles[0])
        );
        const isHomozygous = variant && isHomozygousVariant(variant);

        if (isHomozygous) {
            allele1 = alleles[0];
            allele2 = alleles[0];
        } else {
            allele1 = alleles[0];
            allele2 = "*1"; // heterozygous with reference
        }
    } else {
        // Multiple alleles detected — take top 2
        allele1 = alleles[0];
        allele2 = alleles[1];
    }

    // Calculate total activity score
    const score1 = geneDef.starAlleles[allele1]?.activityScore ?? 1.0;
    const score2 = geneDef.starAlleles[allele2]?.activityScore ?? 1.0;
    totalActivityScore = score1 + score2;

    return {
        diplotype: `${allele1}/${allele2}`,
        allele1,
        allele2,
        detectedStarAlleles: alleles,
        activityScore: totalActivityScore,
    };
}

/**
 * Check if a variant is homozygous based on genotype field
 */
function isHomozygousVariant(variant) {
    if (!variant.genotype) return false;
    const parts = variant.genotype.split(/[/|]/);
    return parts.length === 2 && parts[0] === parts[1] && parts[0] !== "0";
}

/**
 * Calculate confidence score based on data quality
 * Returns { score, avgQual, variantCount, level }
 */
function calculateConfidence(geneVariants, detectedStarAlleles) {
    let confidence = 0.35; // Lower base — confidence must be earned

    // Variant detection: +0.10 each, max +0.20
    const variantCount = geneVariants.length;
    confidence += Math.min(variantCount * 0.10, 0.20);

    // Star allele annotations
    const starCount = detectedStarAlleles.length;
    if (starCount === 1) confidence += 0.10;
    else if (starCount >= 2) confidence += 0.15;

    // Quality scores — gradient contribution up to +0.15
    const avgQual = geneVariants.reduce((sum, v) => sum + (v.qual || 0), 0) / Math.max(variantCount, 1);
    if (avgQual > 0) confidence += Math.min(avgQual / 100, 1) * 0.15;

    // Homozygosity bonus — clearer genomic signal
    const hasHomozygous = geneVariants.some((v) => isHomozygousVariant(v));
    if (hasHomozygous) confidence += 0.05;

    // High-quality bonus
    if (avgQual > 50) confidence += 0.05;

    const score = Math.min(Math.round(confidence * 100) / 100, 0.95);
    return { score, avgQual: Math.round(avgQual), variantCount, level: confidenceLevel(score) };
}

/**
 * Map a numeric confidence score to a human-readable level
 */
export function confidenceLevel(score) {
    if (score >= 0.75) return "High";
    if (score >= 0.50) return "Moderate";
    return "Low";
}

/**
 * Format detected variants for output
 */
function formatDetectedVariants(geneVariants, primaryGene) {
    return geneVariants.map((v) => {
        const pgxAnn = v.pgxAnnotations.find((a) => a.gene === primaryGene) || v.pgxAnnotations[0];
        return {
            rsid: v.rsids[0] || "unknown",
            chromosome: v.chrom,
            position: v.pos,
            ref_allele: v.ref,
            alt_allele: v.alt.join(","),
            genotype: v.genotype || "unknown",
            quality_score: v.qual,
            gene: pgxAnn?.gene || primaryGene,
            star_allele: pgxAnn?.starAllele || null,
            functional_impact: pgxAnn?.function || "Unknown",
            annotation_source: pgxAnn?.source || "Unknown",
        };
    });
}

/**
 * Build the complete JSON output matching the required schema
 */
function buildResult({
    drug, timestamp, riskLabel, confidence, confidenceDetails, severity,
    phenotype, diplotype, primaryGene, detectedVariants,
    recommendation, dosingGuideline, explanation, mechanism,
}) {
    // Generate patient ID from timestamp
    const patientId = `PATIENT_${Date.now().toString(36).toUpperCase()}`;

    return {
        patient_id: patientId,
        drug: drug,
        timestamp: timestamp,
        risk_assessment: {
            risk_label: riskLabel,
            confidence_score: confidence,
            confidence_details: confidenceDetails || { score: confidence, avgQual: 0, variantCount: 0, level: confidenceLevel(confidence) },
            severity: severity,
        },
        pharmacogenomic_profile: {
            primary_gene: primaryGene,
            diplotype: diplotype,
            phenotype: phenotype,
            detected_variants: detectedVariants,
        },
        clinical_recommendation: {
            action: recommendation,
            dosing_guideline: dosingGuideline,
            monitoring: getMonitoringRecommendation(riskLabel, drug),
            alternatives: getAlternatives(drug, riskLabel),
            cpic_guideline_reference: `CPIC Guideline for ${drug} and ${primaryGene}`,
        },
        llm_generated_explanation: {
            summary: explanation,
            mechanism: mechanism || null,
            clinical_significance: getClinicalSignificance(riskLabel, severity),
            evidence_level: "CPIC Level A (Strong)",
            citations: [
                `CPIC Guideline for ${primaryGene} and ${drug} (cpicpgx.org)`,
                `PharmGKB Clinical Annotation for ${primaryGene}`,
            ],
        },
        quality_metrics: {
            vcf_parsing_success: true,
            variants_detected: detectedVariants.length,
            gene_coverage: primaryGene,
            analysis_version: "PharmaGuard v1.0",
            cpic_version: "CPIC 2024",
        },
    };
}

function getMonitoringRecommendation(riskLabel, drug) {
    const monitoring = {
        Safe: "Routine clinical monitoring as per standard of care",
        "Adjust Dosage": "Enhanced monitoring recommended — more frequent lab tests during dose titration",
        Toxic: "Do NOT administer without specialist consultation. If used, intensive monitoring required",
        Ineffective: "Monitor for therapeutic failure. Consider therapeutic drug monitoring or alternative agent",
        Unknown: "Clinical judgment required. Consider pharmacogenomic consultation",
    };
    return monitoring[riskLabel] || monitoring.Unknown;
}

function getAlternatives(drug, riskLabel) {
    if (riskLabel === "Safe") return [];
    const alternatives = {
        CODEINE: ["Morphine (direct)", "Acetaminophen", "NSAIDs (ibuprofen)", "Tramadol (with caution)"],
        WARFARIN: ["Apixaban (Eliquis)", "Rivaroxaban (Xarelto)", "Dabigatran (Pradaxa)"],
        CLOPIDOGREL: ["Prasugrel (Effient)", "Ticagrelor (Brilinta)"],
        SIMVASTATIN: ["Pravastatin", "Rosuvastatin (lower dose)", "Fluvastatin"],
        AZATHIOPRINE: ["Mycophenolate mofetil", "Methotrexate (if applicable)"],
        FLUOROURACIL: ["Alternative chemotherapy regimen per oncologist"],
    };
    return alternatives[drug] || [];
}

function getClinicalSignificance(riskLabel, severity) {
    const significance = {
        critical: "CRITICAL — Immediate clinical action required. Risk of severe adverse events or therapeutic failure.",
        high: "HIGH — Significant clinical impact. Dose modification or drug substitution strongly recommended.",
        moderate: "MODERATE — Clinical impact present. Dose adjustment or enhanced monitoring recommended.",
        low: "LOW — Minor clinical impact. Standard care with awareness of potential effects.",
        none: "NONE — No significant pharmacogenomic interaction identified. Standard dosing appropriate.",
    };
    return significance[severity] || significance.none;
}

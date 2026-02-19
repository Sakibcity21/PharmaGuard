/**
 * PharmaGuard — Genomic Drug Safety Index
 * Computes a patient-level score (0–100) from multi-drug risk analysis.
 * 
 * Scoring:
 *   Starts at 100, deducts for each drug-gene risk factor:
 *     - Toxic / Ineffective                → –25 each
 *     - Adjust Dosage                      → –10 each
 *     - Critical severity                  → –8 extra
 *     - High severity                      → –5 extra
 *     - Low confidence (< 0.5)             → –4 each
 *     - No coverage (0 variants detected)  → –3 each
 */

// ── Compute safety index from an array of risk results ──────────
export function computeSafetyIndex(results) {
    if (!results || results.length === 0) {
        return { score: 0, level: "unknown", color: "#94a3b8", breakdown: [] };
    }

    let score = 100;
    const breakdown = [];

    for (const r of results) {
        const risk = r.risk_assessment;
        const label = risk.risk_label;
        const sev = risk.severity;
        const conf = risk.confidence_score;
        const variants = r.pharmacogenomic_profile?.detected_variants?.length || 0;

        let drugPenalty = 0;
        const reasons = [];

        // Risk label penalties
        if (label === "Toxic" || label === "Ineffective") {
            drugPenalty += 25;
            reasons.push(`${label} risk (−25)`);
        } else if (label === "Adjust Dosage") {
            drugPenalty += 10;
            reasons.push("Dose adjustment needed (−10)");
        }
        // label === "Safe" → no penalty

        // Severity penalties
        if (sev === "critical") {
            drugPenalty += 8;
            reasons.push("Critical severity (−8)");
        } else if (sev === "high") {
            drugPenalty += 5;
            reasons.push("High severity (−5)");
        }

        // Confidence penalty
        if (conf < 0.5) {
            drugPenalty += 4;
            reasons.push("Low confidence (−4)");
        }

        // Coverage penalty
        if (variants === 0) {
            drugPenalty += 3;
            reasons.push("No variants detected (−3)");
        }

        score -= drugPenalty;

        breakdown.push({
            drug: r.drug,
            riskLabel: label,
            penalty: drugPenalty,
            reasons,
        });
    }

    // Clamp to 0–100
    score = Math.max(0, Math.min(100, score));

    const level = score >= 80 ? "Good" : score >= 50 ? "Moderate" : "At Risk";
    const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

    return { score, level, color, breakdown };
}

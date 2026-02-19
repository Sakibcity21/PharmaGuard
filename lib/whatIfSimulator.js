/**
 * PharmaGuard — What-If Prescribing Simulator
 * Rule-based dose simulation using CPIC logic.
 * All outputs are clearly labeled as SIMULATED.
 *
 * Dose range: 0% (none) → 100% (standard dose)
 */

// ── Dose adjustment simulation ──────────────────────────────────
// dosePercent: 0–100 (100 = standard/full dose, 0 = no dose)
// Returns a simulated risk result with adjusted labels.
export function simulateDoseChange(originalResult, dosePercent) {
    const r = JSON.parse(JSON.stringify(originalResult)); // deep clone
    const pct = Math.max(0, Math.min(100, dosePercent));
    const label = r.risk_assessment.risk_label;

    // ── Full dose (100%) — no change, use original assessment ────
    if (pct === 100) {
        r._simulated = true;
        r._simulation = {
            type: "dose_change",
            dose_percent: pct,
            original_label: originalResult.risk_assessment.risk_label,
            disclaimer: "Simulated Recommendation — Not a Final Prescription",
        };
        return r;
    }

    // ── No dose (0%) — drug not taken ────────────────────────────
    if (pct === 0) {
        r.risk_assessment.risk_label = "Ineffective";
        r.risk_assessment.severity = "high";
        r.risk_assessment.confidence_score = 0.95;
        r._simulated = true;
        r._simulation = {
            type: "dose_change",
            dose_percent: 0,
            original_label: originalResult.risk_assessment.risk_label,
            disclaimer: "Simulated Recommendation — Not a Final Prescription",
        };
        return r;
    }

    // ── Very low dose (10–30%) — significant reduction ───────────
    if (pct <= 30) {
        if (label === "Toxic") {
            r.risk_assessment.risk_label = "Adjust Dosage";
            r.risk_assessment.severity = "moderate";
        } else if (label === "Adjust Dosage") {
            r.risk_assessment.risk_label = "Safe";
            r.risk_assessment.severity = "low";
        } else if (label === "Safe") {
            // Too low — may become ineffective
            r.risk_assessment.risk_label = "Ineffective";
            r.risk_assessment.severity = "moderate";
        }
        r.risk_assessment.confidence_score = Math.max(0.25, r.risk_assessment.confidence_score - 0.10);
    }

    // ── Low dose (40–60%) — moderate reduction ───────────────────
    else if (pct <= 60) {
        if (label === "Toxic") {
            r.risk_assessment.risk_label = "Adjust Dosage";
            r.risk_assessment.severity = "moderate";
        } else if (label === "Adjust Dosage") {
            r.risk_assessment.severity = "low";
        }
        // "Safe" stays safe at moderate dose
        r.risk_assessment.confidence_score = Math.max(0.30, r.risk_assessment.confidence_score - 0.05);
    }

    // ── Slightly reduced dose (70–90%) — minor adjustment ────────
    else if (pct < 100) {
        if (label === "Toxic") {
            r.risk_assessment.severity = "moderate";
        }
        // Most labels stay the same at near-standard doses
    }

    // Mark as simulated
    r._simulated = true;
    r._simulation = {
        type: "dose_change",
        dose_percent: pct,
        original_label: originalResult.risk_assessment.risk_label,
        original_confidence: originalResult.risk_assessment.confidence_score,
        disclaimer: "Simulated Recommendation — Not a Final Prescription",
    };

    return r;
}

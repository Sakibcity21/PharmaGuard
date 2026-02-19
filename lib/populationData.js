/**
 * PharmaGuard — Population-Aware Genomic Interpretation
 * Variant allele frequencies by ancestry group.
 * Source: gnomAD / 1000 Genomes approximate frequencies.
 */

export const ANCESTRY_OPTIONS = [
    { id: "global", label: "Global Average" },
    { id: "south_asian", label: "South Asian" },
    { id: "east_asian", label: "East Asian" },
    { id: "african", label: "African / African American" },
    { id: "european", label: "European" },
    { id: "other", label: "Other / Mixed" },
];

// ── Allele frequencies per rsID per ancestry (approximate, gnomAD-based) ──
const FREQ_TABLE = {
    // CYP2D6
    rs3892097: { global: 0.20, south_asian: 0.12, east_asian: 0.01, african: 0.06, european: 0.22, other: 0.15 },
    rs16947: { global: 0.34, south_asian: 0.36, east_asian: 0.16, african: 0.35, european: 0.33, other: 0.30 },
    rs35742686: { global: 0.02, south_asian: 0.01, east_asian: 0.00, african: 0.01, european: 0.02, other: 0.01 },
    // CYP2C19
    rs4244285: { global: 0.24, south_asian: 0.34, east_asian: 0.30, african: 0.17, european: 0.15, other: 0.22 },
    rs12248560: { global: 0.21, south_asian: 0.16, east_asian: 0.04, african: 0.24, european: 0.21, other: 0.18 },
    // CYP2C9
    rs1799853: { global: 0.10, south_asian: 0.08, east_asian: 0.02, african: 0.02, european: 0.13, other: 0.08 },
    rs1057910: { global: 0.06, south_asian: 0.10, east_asian: 0.04, african: 0.01, european: 0.07, other: 0.05 },
    // SLCO1B1
    rs4149056: { global: 0.15, south_asian: 0.05, east_asian: 0.12, african: 0.02, european: 0.18, other: 0.12 },
    rs2306283: { global: 0.47, south_asian: 0.42, east_asian: 0.70, african: 0.77, european: 0.40, other: 0.50 },
    // TPMT
    rs1800460: { global: 0.03, south_asian: 0.02, east_asian: 0.00, african: 0.01, european: 0.04, other: 0.02 },
    rs1142345: { global: 0.05, south_asian: 0.03, east_asian: 0.02, african: 0.08, european: 0.05, other: 0.04 },
    // DPYD
    rs3918290: { global: 0.01, south_asian: 0.00, east_asian: 0.00, african: 0.00, european: 0.01, other: 0.005 },
    rs67376798: { global: 0.01, south_asian: 0.005, east_asian: 0.00, african: 0.005, european: 0.01, other: 0.005 },
};

// ── Check if a variant is rare in a given population (< 1%) ─────
export function isRareVariant(rsid, ancestry = "global") {
    const freq = FREQ_TABLE[rsid]?.[ancestry] ?? FREQ_TABLE[rsid]?.global;
    if (freq === undefined || freq === null) return false; // unknown variant → not flagged
    return freq < 0.01;
}

// ── Get population context for an array of variants ─────────────
export function getPopulationContext(variants, ancestry = "global") {
    return variants.map(v => {
        const rsid = v.rsids?.[0] || v.rsid;
        const freqs = FREQ_TABLE[rsid];
        if (!freqs) {
            return {
                rsid,
                frequency: null,
                rare: false,
                populationNote: "No population frequency data available.",
            };
        }
        const freq = freqs[ancestry] ?? freqs.global;
        const rare = freq < 0.01;
        const pctStr = (freq * 100).toFixed(1);
        const label = ANCESTRY_OPTIONS.find(a => a.id === ancestry)?.label || ancestry;

        return {
            rsid,
            frequency: freq,
            frequencyPercent: pctStr,
            rare,
            ancestry,
            populationNote: rare
                ? `Rare variant in ${label} population (${pctStr}% frequency). Limited clinical evidence available.`
                : `Found in ${pctStr}% of ${label} population.`,
        };
    });
}

// ── Get allele frequencies for a single rsID across all pops ────
export function getAllFrequencies(rsid) {
    return FREQ_TABLE[rsid] || null;
}

// ── Determine inheritance pattern from genotype ─────────────────
export function getInheritanceInfo(genotype) {
    if (!genotype) return null;
    const parts = genotype.split(/[/|]/);
    if (parts.length !== 2) return null;

    const isHom = parts[0] === parts[1] && parts[0] !== "0";
    const isHet = parts[0] !== parts[1] && (parts[0] !== "0" || parts[1] !== "0");
    const isRef = parts[0] === "0" && parts[1] === "0";

    if (isRef) return null; // reference genotype, no variant to discuss

    return {
        zygosity: isHom ? "Homozygous" : "Heterozygous",
        inherited: true,
        message: isHom
            ? "This variant is present on both copies of the gene. It was likely inherited from both parents."
            : "This variant is present on one copy of the gene. It was likely inherited from one parent.",
        familyNote: "This variant may be shared with close relatives. Optional family screening could be considered.",
    };
}

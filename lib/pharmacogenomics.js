/**
 * PharmaGuard — Pharmacogenomics Knowledge Base
 * CPIC-aligned gene-drug mappings, star allele definitions, and risk matrices.
 * 
 * References:
 * - CPIC Guidelines (cpicpgx.org)
 * - PharmVar (pharmvar.org)
 * - PharmGKB (pharmgkb.org)
 */

// ============================================================
// GENE DEFINITIONS — Star alleles, rsIDs, and functional impact
// ============================================================
export const GENE_DEFINITIONS = {
    CYP2D6: {
        name: "CYP2D6",
        chromosome: "22",
        description: "Cytochrome P450 2D6 — metabolizes ~25% of clinically used drugs",
        starAlleles: {
            "*1": { rsids: [], function: "Normal", activityScore: 1.0 },
            "*2": { rsids: ["rs16947"], function: "Normal", activityScore: 1.0 },
            "*3": { rsids: ["rs35742686"], function: "No function", activityScore: 0 },
            "*4": { rsids: ["rs3892097"], function: "No function", activityScore: 0 },
            "*5": { rsids: [], function: "No function (gene deletion)", activityScore: 0 },
            "*6": { rsids: ["rs5030655"], function: "No function", activityScore: 0 },
            "*9": { rsids: ["rs5030656"], function: "Decreased", activityScore: 0.5 },
            "*10": { rsids: ["rs1065852"], function: "Decreased", activityScore: 0.25 },
            "*17": { rsids: ["rs28371706"], function: "Decreased", activityScore: 0.5 },
            "*29": { rsids: ["rs59421388"], function: "Decreased", activityScore: 0.5 },
            "*41": { rsids: ["rs28371725"], function: "Decreased", activityScore: 0.5 },
            "*1xN": { rsids: [], function: "Increased (gene duplication)", activityScore: 2.0 },
            "*2xN": { rsids: ["rs16947"], function: "Increased (gene duplication)", activityScore: 2.0 },
        },
    },

    CYP2C19: {
        name: "CYP2C19",
        chromosome: "10",
        description: "Cytochrome P450 2C19 — key enzyme for clopidogrel activation and PPI metabolism",
        starAlleles: {
            "*1": { rsids: [], function: "Normal", activityScore: 1.0 },
            "*2": { rsids: ["rs4244285"], function: "No function", activityScore: 0 },
            "*3": { rsids: ["rs4986893"], function: "No function", activityScore: 0 },
            "*4": { rsids: ["rs28399504"], function: "No function", activityScore: 0 },
            "*5": { rsids: ["rs56337013"], function: "No function", activityScore: 0 },
            "*6": { rsids: ["rs72552267"], function: "No function", activityScore: 0 },
            "*7": { rsids: ["rs72558186"], function: "No function", activityScore: 0 },
            "*8": { rsids: ["rs41291556"], function: "No function", activityScore: 0 },
            "*9": { rsids: ["rs17884712"], function: "Decreased", activityScore: 0.5 },
            "*10": { rsids: ["rs6413438"], function: "Decreased", activityScore: 0.5 },
            "*17": { rsids: ["rs12248560"], function: "Increased", activityScore: 1.5 },
        },
    },

    CYP2C9: {
        name: "CYP2C9",
        chromosome: "10",
        description: "Cytochrome P450 2C9 — metabolizes warfarin, phenytoin, and NSAIDs",
        starAlleles: {
            "*1": { rsids: [], function: "Normal", activityScore: 1.0 },
            "*2": { rsids: ["rs1799853"], function: "Decreased", activityScore: 0.5 },
            "*3": { rsids: ["rs1057910"], function: "No function", activityScore: 0 },
            "*5": { rsids: ["rs28371686"], function: "Decreased", activityScore: 0.5 },
            "*6": { rsids: ["rs9332131"], function: "No function", activityScore: 0 },
            "*8": { rsids: ["rs7900194"], function: "Decreased", activityScore: 0.5 },
            "*11": { rsids: ["rs28371685"], function: "Decreased", activityScore: 0.5 },
        },
    },

    SLCO1B1: {
        name: "SLCO1B1",
        chromosome: "12",
        description: "Solute carrier organic anion transporter — hepatic uptake of statins",
        starAlleles: {
            "*1a": { rsids: [], function: "Normal", activityScore: 1.0 },
            "*1b": { rsids: ["rs2306283"], function: "Normal", activityScore: 1.0 },
            "*5": { rsids: ["rs4149056"], function: "Decreased", activityScore: 0 },
            "*15": { rsids: ["rs2306283", "rs4149056"], function: "Decreased", activityScore: 0 },
            "*37": { rsids: ["rs2306283"], function: "Normal", activityScore: 1.0 },
        },
    },

    TPMT: {
        name: "TPMT",
        chromosome: "6",
        description: "Thiopurine S-methyltransferase — metabolizes azathioprine, mercaptopurine",
        starAlleles: {
            "*1": { rsids: [], function: "Normal", activityScore: 1.0 },
            "*2": { rsids: ["rs1800462"], function: "No function", activityScore: 0 },
            "*3A": { rsids: ["rs1800460", "rs1142345"], function: "No function", activityScore: 0 },
            "*3B": { rsids: ["rs1800460"], function: "No function", activityScore: 0 },
            "*3C": { rsids: ["rs1142345"], function: "No function", activityScore: 0 },
            "*4": { rsids: ["rs1800584"], function: "No function", activityScore: 0 },
        },
    },

    DPYD: {
        name: "DPYD",
        chromosome: "1",
        description: "Dihydropyrimidine dehydrogenase — rate-limiting enzyme in fluoropyrimidine catabolism",
        starAlleles: {
            "*1": { rsids: [], function: "Normal", activityScore: 1.0 },
            "*2A": { rsids: ["rs3918290"], function: "No function", activityScore: 0 },
            "*13": { rsids: ["rs55886062"], function: "No function", activityScore: 0 },
            "c.2846A>T": { rsids: ["rs67376798"], function: "Decreased", activityScore: 0.5 },
            "HapB3": { rsids: ["rs56038477"], function: "Decreased", activityScore: 0.5 },
        },
    },
};

// ============================================================
// DRUG-GENE RISK MATRIX
// Maps drug → primary gene → phenotype → risk assessment
// ============================================================
export const DRUG_GENE_MAP = {
    CODEINE: {
        gene: "CYP2D6",
        description: "Codeine is a prodrug converted to morphine by CYP2D6",
        mechanism: "CYP2D6 converts codeine to its active metabolite morphine via O-demethylation",
        phenotypeRiskMap: {
            URM: {
                riskLabel: "Toxic",
                severity: "critical",
                explanation: "Ultra-rapid metabolism produces excessive morphine, risking respiratory depression",
                recommendation: "AVOID codeine. Use alternative analgesic not metabolized by CYP2D6 (e.g., morphine, acetaminophen, NSAIDs)",
                dosingGuideline: "Contraindicated — do NOT prescribe codeine",
            },
            RM: {
                riskLabel: "Toxic",
                severity: "high",
                explanation: "Rapid metabolism may produce elevated morphine levels",
                recommendation: "Avoid codeine. Consider alternative analgesics",
                dosingGuideline: "Contraindicated — select alternative analgesic",
            },
            NM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal CYP2D6 metabolism produces expected morphine levels",
                recommendation: "Use codeine at standard dosing per clinical guidelines",
                dosingGuideline: "Standard dose as per label",
            },
            IM: {
                riskLabel: "Ineffective",
                severity: "moderate",
                explanation: "Reduced CYP2D6 activity produces insufficient morphine for adequate pain relief",
                recommendation: "Use alternative analgesic not dependent on CYP2D6 metabolism",
                dosingGuideline: "Consider alternative analgesic",
            },
            PM: {
                riskLabel: "Ineffective",
                severity: "high",
                explanation: "Minimal to no conversion of codeine to morphine — drug will not provide pain relief",
                recommendation: "AVOID codeine. Use alternative analgesic (e.g., morphine, NSAIDs, acetaminophen)",
                dosingGuideline: "Contraindicated — no therapeutic effect expected",
            },
        },
    },

    WARFARIN: {
        gene: "CYP2C9",
        description: "Warfarin is an anticoagulant metabolized primarily by CYP2C9",
        mechanism: "CYP2C9 metabolizes S-warfarin, the more potent enantiomer. Reduced metabolism increases bleeding risk",
        phenotypeRiskMap: {
            NM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal CYP2C9 metabolism allows standard warfarin dosing",
                recommendation: "Initiate warfarin at standard dose with routine INR monitoring",
                dosingGuideline: "Standard dose (typically 5 mg/day initial, adjusted by INR)",
            },
            IM: {
                riskLabel: "Adjust Dosage",
                severity: "moderate",
                explanation: "Reduced CYP2C9 activity leads to slower warfarin clearance and increased bleeding risk",
                recommendation: "Reduce initial warfarin dose by 25-50%. Monitor INR more frequently",
                dosingGuideline: "Reduce dose by 25-50% (e.g., 2.5-3.75 mg/day initial)",
            },
            PM: {
                riskLabel: "Toxic",
                severity: "critical",
                explanation: "Severely impaired warfarin metabolism causes drug accumulation and high bleeding risk",
                recommendation: "Reduce dose by 50-80% or consider alternative anticoagulant. Frequent INR monitoring required",
                dosingGuideline: "Reduce dose by 50-80% (e.g., 1-2.5 mg/day initial) or use DOAC alternative",
            },
        },
    },

    CLOPIDOGREL: {
        gene: "CYP2C19",
        description: "Clopidogrel is an antiplatelet prodrug requiring CYP2C19 activation",
        mechanism: "CYP2C19 converts clopidogrel to its active thiol metabolite for platelet inhibition",
        phenotypeRiskMap: {
            URM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Enhanced CYP2C19 activity provides effective clopidogrel activation",
                recommendation: "Standard clopidogrel dosing appropriate",
                dosingGuideline: "Standard dose (75 mg/day maintenance)",
            },
            RM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Rapid CYP2C19 metabolism provides adequate clopidogrel activation",
                recommendation: "Standard clopidogrel dosing",
                dosingGuideline: "Standard dose (75 mg/day maintenance)",
            },
            NM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal CYP2C19 metabolism provides standard clopidogrel activation",
                recommendation: "Use clopidogrel at standard dose",
                dosingGuideline: "Standard dose (75 mg/day maintenance)",
            },
            IM: {
                riskLabel: "Adjust Dosage",
                severity: "moderate",
                explanation: "Reduced CYP2C19 activity may result in insufficient platelet inhibition",
                recommendation: "Consider alternative antiplatelet agent (prasugrel, ticagrelor) if no contraindication",
                dosingGuideline: "Consider prasugrel 10 mg/day or ticagrelor 90 mg BID as alternative",
            },
            PM: {
                riskLabel: "Ineffective",
                severity: "critical",
                explanation: "Minimal CYP2C19 activity results in negligible active metabolite — increased risk of cardiovascular events",
                recommendation: "AVOID clopidogrel. Use alternative antiplatelet (prasugrel or ticagrelor)",
                dosingGuideline: "Contraindicated — switch to prasugrel or ticagrelor",
            },
        },
    },

    SIMVASTATIN: {
        gene: "SLCO1B1",
        description: "Simvastatin hepatic uptake is mediated by SLCO1B1 transporter",
        mechanism: "SLCO1B1 transports simvastatin acid into hepatocytes. Decreased function increases plasma levels and myopathy risk",
        phenotypeRiskMap: {
            NF: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal SLCO1B1 function ensures proper hepatic simvastatin uptake",
                recommendation: "Standard simvastatin dosing appropriate",
                dosingGuideline: "Standard dose (20-40 mg/day)",
            },
            NM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal SLCO1B1 function ensures proper hepatic simvastatin uptake",
                recommendation: "Standard simvastatin dosing appropriate",
                dosingGuideline: "Standard dose (20-40 mg/day)",
            },
            DF: {
                riskLabel: "Adjust Dosage",
                severity: "moderate",
                explanation: "Decreased SLCO1B1 function increases systemic simvastatin exposure and myopathy risk",
                recommendation: "Prescribe lower dose of simvastatin (max 20 mg/day) or use alternative statin (rosuvastatin, pravastatin, fluvastatin)",
                dosingGuideline: "Maximum 20 mg/day. Consider rosuvastatin or pravastatin as alternative",
            },
            IM: {
                riskLabel: "Adjust Dosage",
                severity: "moderate",
                explanation: "Decreased SLCO1B1 function increases systemic simvastatin exposure and myopathy risk",
                recommendation: "Prescribe lower dose of simvastatin (max 20 mg/day) or use alternative statin",
                dosingGuideline: "Maximum 20 mg/day. Consider rosuvastatin or pravastatin as alternative",
            },
            PF: {
                riskLabel: "Toxic",
                severity: "critical",
                explanation: "Poor SLCO1B1 function significantly increases simvastatin plasma concentration — high risk of myopathy and rhabdomyolysis",
                recommendation: "AVOID simvastatin. Use alternative statin with lower myopathy risk (pravastatin, rosuvastatin at lower doses, fluvastatin)",
                dosingGuideline: "Contraindicated — switch to pravastatin 40 mg/day or rosuvastatin 20 mg/day",
            },
            PM: {
                riskLabel: "Toxic",
                severity: "critical",
                explanation: "Poor SLCO1B1 function significantly increases simvastatin plasma concentration — high risk of myopathy and rhabdomyolysis",
                recommendation: "AVOID simvastatin. Use alternative statin with lower myopathy risk",
                dosingGuideline: "Contraindicated — switch to pravastatin or rosuvastatin",
            },
        },
    },

    AZATHIOPRINE: {
        gene: "TPMT",
        description: "Azathioprine is a thiopurine immunosuppressant metabolized by TPMT",
        mechanism: "TPMT methylates thiopurine metabolites. Reduced TPMT activity increases cytotoxic thioguanine nucleotide accumulation",
        phenotypeRiskMap: {
            NM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal TPMT activity provides standard thiopurine metabolism",
                recommendation: "Start azathioprine at standard dose with routine monitoring",
                dosingGuideline: "Standard dose (2-3 mg/kg/day)",
            },
            IM: {
                riskLabel: "Adjust Dosage",
                severity: "high",
                explanation: "Reduced TPMT activity increases risk of dose-dependent myelosuppression",
                recommendation: "Reduce starting dose by 30-70% of standard. Monitor CBC weekly for first month",
                dosingGuideline: "Start at 30-70% of standard dose (0.6-2.1 mg/kg/day) with frequent CBC monitoring",
            },
            PM: {
                riskLabel: "Toxic",
                severity: "critical",
                explanation: "Minimal TPMT activity causes massive accumulation of cytotoxic thioguanine nucleotides — life-threatening myelosuppression",
                recommendation: "AVOID azathioprine if possible. If essential, reduce dose by 90% and administer 3x/week. Consider alternative immunosuppressant (mycophenolate)",
                dosingGuideline: "If used: 10% of standard dose, 3x weekly. Consider mycophenolate as alternative",
            },
        },
    },

    FLUOROURACIL: {
        gene: "DPYD",
        description: "5-Fluorouracil (5-FU) is catabolized by DPD enzyme encoded by DPYD gene",
        mechanism: "DPD is the rate-limiting enzyme in 5-FU catabolism. Deficiency leads to 5-FU accumulation and severe toxicity",
        phenotypeRiskMap: {
            NM: {
                riskLabel: "Safe",
                severity: "none",
                explanation: "Normal DPD activity provides standard fluoropyrimidine metabolism",
                recommendation: "Use 5-FU at standard dose per protocol",
                dosingGuideline: "Standard dose per oncology protocol",
            },
            IM: {
                riskLabel: "Adjust Dosage",
                severity: "high",
                explanation: "Reduced DPD activity increases risk of severe 5-FU toxicity (mucositis, myelosuppression, neurotoxicity)",
                recommendation: "Reduce 5-FU starting dose by 25-50%. Monitor closely for toxicity. Consider therapeutic drug monitoring",
                dosingGuideline: "Reduce dose by 25-50% with therapeutic drug monitoring",
            },
            PM: {
                riskLabel: "Toxic",
                severity: "critical",
                explanation: "Absent or near-absent DPD activity causes life-threatening 5-FU accumulation — can be fatal",
                recommendation: "AVOID 5-FU and all fluoropyrimidine-based regimens. Use alternative chemotherapy agent",
                dosingGuideline: "Contraindicated — do NOT administer. Select alternative regimen",
            },
        },
    },
};

// ============================================================
// PHENOTYPE DETERMINATION
// Maps total activity score → metabolizer phenotype
// ============================================================
export function determinePhenotype(gene, activityScore) {
    if (gene === "SLCO1B1") {
        if (activityScore >= 2.0) return "NF";   // Normal Function
        if (activityScore >= 1.0) return "DF";   // Decreased Function
        return "PF";                              // Poor Function
    }

    // Standard CYP enzyme / TPMT / DPYD phenotype mapping
    if (activityScore >= 2.25) return "URM";    // Ultrarapid Metabolizer
    if (activityScore >= 1.5) return "RM";      // Rapid Metabolizer
    if (activityScore >= 1.0) return "NM";      // Normal Metabolizer
    if (activityScore > 0) return "IM";         // Intermediate Metabolizer
    return "PM";                                // Poor Metabolizer
}

// ============================================================
// FULL PHENOTYPE NAMES
// ============================================================
export const PHENOTYPE_NAMES = {
    URM: "Ultrarapid Metabolizer",
    RM: "Rapid Metabolizer",
    NM: "Normal Metabolizer",
    IM: "Intermediate Metabolizer",
    PM: "Poor Metabolizer",
    NF: "Normal Function",
    DF: "Decreased Function",
    PF: "Poor Function",
    Unknown: "Unknown",
};

// ============================================================
// SUPPORTED DRUGS LIST
// ============================================================
export const SUPPORTED_DRUGS = [
    "CODEINE",
    "WARFARIN",
    "CLOPIDOGREL",
    "SIMVASTATIN",
    "AZATHIOPRINE",
    "FLUOROURACIL",
];

// ============================================================
// rsID → Gene + Star Allele reverse lookup
// ============================================================
export function buildRsidLookup() {
    const lookup = {};
    for (const [geneName, geneDef] of Object.entries(GENE_DEFINITIONS)) {
        for (const [starAllele, alleleDef] of Object.entries(geneDef.starAlleles)) {
            for (const rsid of alleleDef.rsids) {
                if (!lookup[rsid]) lookup[rsid] = [];
                lookup[rsid].push({
                    gene: geneName,
                    starAllele,
                    function: alleleDef.function,
                    activityScore: alleleDef.activityScore,
                });
            }
        }
    }
    return lookup;
}

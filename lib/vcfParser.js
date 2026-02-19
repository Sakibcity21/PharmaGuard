/**
 * PharmaGuard — VCF File Parser
 * Parses VCF v4.x files and extracts pharmacogenomic variants.
 */

import { buildRsidLookup, GENE_DEFINITIONS } from "./pharmacogenomics";

/**
 * Parse a VCF file string and extract pharmacogenomic variants.
 * @param {string} vcfContent - Raw VCF file content
 * @returns {{ variants: Array, metadata: Object, errors: Array }}
 */
export function parseVCF(vcfContent) {
    const lines = vcfContent.split(/\r?\n/);
    const errors = [];
    const metadata = {
        fileformat: null,
        sampleIds: [],
        headerFields: [],
        totalVariants: 0,
        pgxVariants: 0,
    };

    // Validate VCF magic header
    if (!lines[0] || !lines[0].startsWith("##fileformat=VCF")) {
        errors.push("Invalid VCF file: missing ##fileformat=VCF header line");
        return { variants: [], metadata, errors };
    }

    metadata.fileformat = lines[0].replace("##fileformat=", "").trim();

    // Build rsID lookup table
    const rsidLookup = buildRsidLookup();
    const knownGenes = new Set(Object.keys(GENE_DEFINITIONS));

    let headerLine = null;
    const variants = [];
    const metaLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Collect meta-information lines
        if (line.startsWith("##")) {
            metaLines.push(line);
            continue;
        }

        // Parse header line (#CHROM POS ID ...)
        if (line.startsWith("#CHROM") || line.startsWith("#chrom")) {
            headerLine = line.substring(1).split("\t");
            metadata.headerFields = headerLine;
            // Extract sample IDs (columns after FORMAT)
            const formatIdx = headerLine.indexOf("FORMAT");
            if (formatIdx >= 0 && headerLine.length > formatIdx + 1) {
                metadata.sampleIds = headerLine.slice(formatIdx + 1);
            }
            continue;
        }

        // Skip any other comment lines
        if (line.startsWith("#")) continue;

        // Parse data line
        const fields = line.split("\t");
        if (fields.length < 8) {
            errors.push(`Line ${i + 1}: insufficient fields (expected ≥8, got ${fields.length})`);
            continue;
        }

        const [chrom, pos, id, ref, alt, qual, filter, info, ...rest] = fields;
        metadata.totalVariants++;

        // Parse INFO field
        const infoMap = parseInfoField(info);

        // Parse FORMAT + sample genotype if present
        let genotype = null;
        let genotypeQuality = null;
        if (rest.length >= 2) {
            const formatFields = rest[0].split(":");
            const sampleFields = rest[1].split(":");
            const gtIndex = formatFields.indexOf("GT");
            const gqIndex = formatFields.indexOf("GQ");
            if (gtIndex >= 0 && sampleFields[gtIndex]) {
                genotype = sampleFields[gtIndex];
            }
            if (gqIndex >= 0 && sampleFields[gqIndex]) {
                genotypeQuality = parseFloat(sampleFields[gqIndex]);
            }
        }

        // Determine if this variant is pharmacogenomically relevant
        const rsids = extractRsids(id);
        const geneFromInfo = infoMap.GENE || infoMap.gene || null;
        const starFromInfo = infoMap.STAR || infoMap.star || null;

        // Check relevance: either INFO tag has a known gene, or rsID matches our database
        let isPgx = false;
        let pgxAnnotations = [];

        // Check by INFO GENE tag
        if (geneFromInfo && knownGenes.has(geneFromInfo.toUpperCase())) {
            isPgx = true;
            pgxAnnotations.push({
                gene: geneFromInfo.toUpperCase(),
                starAllele: starFromInfo || null,
                source: "VCF_INFO",
            });
        }

        // Check by rsID lookup
        for (const rsid of rsids) {
            if (rsidLookup[rsid]) {
                isPgx = true;
                for (const match of rsidLookup[rsid]) {
                    pgxAnnotations.push({
                        gene: match.gene,
                        starAllele: match.starAllele,
                        function: match.function,
                        activityScore: match.activityScore,
                        source: "rsID_lookup",
                    });
                }
            }
        }

        // Also check RS tag in INFO
        const rsFromInfo = infoMap.RS || infoMap.rs || null;
        if (rsFromInfo) {
            const normalizedRs = rsFromInfo.startsWith("rs") ? rsFromInfo : `rs${rsFromInfo}`;
            if (rsidLookup[normalizedRs]) {
                isPgx = true;
                for (const match of rsidLookup[normalizedRs]) {
                    // Avoid duplicates
                    if (!pgxAnnotations.find(a => a.gene === match.gene && a.starAllele === match.starAllele)) {
                        pgxAnnotations.push({
                            gene: match.gene,
                            starAllele: match.starAllele,
                            function: match.function,
                            activityScore: match.activityScore,
                            source: "INFO_RS",
                        });
                    }
                }
                if (!rsids.includes(normalizedRs)) rsids.push(normalizedRs);
            }
        }

        if (isPgx) {
            metadata.pgxVariants++;
            variants.push({
                chrom,
                pos: parseInt(pos),
                rsids,
                ref,
                alt: alt.split(","),
                qual: qual === "." ? null : parseFloat(qual),
                filter,
                info: infoMap,
                genotype,
                genotypeQuality,
                pgxAnnotations,
                rawLine: line,
            });
        }
    }

    if (!headerLine) {
        errors.push("Invalid VCF: no header line (#CHROM ...) found");
    }

    return { variants, metadata, errors };
}

/**
 * Parse INFO field (key=value pairs separated by semicolons)
 */
function parseInfoField(info) {
    const map = {};
    if (!info || info === ".") return map;

    const entries = info.split(";");
    for (const entry of entries) {
        const eqIdx = entry.indexOf("=");
        if (eqIdx >= 0) {
            map[entry.substring(0, eqIdx)] = entry.substring(eqIdx + 1);
        } else {
            map[entry] = true; // Flag field
        }
    }
    return map;
}

/**
 * Extract rsIDs from the ID column (may be semicolon-separated or comma-separated)
 */
function extractRsids(idField) {
    if (!idField || idField === ".") return [];
    return idField
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith("rs"));
}

/**
 * Validate VCF file before full parsing (quick checks)
 */
export function validateVCF(content) {
    if (!content || typeof content !== "string") {
        return { valid: false, error: "Empty or invalid file content" };
    }

    if (content.length > 5 * 1024 * 1024) {
        return { valid: false, error: "File exceeds 5 MB size limit" };
    }

    const firstLine = content.split(/\r?\n/)[0] || "";
    if (!firstLine.startsWith("##fileformat=VCF")) {
        return {
            valid: false,
            error: "Invalid VCF format: file must begin with ##fileformat=VCFv4.x",
        };
    }

    return { valid: true, error: null };
}

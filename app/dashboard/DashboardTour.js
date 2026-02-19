"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// TOUR STEPS — each points to a DOM element via selector
// ============================================================
const TOUR_STEPS = [
    {
        selector: null, // Welcome — no target
        title: "Welcome to PharmaGuard! 🧬",
        description: "Let us quickly show you around the dashboard. This guided tour will help you understand each section and get started in seconds.",
        position: "center",
    },
    {
        selector: "#tour-upload",
        title: "Upload Patient VCF File 📁",
        description: "Drag & drop or click here to upload a patient's Variant Call Format (.vcf) file. This contains the genetic data needed for analysis.",
        position: "right",
    },
    {
        selector: "#tour-drugs",
        title: "Select Drugs to Analyze 💊",
        description: "Click on drug chips to select which medications to analyze. You can also type drug names in the input field below.",
        position: "right",
    },
    {
        selector: "#tour-ancestry",
        title: "Set Patient Ancestry 🌍",
        description: "Optionally select the patient's ancestry for population-aware pharmacogenomic analysis. This adjusts risk predictions based on allele frequencies.",
        position: "right",
    },
    {
        selector: "#tour-analyze",
        title: "Run Analysis 🔬",
        description: "Click this button to start the AI-powered pharmacogenomic analysis. Results appear in seconds with risk scores, clinical notes, and recommendations.",
        position: "top",
    },
    {
        selector: "#tour-view-toggle",
        title: "Switch View Mode 🔄",
        description: "Toggle between Clinician view (detailed clinical data) and Patient view (simplified, easy-to-understand language).",
        position: "bottom",
    },
    {
        selector: "#tour-samples",
        title: "Quick-Load Sample Files 📂",
        description: "Don't have a VCF file? Load a pre-built sample patient to explore the dashboard features instantly.",
        position: "left",
    },
    {
        selector: "#tour-genes",
        title: "Target Genes Reference 🧬",
        description: "View the 6 pharmacogenes that PharmaGuard analyzes — from CYP2D6 to DPYD — with their chromosomal locations and functions.",
        position: "left",
    },
];

const LS_KEY = "pharmaguard_tour_done";

// ============================================================
// TOUR COMPONENT
// ============================================================
export default function DashboardTour({ forceStart, onClose }) {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState(null);
    const [tooltipStyle, setTooltipStyle] = useState({});
    const [isAnimating, setIsAnimating] = useState(false);
    const tooltipRef = useRef(null);

    // Check if tour should show (first time)
    useEffect(() => {
        const done = localStorage.getItem(LS_KEY);
        if (!done) {
            const t = setTimeout(() => setActive(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    // Force start from sidebar button
    useEffect(() => {
        if (forceStart) {
            setStep(0);
            setActive(true);
        }
    }, [forceStart]);

    // Position the spotlight and tooltip for current step
    const positionStep = useCallback(() => {
        const currentStep = TOUR_STEPS[step];
        if (!currentStep) return;

        if (!currentStep.selector) {
            setSpotlightRect(null);
            setTooltipStyle({
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            });
            return;
        }

        const el = document.querySelector(currentStep.selector);
        if (!el) {
            setSpotlightRect(null);
            setTooltipStyle({
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            });
            return;
        }

        // Scroll element into view using the .main container
        const mainEl = document.querySelector(".main");
        if (mainEl) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Wait for scroll to complete, then measure
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const pad = 10;
            setSpotlightRect({
                top: rect.top - pad,
                left: rect.left - pad,
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
            });

            const pos = currentStep.position || "bottom";
            const tooltipW = 380;
            const tooltipH = 240;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let style = { position: "fixed" };

            switch (pos) {
                case "right":
                    style.top = `${Math.min(rect.top + rect.height / 2, vh - tooltipH - 16)}px`;
                    style.left = `${rect.right + 24}px`;
                    style.transform = "translateY(-50%)";
                    if (rect.right + 24 + tooltipW > vw) {
                        style = { position: "fixed", top: `${rect.bottom + 16}px`, left: `${Math.max(16, rect.left)}px`, transform: "none" };
                    }
                    break;
                case "left": {
                    const leftPos = rect.left - tooltipW - 24;
                    if (leftPos >= 16) {
                        // Fits on the left
                        style.top = `${Math.max(16, Math.min(rect.top + rect.height / 2, vh - tooltipH - 16))}px`;
                        style.left = `${leftPos}px`;
                        style.transform = "translateY(-50%)";
                    } else {
                        // Fallback: place above the element, centered horizontally over it
                        const centerX = rect.left + rect.width / 2;
                        const clampedLeft = Math.max(16, Math.min(centerX - tooltipW / 2, vw - tooltipW - 16));
                        if (rect.top - tooltipH - 16 > 16) {
                            style.top = `${rect.top - tooltipH - 16}px`;
                        } else {
                            style.top = `${rect.bottom + 16}px`;
                        }
                        style.left = `${clampedLeft}px`;
                        style.transform = "none";
                    }
                    break;
                }
                case "top":
                    style.left = `${rect.left + rect.width / 2}px`;
                    style.transform = "translateX(-50%)";
                    if (rect.top - tooltipH - 16 > 16) {
                        style.top = `${rect.top - tooltipH - 16}px`;
                    } else {
                        style.top = `${rect.bottom + 16}px`;
                    }
                    break;
                case "bottom":
                default:
                    style.top = `${Math.min(rect.bottom + 16, vh - tooltipH - 16)}px`;
                    style.left = `${rect.left + rect.width / 2}px`;
                    style.transform = "translateX(-50%)";
                    break;
            }

            // Final clamp: ensure tooltip doesn't overflow viewport
            if (style.left && !style.transform?.includes("translateX")) {
                const leftVal = parseFloat(style.left);
                if (leftVal + tooltipW > vw - 16) {
                    style.left = `${vw - tooltipW - 16}px`;
                }
                if (leftVal < 16) {
                    style.left = "16px";
                }
            }

            setTooltipStyle(style);
        }, 350);
    }, [step]);

    useEffect(() => {
        if (!active) return;
        setIsAnimating(true);
        const t = setTimeout(() => {
            positionStep();
            setIsAnimating(false);
        }, 150);
        return () => clearTimeout(t);
    }, [active, step, positionStep]);

    // Reposition on resize
    useEffect(() => {
        if (!active) return;
        const handleResize = () => positionStep();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [active, positionStep]);

    const finish = () => {
        setActive(false);
        localStorage.setItem(LS_KEY, "true");
        onClose?.();
    };

    const next = () => {
        if (step < TOUR_STEPS.length - 1) setStep(step + 1);
        else finish();
    };

    const prev = () => {
        if (step > 0) setStep(step - 1);
    };

    if (!active) return null;

    const currentStep = TOUR_STEPS[step];
    const isFirst = step === 0;
    const isLast = step === TOUR_STEPS.length - 1;

    return (
        <div className="tour-overlay">
            {/* SVG overlay with spotlight cutout */}
            <svg className="tour-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {spotlightRect && (
                            <rect
                                x={spotlightRect.left}
                                y={spotlightRect.top}
                                width={spotlightRect.width}
                                height={spotlightRect.height}
                                rx="16"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0" y="0"
                    width="100%" height="100%"
                    fill="rgba(0, 0, 0, 0.6)"
                    mask="url(#tour-mask)"
                />
            </svg>

            {/* Spotlight ring */}
            {spotlightRect && (
                <div
                    className="tour-spotlight-ring"
                    style={{
                        top: spotlightRect.top,
                        left: spotlightRect.left,
                        width: spotlightRect.width,
                        height: spotlightRect.height,
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`tour-tooltip ${isAnimating ? "tour-tooltip-enter" : "tour-tooltip-active"}`}
                style={tooltipStyle}
            >
                {/* Close button */}
                <button className="tour-close" onClick={finish} title="Close tour">
                    ✕
                </button>

                {/* Content */}
                <div className="tour-content">
                    <div className="tour-step-badge">
                        Step {step + 1} of {TOUR_STEPS.length}
                    </div>
                    <h3 className="tour-title">{currentStep.title}</h3>
                    <p className="tour-desc">{currentStep.description}</p>
                </div>

                {/* Progress dots */}
                <div className="tour-progress">
                    {TOUR_STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`tour-dot ${i === step ? "tour-dot-active" : ""} ${i < step ? "tour-dot-done" : ""}`}
                        />
                    ))}
                </div>

                {/* Buttons */}
                <div className="tour-actions">
                    <button className="tour-skip" onClick={finish}>
                        {isLast ? "" : "Skip Tour"}
                    </button>
                    <div className="tour-nav-btns">
                        {!isFirst && (
                            <button className="tour-btn-back" onClick={prev}>
                                ← Back
                            </button>
                        )}
                        <button className="tour-btn-next" onClick={next}>
                            {isLast ? "Get Started! 🚀" : "Next →"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

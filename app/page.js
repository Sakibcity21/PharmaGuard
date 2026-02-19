"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ============================================================
// LANDING PAGE
// ============================================================
const NAV_ITEMS = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Testimonials", href: "#testimonials" },
];

const FEATURES = [
    {
        title: "VCF v4.x Parsing",
        description: "Ultra-fast genomic data interpretation with full v4.x compliance and automated variant annotation.",
        icon: "🧬",
        tag: "Core Tech",
    },
    {
        title: "AI Risk Mapping",
        description: "Automated risk scoring using global CPIC & PharmGKB standards with real-time confidence metrics.",
        icon: "⚠️",
        tag: "Clinical",
    },
    {
        title: "AI Clinical Notes",
        description: "Generate instant, natural-language clinical reports powered by Gemini AI for EHR integration.",
        icon: "🧠",
        tag: "Generative AI",
    },
    {
        title: "Ancestry-Aware Logic",
        description: "Dynamic risk adjustment based on global population allele frequencies for precision dosing.",
        icon: "🌍",
        tag: "Precision",
    },
    {
        title: "What-If Simulator",
        description: "Simulate dose changes in real-time to preview risk outcomes before prescribing decisions.",
        icon: "🔄",
        tag: "Interactive",
    },
    {
        title: "Dual-View Interface",
        description: "Switch between Clinician and Patient views for tailored insights and health literacy.",
        icon: "👥",
        tag: "UX",
    },
];

const STEPS = [
    {
        num: "01",
        title: "Upload VCF File",
        description: "Upload a patient's Variant Call Format file or load a demo profile to begin genomic analysis.",
    },
    {
        num: "02",
        title: "Select Drugs & Ancestry",
        description: "Choose from 6 CPIC-guided drugs and optionally set patient ancestry for population-aware results.",
    },
    {
        num: "03",
        title: "AI-Powered Analysis",
        description: "Our engine cross-references genetic variants with pharmacogenomic databases to predict drug response.",
    },
    {
        num: "04",
        title: "Get Clinical Insights",
        description: "Receive risk scores, AI clinical notes, and downloadable patient summaries — all EHR-ready.",
    },
];

const TESTIMONIALS = [
    {
        content: "PharmaGuard has completely transformed our prescribing workflow. The AI-generated clinical notes save us hours of documentation every week while ensuring HIPAA compliance.",
        name: "Dr. Sarah Mitchell",
        role: "Chief Pharmacologist, St. Jude's",
        avatar: "https://i.pravatar.cc/150?u=sarah",
    },
    {
        content: "The ability to interpret genomic variants in seconds and get color-coded risk alerts is a game changer for oncology. We no longer wait days for third-party lab interpretations.",
        name: "Dr. Robert Chen",
        role: "Director of Genomic Medicine",
        avatar: "https://i.pravatar.cc/150?u=robert",
    },
];

const COMPLIANCE_BADGES = [
    "CPIC COMPLIANT",
    "PHARMGKB MAPPING",
    "HIPAA SECURE",
    "CLIA VALIDATED",
    "FDA-LISTED",
];

const STATS = [
    { value: "400+", label: "CPIC Interaction Pairs" },
    { value: "6", label: "Pharmacogenes Analyzed" },
    { value: "99%", label: "Safety Index Accuracy" },
    { value: "< 2s", label: "Analysis Speed" },
];

export default function LandingPage() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileNav, setMobileNav] = useState(false);
    const cursorRef = useRef(null);
    const mousePos = useRef({ x: -100, y: -100 });
    const cursorPos = useRef({ x: -100, y: -100 });

    // Scroll handler
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 30);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Reveal animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("lp-visible");
                    }
                });
            },
            { threshold: 0.1 }
        );
        document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // Custom cursor
    useEffect(() => {
        const cursor = cursorRef.current;
        if (!cursor) return;

        const onMouseMove = (e) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };

        const onMouseDown = () => document.body.classList.add("cursor-active");
        const onMouseUp = () => document.body.classList.remove("cursor-active");

        const interactiveSelector = "a, button, [role='button'], input, select, textarea, .lp-feature-card, .lp-step-card, .lp-testimonial-card, .lp-btn-dark, .lp-btn-outline, .lp-nav-cta, .lp-cta-btn-primary, .lp-cta-btn-secondary";

        const onMouseEnterInteractive = () => document.body.classList.add("cursor-hover");
        const onMouseLeaveInteractive = () => document.body.classList.remove("cursor-hover");

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mouseup", onMouseUp);

        document.querySelectorAll(interactiveSelector).forEach((el) => {
            el.addEventListener("mouseenter", onMouseEnterInteractive);
            el.addEventListener("mouseleave", onMouseLeaveInteractive);
        });

        // Smooth cursor follow loop
        let animId;
        const animate = () => {
            cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.15;
            cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.15;
            cursor.style.left = `${cursorPos.current.x}px`;
            cursor.style.top = `${cursorPos.current.y}px`;
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mouseup", onMouseUp);
            cancelAnimationFrame(animId);
            document.querySelectorAll(interactiveSelector).forEach((el) => {
                el.removeEventListener("mouseenter", onMouseEnterInteractive);
                el.removeEventListener("mouseleave", onMouseLeaveInteractive);
            });
        };
    }, []);

    return (
        <div className="landing-page">
            {/* ═══ CUSTOM CURSOR ═══ */}
            <div id="custom-cursor" ref={cursorRef}></div>

            {/* ═══ PREMIUM BACKGROUND ═══ */}
            <div className="lp-bg">
                <div className="lp-mesh"></div>
                <div className="lp-orb lp-orb-1"></div>
                <div className="lp-orb lp-orb-2"></div>
            </div>
            <div className="lp-motion-grid"></div>
            <div className="lp-noise"></div>

            {/* ═══ NAVBAR ═══ */}
            <nav className={`lp-nav ${isScrolled ? "lp-nav-scrolled" : ""}`}>
                <div className="lp-nav-inner">
                    <Link href="/" className="lp-brand">
                        <div className="lp-brand-icon">
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.403 1.208a2 2 0 01-2.69 1.144l-1.083-.542a2 2 0 01-1.127-1.801v-3.044a2 2 0 01.586-1.414l2.121-2.121a2 2 0 012.828 0l1.12 1.121a2 2 0 01.45 2.58l-.499 1.498" />
                            </svg>
                        </div>
                        <span className="lp-brand-text">PHARMA<span>GUARD</span></span>
                    </Link>

                    <div className="lp-nav-links">
                        {NAV_ITEMS.map((item) => (
                            <a key={item.label} href={item.href} className="lp-nav-link">
                                {item.label}
                            </a>
                        ))}
                    </div>

                    <Link href="/dashboard" className="lp-nav-cta">
                        Launch Dashboard
                    </Link>

                    <button className="lp-mobile-toggle" onClick={() => setMobileNav(!mobileNav)}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileNav && (
                    <div className="lp-mobile-menu">
                        {NAV_ITEMS.map((item) => (
                            <a key={item.label} href={item.href} className="lp-mobile-link" onClick={() => setMobileNav(false)}>
                                {item.label}
                            </a>
                        ))}
                        <Link href="/dashboard" className="lp-mobile-cta" onClick={() => setMobileNav(false)}>
                            Launch Dashboard →
                        </Link>
                    </div>
                )}
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="lp-hero">
                {/* DNA Background SVG */}
                <div className="lp-dna-bg">
                    <svg className="lp-dna-svg" viewBox="0 0 1000 1000" fill="none" preserveAspectRatio="none">
                        <path className="lp-dna-path" d="M-50,500 C150,400 350,600 550,500 C750,400 950,600 1050,500" stroke="url(#dna-grad)" strokeWidth="2" strokeDasharray="10 20" />
                        <path className="lp-dna-path lp-dna-path-2" d="M-50,520 C150,620 350,420 550,520 C750,620 950,420 1050,520" stroke="url(#dna-grad)" strokeWidth="1.5" strokeDasharray="8 16" />
                        <defs>
                            <linearGradient id="dna-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#14b8a6" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <div className="lp-hero-content">
                    <div className="lp-hero-badge lp-reveal">
                        <span className="lp-ping-wrap">
                            <span className="lp-ping"></span>
                            <span className="lp-ping-dot"></span>
                        </span>
                        <span>Next-Gen Pharmacogenomics</span>
                    </div>

                    <h1 className="lp-hero-title lp-reveal">
                        Precision Dosing. <br />
                        <span className="lp-hero-gradient">Genomic Insight.</span>
                    </h1>

                    <p className="lp-hero-sub lp-reveal">
                        PharmaGuard identifies genetic variants that dictate drug metabolism.
                        Prevent toxicity and ensure efficacy with real-time genomic intelligence.
                    </p>

                    <div className="lp-hero-actions lp-reveal">
                        <Link href="/dashboard" className="lp-btn-dark">
                            Launch Dashboard
                        </Link>
                        <a href="#features" className="lp-btn-outline">
                            View Protocol
                        </a>
                    </div>

                    {/* Hero Image Showcase */}
                    <div className="lp-hero-showcase lp-reveal">
                        <div className="lp-showcase-glow"></div>

                        {/* Floating Card — Left */}
                        <div className="lp-float-card lp-float-left">
                            <div className="lp-float-card-header">
                                <span className="lp-float-dot"></span>
                                <span className="lp-float-label">Genomic Match</span>
                            </div>
                            <div className="lp-float-bars">
                                <div className="lp-float-bar" style={{ width: "100%" }}></div>
                                <div className="lp-float-bar" style={{ width: "75%" }}></div>
                                <div className="lp-float-bar lp-float-bar-blue" style={{ width: "50%" }}></div>
                            </div>
                        </div>

                        {/* Floating Card — Right */}
                        <div className="lp-float-card lp-float-right">
                            <div className="lp-float-big-num">99%</div>
                            <div className="lp-float-right-label">Safety index across <br /> validated cohorts</div>
                        </div>

                        {/* Main Image */}
                        <div className="lp-showcase-frame">
                            <img
                                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&h=650&q=80"
                                alt="High Tech Laboratory"
                                className="lp-showcase-img"
                            />
                            <div className="lp-showcase-fade"></div>

                            {/* Bottom Glass Card */}
                            <div className="lp-showcase-overlay">
                                <div className="lp-overlay-glass">
                                    <div className="lp-overlay-top">
                                        <div className="lp-overlay-icon">
                                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div>
                                            <div className="lp-overlay-tag">Engine Status</div>
                                            <div className="lp-overlay-status">Active Discovery</div>
                                        </div>
                                    </div>
                                    <p className="lp-overlay-desc">Our proprietary engine maps 400+ CPIC interaction pairs against patient variants in real-time.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ COMPLIANCE MARQUEE ═══ */}
            <section className="lp-marquee-section lp-reveal">
                <p className="lp-marquee-label">Clinical Framework & Regulatory Standards</p>
                <div className="lp-marquee-track">
                    <div className="lp-marquee-scroll">
                        {[...COMPLIANCE_BADGES, ...COMPLIANCE_BADGES].map((b, i) => (
                            <span key={i} className="lp-marquee-item">{b}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FEATURES ═══ */}
            <section id="features" className="lp-features">
                <div className="lp-section-container">
                    <div className="lp-section-header lp-reveal">
                        <span className="lp-section-tag">Capability Stack</span>
                        <h2 className="lp-section-title">Powered by Intelligence</h2>
                        <p className="lp-section-sub">
                            Distilling complex genomic science into high-performance clinical intelligence.
                        </p>
                    </div>

                    <div className="lp-features-grid">
                        {FEATURES.map((f, idx) => (
                            <div key={idx} className="lp-feature-card lp-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                                <div className="lp-feature-top">
                                    <div className="lp-feature-icon">{f.icon}</div>
                                    <span className="lp-feature-tag">{f.tag}</span>
                                </div>
                                <h3 className="lp-feature-title">{f.title}</h3>
                                <p className="lp-feature-desc">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section id="how-it-works" className="lp-how-it-works">
                <div className="lp-section-container">
                    <div className="lp-section-header lp-reveal">
                        <span className="lp-section-tag">Workflow</span>
                        <h2 className="lp-section-title">How It Works</h2>
                        <p className="lp-section-sub">
                            From VCF upload to clinical insight in four simple steps.
                        </p>
                    </div>

                    <div className="lp-steps-grid">
                        {STEPS.map((s, idx) => (
                            <div key={idx} className="lp-step-card lp-reveal" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="lp-step-num">{s.num}</div>
                                <h3 className="lp-step-title">{s.title}</h3>
                                <p className="lp-step-desc">{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ TESTIMONIALS ═══ */}
            <section id="testimonials" className="lp-testimonials">
                <div className="lp-section-container">
                    <div className="lp-testimonials-layout">
                        <div className="lp-testimonials-left lp-reveal">
                            <h2 className="lp-section-title" style={{ textAlign: "left" }}>
                                The Standard <br />
                                <span style={{ color: "var(--blue-600)" }}>in Modern Care</span>
                            </h2>
                            <p className="lp-section-sub" style={{ textAlign: "left", maxWidth: "400px" }}>
                                Trusted by leading medical institutions and research labs worldwide.
                            </p>
                            <div className="lp-avatars-row">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <img key={i} src={`https://i.pravatar.cc/100?u=${100 + i}`} className="lp-avatar" alt="" />
                                ))}
                                <div className="lp-avatar-count">12k+</div>
                            </div>
                            <p className="lp-avatar-label">Global Members & Partners</p>
                        </div>

                        <div className="lp-testimonials-right">
                            {TESTIMONIALS.map((t, idx) => (
                                <div key={idx} className="lp-testimonial-card lp-reveal">
                                    <p className="lp-testimonial-text">"{t.content}"</p>
                                    <div className="lp-testimonial-author">
                                        <img src={t.avatar} className="lp-testimonial-avatar" alt={t.name} />
                                        <div>
                                            <div className="lp-testimonial-name">{t.name}</div>
                                            <div className="lp-testimonial-role">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="lp-cta-section">
                <div className="lp-section-container">
                    <div className="lp-cta-box lp-reveal">
                        <div className="lp-cta-glow-1"></div>
                        <div className="lp-cta-glow-2"></div>
                        <h2 className="lp-cta-title">
                            Ready for <br /> PharmaGuard?
                        </h2>
                        <p className="lp-cta-sub">
                            Start analyzing pharmacogenomic risk in seconds. Upload your VCF file and get AI-powered clinical insights instantly.
                        </p>
                        <div className="lp-cta-actions">
                            <Link href="/dashboard" className="lp-cta-btn-primary">
                                Launch Dashboard
                            </Link>
                            <a href="#features" className="lp-cta-btn-secondary">
                                View Features
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="lp-footer">
                <div className="lp-section-container">
                    <div className="lp-footer-grid">
                        <div className="lp-footer-brand">
                            <div className="lp-brand" style={{ marginBottom: "16px" }}>
                                <div className="lp-brand-icon">
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <span className="lp-brand-text">PHARMA<span>GUARD</span></span>
                            </div>
                            <p className="lp-footer-desc">
                                Precision genomic safety for smarter prescribing decisions.
                            </p>
                        </div>

                        <div className="lp-footer-col">
                            <h4>Capabilities</h4>
                            <a href="#">VCF Parsing</a>
                            <a href="#">Risk Prediction</a>
                            <a href="#">AI Clinical Notes</a>
                            <a href="#">What-If Simulator</a>
                        </div>

                        <div className="lp-footer-col">
                            <h4>Resources</h4>
                            <a href="#">CPIC Guidelines</a>
                            <a href="#">Documentation</a>
                            <a href="#">Research Papers</a>
                            <a href="#">API Access</a>
                        </div>

                        <div className="lp-footer-col">
                            <h4>Company</h4>
                            <a href="#">About</a>
                            <a href="#">Ethics & Privacy</a>
                            <a href="#">Contact</a>
                            <a href="#">Careers</a>
                        </div>
                    </div>

                    <div className="lp-footer-bottom">
                        <p>© 2024 PHARMAGUARD TECHNOLOGIES. HIPAA COMPLIANT.</p>
                        <div className="lp-footer-links">
                            <a href="#">Privacy</a>
                            <a href="#">Terms</a>
                            <a href="#">Contact</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

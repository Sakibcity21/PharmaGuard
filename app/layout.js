import "./globals.css";

export const metadata = {
    title: "PharmaGuard", // — Pharmacogenomic Risk Prediction
    description:
        "AI-powered pharmacogenomic risk prediction system. Upload VCF files, analyze drug-gene interactions, and receive personalized clinical recommendations aligned with CPIC guidelines.",
    keywords: [
        "pharmacogenomics",
        "precision medicine",
        "VCF",
        "drug safety",
        "CPIC",
        "CYP2D6",
        "CYP2C19",
        "pharmacogenomic testing",
    ],
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>{children}</body>
        </html>
    );
}

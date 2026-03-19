"use client";

import { useState, useRef } from "react";

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || "https://n8n.usecompound.ai/webhook/fragility-audit";

const questions = [
  {
    id: "phone_coverage",
    category: "Phone Coverage",
    question: "When your office person is unavailable, what happens to incoming calls?",
    options: [
      { text: "They go to voicemail or get missed entirely", score: 10, flag: "critical" },
      { text: "Someone else picks up but can't schedule, quote, or help much", score: 7, flag: "moderate" },
      { text: "Someone else picks up and can schedule or take basic info", score: 4, flag: "low" },
      { text: "Calls forward to my cell, but I'm usually on a job and can't answer", score: 8, flag: "critical" },
      { text: "We have an answering service that takes messages (but can't book)", score: 5, flag: "moderate" },
      { text: "An AI or auto-attendant answers, captures info, and routes or books", score: 1, flag: "low" },
    ],
  },
  {
    id: "scheduling",
    category: "Scheduling & Confirmations",
    question: "How are jobs scheduled and confirmed with customers?",
    options: [
      { text: "One person does it manually from memory, a notebook, or a whiteboard", score: 10, flag: "critical" },
      { text: "We use scheduling software, but only one person really knows how", score: 7, flag: "moderate" },
      { text: "We use software and multiple people can access and update it", score: 3, flag: "low" },
      { text: "Customers can self-book online by picking a time and day", score: 1, flag: "low" },
      { text: "Jobs are scheduled in software, but confirmations and reminders are manual", score: 6, flag: "moderate" },
      { text: "Fully automated: online booking, auto-confirmations, and reminders", score: 0, flag: "low" },
    ],
  },
  {
    id: "estimates",
    category: "Estimates & Quotes",
    question: "What happens to estimates after a tech or owner creates them?",
    options: [
      { text: "They sit until someone remembers to send them (sometimes days)", score: 10, flag: "critical" },
      { text: "One person follows up manually, but it's slow and inconsistent", score: 8, flag: "critical" },
      { text: "They go out same day, but nobody follows up if the customer doesn't respond", score: 5, flag: "moderate" },
      { text: "They're sent from the field via an app, but follow-up depends on one person", score: 6, flag: "moderate" },
      { text: "Estimates are sent and followed up automatically on a set schedule", score: 1, flag: "low" },
    ],
  },
  {
    id: "followup",
    category: "Customer Follow-Up",
    question: "After a job is complete, how do you follow up with customers?",
    options: [
      { text: "We don't, really", score: 10, flag: "critical" },
      { text: "Sometimes we call or text, depends who remembers", score: 7, flag: "moderate" },
      { text: "One person handles it, but it's hit or miss", score: 6, flag: "moderate" },
      { text: "We send a review request manually after most jobs", score: 4, flag: "low" },
      { text: "Automated: review request, thank you, and check-in all go out without anyone touching it", score: 1, flag: "low" },
    ],
  },
  {
    id: "documentation",
    category: "Process Documentation",
    question: "If your office manager quit tomorrow, could someone step in and run the day?",
    options: [
      { text: "Absolutely not. Everything is in their head.", score: 10, flag: "critical" },
      { text: "Some things are written down, but most of the critical stuff isn't", score: 7, flag: "moderate" },
      { text: "We have some SOPs or checklists but they're outdated", score: 5, flag: "moderate" },
      { text: "Most processes are documented. Someone could figure it out within a day or two.", score: 2, flag: "low" },
      { text: "Yes. Our processes are documented, accessible, and another person is cross-trained.", score: 0, flag: "low" },
    ],
  },
  {
    id: "after_hours",
    category: "After-Hours Coverage",
    question: "What happens when a customer calls outside business hours?",
    options: [
      { text: "Voicemail. We call back next morning... maybe.", score: 9, flag: "critical" },
      { text: "Rings to my personal cell. I answer when I can.", score: 7, flag: "moderate" },
      { text: "We have an answering service, but they just take messages", score: 5, flag: "moderate" },
      { text: "An on-call person answers and can dispatch or book", score: 2, flag: "low" },
      { text: "AI or automated system handles it: captures info, books, or routes to on-call", score: 1, flag: "low" },
    ],
  },
  {
    id: "data_access",
    category: "Customer Data & CRM",
    question: "Where does your customer information live?",
    options: [
      { text: "In someone's phone, a notebook, or scattered spreadsheets", score: 10, flag: "critical" },
      { text: "In a CRM, but only one person updates or really uses it", score: 6, flag: "moderate" },
      { text: "In a CRM the team uses, but data entry is inconsistent", score: 4, flag: "moderate" },
      { text: "Centralized system that everyone uses and keeps updated", score: 1, flag: "low" },
      { text: "Integrated CRM that auto-updates from calls, jobs, and invoices", score: 0, flag: "low" },
    ],
  },
  {
    id: "revenue_size",
    category: "Business Context",
    question: "What's your approximate monthly revenue?",
    options: [
      { text: "Under $50k/month", score: 0, multiplier: 0.6 },
      { text: "$50k - $150k/month", score: 0, multiplier: 1.0 },
      { text: "$150k - $400k/month", score: 0, multiplier: 1.8 },
      { text: "$400k+/month", score: 0, multiplier: 2.5 },
    ],
  },
];

const recommendations = {
  phone_coverage: {
    title: "Phone Coverage",
    rec: "Set up an AI voice agent or auto-attendant that answers every call, captures caller info, and can book or route. No more calls hitting voicemail during jobs or after hours.",
  },
  scheduling: {
    title: "Scheduling & Confirmations",
    rec: "Move to a shared scheduling system with online self-booking, automated confirmations, and reminders. Remove the single-person dependency from your calendar entirely.",
  },
  estimates: {
    title: "Estimates & Quotes",
    rec: "Automate estimate delivery and follow-up sequences. Every unsent or unfollowed estimate is cash left on the table. A 2-day delay costs you the job.",
  },
  followup: {
    title: "Customer Follow-Up",
    rec: "Build an automated post-job sequence: thank you text, review request at 24 hours, check-in at 30 days. This runs without anyone remembering.",
  },
  documentation: {
    title: "Process Documentation",
    rec: "Record your office manager's workflows this week. Screen recordings, checklists, anything. If it only lives in one brain, it's not a process. It's a risk.",
  },
  after_hours: {
    title: "After-Hours Coverage",
    rec: "Implement AI call handling or smart routing for after-hours. The homeowner calling at 8pm is booking whoever answers first. That should be you.",
  },
  data_access: {
    title: "Customer Data & CRM",
    rec: "Consolidate everything into one CRM that the whole team touches and that auto-updates from your workflows. Notebooks and personal phones are where customer relationships go to die.",
  },
};

const riskTiers = [
  { max: 20, tier: "Low Risk", color: "#22c55e", bg: "#052e16", desc: "Your operations have solid redundancy. Keep refining." },
  { max: 40, tier: "Moderate Risk", color: "#eab308", bg: "#422006", desc: "Some gaps that could hurt you on a bad week. Fixable." },
  { max: 60, tier: "High Risk", color: "#f97316", bg: "#431407", desc: "Significant fragility. One sick day away from chaos." },
  { max: 100, tier: "Critical Risk", color: "#ef4444", bg: "#450a0a", desc: "Your business runs on hope and one person's memory. Fix this now." },
];

function Logo() {
  return (
    <div id="logo-wrap" style={{ marginBottom: 32, opacity: 0.7 }}>
      <img
        src="/logo.png"
        alt="Compound Systems"
        style={{ height: 22, width: "auto", filter: "brightness(0.9)", display: "block" }}
        onError={(e) => { e.target.parentElement.style.display = "none"; }}
      />
    </div>
  );
}

export default function AuditPage() {
  const [screen, setScreen] = useState("welcome");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const resultsRef = useRef(null);

  const transition = (callback) => {
    setFadeIn(false);
    setTimeout(() => {
      callback();
      setFadeIn(true);
    }, 300);
  };

  const handleAnswer = (optionIndex) => {
    setSelected(optionIndex);
    const q = questions[currentQ];
    const option = q.options[optionIndex];
    const newAnswers = { ...answers, [q.id]: { ...option, questionText: q.question, answerText: option.text } };
    setAnswers(newAnswers);

    setTimeout(() => {
      transition(() => {
        setSelected(null);
        if (currentQ < questions.length - 1) {
          setCurrentQ(currentQ + 1);
        } else {
          setScreen("teaser");
        }
      });
    }, 400);
  };

  const calculateResults = () => {
    const multiplier = answers.revenue_size?.multiplier || 1.0;
    let totalScore = 0;
    let criticalCount = 0;
    const weakAreas = [];

    Object.entries(answers).forEach(([id, answer]) => {
      if (id === "revenue_size") return;
      totalScore += answer.score;
      if (answer.flag === "critical") {
        criticalCount++;
        weakAreas.push(id);
      } else if (answer.flag === "moderate" && weakAreas.length < 5) {
        weakAreas.push(id);
      }
    });

    const maxPossible = 70;
    const normalized = Math.round((totalScore / maxPossible) * 100);
    const baseLoss = 800 + (totalScore * 85);
    const estimatedLoss = Math.round(baseLoss * multiplier / 100) * 100;
    const tier = riskTiers.find((t) => normalized <= t.max) || riskTiers[3];

    return { normalized, totalScore, criticalCount, weakAreas, estimatedLoss, tier, multiplier };
  };

  const handleSubmit = async () => {
    if (!email) return;
    setSubmitted(true);
    setScreen("results");

    const results = calculateResults();
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          name,
          email,
          company,
          score: results.normalized,
          tier: results.tier.tier,
          estimatedMonthlyLoss: results.estimatedLoss,
          criticalAreas: results.weakAreas.join(", "),
          answers: Object.entries(answers).map(([id, a]) => ({
            question: a.questionText,
            answer: a.answerText,
          })),
        }),
      });
    } catch (e) {
      console.log("Webhook not configured yet");
    }
  };

  const results = screen === "results" || screen === "teaser" ? calculateResults() : null;
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e5e5e5",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
        backgroundSize: "60px 60px", pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 640, margin: "0 auto", padding: "40px 20px",
        position: "relative", zIndex: 1,
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>

        {/* WELCOME */}
        {screen === "welcome" && (
          <div>
            <Logo />
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
              color: "#f97316", textTransform: "uppercase", marginBottom: 24,
            }}>
              Operations Fragility Audit
            </div>

            <h1 style={{
              fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, lineHeight: 1.15,
              color: "#fff", margin: "0 0 20px 0",
            }}>
              How fragile is your business?
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#a3a3a3", margin: "0 0 16px 0" }}>
              Most home services companies are one sick day away from operational chaos. They just don't know it yet.
            </p>

            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#a3a3a3", margin: "0 0 32px 0" }}>
              This audit scores your operational fragility, estimates how much revenue you're leaving on the table every month, and shows you exactly where automation fits.
            </p>

            <div style={{
              display: "flex", gap: 24, marginBottom: 40, flexWrap: "wrap",
            }}>
              {[
                { num: "8", label: "Questions" },
                { num: "3", label: "Minutes" },
                { num: "$$$", label: "At Stake" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: "#f97316" }}>{item.num}</span>
                  <span style={{ fontSize: 13, color: "#737373", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => transition(() => setScreen("quiz"))}
              style={{
                background: "#f97316", color: "#0a0a0a", border: "none",
                padding: "16px 40px", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s", letterSpacing: 0.5,
              }}
              onMouseOver={(e) => e.target.style.background = "#fb923c"}
              onMouseOut={(e) => e.target.style.background = "#f97316"}
            >
              Start the Audit
            </button>
          </div>
        )}

        {/* QUIZ */}
        {screen === "quiz" && (
          <div>
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#737373", letterSpacing: 2, textTransform: "uppercase" }}>
                  {questions[currentQ].category}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#737373" }}>
                  {currentQ + 1}/{questions.length}
                </span>
              </div>
              <div style={{ height: 2, background: "#262626", width: "100%" }}>
                <div style={{
                  height: "100%", background: "#f97316", width: `${progress}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>

            <h2 style={{
              fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700, lineHeight: 1.35,
              color: "#fff", margin: "0 0 28px 0",
            }}>
              {questions[currentQ].question}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {questions[currentQ].options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  style={{
                    background: selected === i ? "#f9731620" : "#161616",
                    border: selected === i ? "1px solid #f97316" : "1px solid #262626",
                    color: "#e5e5e5",
                    padding: "14px 16px",
                    fontSize: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.5,
                  }}
                  onMouseOver={(e) => {
                    if (selected !== i) {
                      e.target.style.borderColor = "#404040";
                      e.target.style.background = "#1a1a1a";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selected !== i) {
                      e.target.style.borderColor = "#262626";
                      e.target.style.background = "#161616";
                    }
                  }}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TEASER */}
        {screen === "teaser" && results && (
          <div>
            <Logo />
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
              color: "#f97316", textTransform: "uppercase", marginBottom: 24,
            }}>
              Your Results Are Ready
            </div>

            <div style={{
              background: "#161616", border: "1px solid #262626",
              padding: 32, marginBottom: 32,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 48, fontWeight: 700,
                  color: results.tier.color,
                }}>
                  {results.normalized}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: results.tier.color }}>
                    {results.tier.tier}
                  </div>
                  <div style={{ fontSize: 13, color: "#737373" }}>Fragility Score out of 100</div>
                </div>
              </div>

              <div style={{
                height: 6, background: "#262626", width: "100%", marginBottom: 20,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${results.normalized}%`,
                  background: "linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444)",
                  transition: "width 1s ease",
                }} />
              </div>

              <p style={{ fontSize: 15, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>
                {results.tier.desc}
              </p>
            </div>

            <div style={{ position: "relative", marginBottom: 32 }}>
              <div style={{ filter: "blur(6px)", opacity: 0.4, pointerEvents: "none" }}>
                <div style={{ background: "#161616", padding: 24, marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                    Estimated Monthly Revenue at Risk
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 36, color: "#ef4444" }}>
                    ${results.estimatedLoss.toLocaleString()}/mo
                  </div>
                </div>
                <div style={{ background: "#161616", padding: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                    Top Recommendations
                  </div>
                  <div style={{ color: "#a3a3a3", fontSize: 14 }}>
                    Based on your answers, here are the 3 highest-impact changes...
                  </div>
                </div>
              </div>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  background: "#0a0a0a", border: "1px solid #f97316",
                  padding: "16px 24px", textAlign: "center",
                }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#f97316", letterSpacing: 1 }}>
                    ENTER YOUR EMAIL TO UNLOCK FULL RESULTS
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  background: "#161616", border: "1px solid #262626", color: "#fff",
                  padding: "14px 16px", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = "#262626"}
              />
              <input
                type="text"
                placeholder="Company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{
                  background: "#161616", border: "1px solid #262626", color: "#fff",
                  padding: "14px 16px", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = "#262626"}
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  background: "#161616", border: "1px solid #262626", color: "#fff",
                  padding: "14px 16px", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = "#262626"}
              />
              <button
                onClick={handleSubmit}
                disabled={!email}
                style={{
                  background: email ? "#f97316" : "#404040",
                  color: email ? "#0a0a0a" : "#737373",
                  border: "none", padding: "16px 40px", fontSize: 16, fontWeight: 700,
                  cursor: email ? "pointer" : "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                Unlock My Full Results
              </button>
              <p style={{ fontSize: 12, color: "#525252", margin: "4px 0 0 0" }}>
                No spam. Just your audit results and a few tips to fix what's broken.
              </p>
            </div>
          </div>
        )}

        {/* FULL RESULTS */}
        {screen === "results" && results && (
          <div ref={resultsRef}>
            <Logo />
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
              color: "#f97316", textTransform: "uppercase", marginBottom: 24,
            }}>
              Full Audit Results
            </div>

            <div style={{
              background: "#161616", border: "1px solid #262626",
              padding: 32, marginBottom: 24,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 56, fontWeight: 700,
                  color: results.tier.color,
                }}>
                  {results.normalized}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: results.tier.color }}>
                    {results.tier.tier}
                  </div>
                  <div style={{ fontSize: 13, color: "#737373" }}>Fragility Score out of 100</div>
                </div>
              </div>
              <div style={{
                height: 6, background: "#262626", width: "100%", marginBottom: 16,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${results.normalized}%`,
                  background: "linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444)",
                }} />
              </div>
              <p style={{ fontSize: 15, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>
                {results.tier.desc}
              </p>
            </div>

            <div style={{
              background: results.tier.bg, border: `1px solid ${results.tier.color}30`,
              padding: 32, marginBottom: 24,
            }}>
              <div style={{ fontSize: 14, color: "#a3a3a3", marginBottom: 8, fontWeight: 500 }}>
                Estimated Monthly Revenue at Risk
              </div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 700, color: results.tier.color, marginBottom: 12,
              }}>
                ${results.estimatedLoss.toLocaleString()}/mo
              </div>
              <div style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
                That's roughly ${(results.estimatedLoss * 12).toLocaleString()}/year in revenue leaking through operational gaps. Based on your answers and company size.
              </div>
            </div>

            {results.criticalCount > 0 && (
              <div style={{
                background: "#161616", border: "1px solid #262626",
                padding: 24, marginBottom: 24,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2,
                  color: "#ef4444", textTransform: "uppercase", marginBottom: 16,
                }}>
                  {results.criticalCount} Critical Vulnerabilit{results.criticalCount === 1 ? "y" : "ies"} Found
                </div>
                <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>
                  These are areas where a single disruption (someone out sick, quitting, or overwhelmed) could directly impact revenue or customer experience within 24 hours.
                </p>
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
                color: "#f97316", textTransform: "uppercase", marginBottom: 20,
              }}>
                What To Fix First
              </div>

              {results.weakAreas.slice(0, 3).map((areaId, i) => (
                <div key={areaId} style={{
                  background: "#161616", border: "1px solid #262626",
                  padding: 24, marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 12,
                      color: "#f97316", fontWeight: 700,
                    }}>
                      0{i + 1}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                      {recommendations[areaId]?.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.7, margin: 0 }}>
                    {recommendations[areaId]?.rec}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              background: "#161616", border: "1px solid #f97316",
              padding: 32, textAlign: "center",
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 12px 0" }}>
                Want help fixing this?
              </h3>
              <p style={{ fontSize: 15, color: "#a3a3a3", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                I help home services companies automate the exact gaps this audit identified. No fluff. Just systems that work when your people can't.
              </p>
              <p style={{
                fontFamily: "'Space Mono', monospace", fontSize: 13,
                color: "#f97316", letterSpacing: 1,
              }}>
                DM me on LinkedIn or reply to the email with your results.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

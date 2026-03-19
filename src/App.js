import { useState, useRef } from "react";

const LOGO_SRC = "/logo.png";

const WEBHOOK_URL = "https://YOUR_N8N_DOMAIN/webhook/audit-submission";

const questions = [
  {
    id: "phone_coverage",
    category: "Phone Coverage",
    question: "When your office person is unavailable, what happens to incoming calls?",
    options: [
      { text: "They go to voicemail or get missed entirely", score: 10, flag: "critical" },
      { text: "Someone else picks up but can't schedule or quote", score: 7, flag: "moderate" },
      { text: "Calls forward to me, but I'm usually on a job site", score: 8, flag: "critical" },
      { text: "Another team member picks up and can schedule/answer questions", score: 4, flag: "moderate" },
      { text: "We have a system (AI, answering service, or auto-routing) that handles it", score: 1, flag: "low" },
    ],
  },
  {
    id: "scheduling",
    category: "Scheduling & Booking",
    question: "How do jobs get scheduled and confirmed?",
    options: [
      { text: "One person does it manually from memory, a notebook, or a spreadsheet", score: 10, flag: "critical" },
      { text: "We use software, but only one person knows how to run it", score: 7, flag: "moderate" },
      { text: "We use software and a few people can access it", score: 4, flag: "moderate" },
      { text: "Customers can self-book online by picking a day and time", score: 2, flag: "low" },
      { text: "Fully automated: online booking, auto-confirmations, and reminders", score: 1, flag: "low" },
    ],
  },
  {
    id: "estimates",
    category: "Estimates & Quotes",
    question: "After an estimate is created, what happens next?",
    options: [
      { text: "It sits until someone remembers to send it", score: 10, flag: "critical" },
      { text: "One person follows up manually, usually days later", score: 8, flag: "critical" },
      { text: "It goes out same day, but follow-up is hit or miss", score: 5, flag: "moderate" },
      { text: "Sent same day with at least one follow-up attempt", score: 3, flag: "moderate" },
      { text: "Estimates are sent and followed up on automatically with a sequence", score: 1, flag: "low" },
    ],
  },
  {
    id: "followup",
    category: "Customer Follow-Up",
    question: "After a job is complete, how do you follow up with customers?",
    options: [
      { text: "We don't, honestly", score: 10, flag: "critical" },
      { text: "Sometimes we call or text, depends on who remembers", score: 7, flag: "moderate" },
      { text: "One person handles it, but it's inconsistent", score: 5, flag: "moderate" },
      { text: "We send review requests but no other follow-up", score: 3, flag: "moderate" },
      { text: "Automated sequence: thank you, review request, and periodic check-ins", score: 1, flag: "low" },
    ],
  },
  {
    id: "documentation",
    category: "Process Knowledge",
    question: "If your office manager quit tomorrow, could someone else step in?",
    options: [
      { text: "No way. Everything is in their head", score: 10, flag: "critical" },
      { text: "Partially. Some things are written down, most aren't", score: 7, flag: "moderate" },
      { text: "We have some SOPs but they're outdated or incomplete", score: 5, flag: "moderate" },
      { text: "Most processes are documented, but it would still take weeks to ramp up", score: 3, flag: "moderate" },
      { text: "Yes. Our processes are documented, accessible, and someone else could start this week", score: 1, flag: "low" },
    ],
  },
  {
    id: "after_hours",
    category: "After-Hours Response",
    question: "What happens when a customer calls outside business hours?",
    options: [
      { text: "Voicemail. We call back next morning if we remember", score: 9, flag: "critical" },
      { text: "It rings to my cell and I answer when I can", score: 7, flag: "moderate" },
      { text: "We have an answering service, but they just take messages", score: 5, flag: "moderate" },
      { text: "Customers can book online anytime, but calls still go to voicemail", score: 4, flag: "moderate" },
      { text: "Calls are handled automatically or routed to on-call with full context", score: 1, flag: "low" },
    ],
  },
  {
    id: "data_access",
    category: "Customer Data",
    question: "Where does your customer information live?",
    options: [
      { text: "In someone's phone contacts, a notebook, or random spreadsheets", score: 10, flag: "critical" },
      { text: "In a CRM or software, but only one person updates it", score: 6, flag: "moderate" },
      { text: "In a CRM that the team uses, but data is messy or outdated", score: 4, flag: "moderate" },
      { text: "Centralized system that's mostly up to date, multiple people use it", score: 2, flag: "low" },
      { text: "Single source of truth that auto-updates from calls, bookings, and jobs", score: 1, flag: "low" },
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
    rec: "Set up an AI voice agent or auto-attendant that answers every call, captures info, and books. No more calls hitting voicemail while you're on a job site.",
  },
  scheduling: {
    title: "Scheduling & Booking",
    rec: "Implement online self-booking so customers pick their own time. Pair it with auto-confirmations and reminders. Removes the single-person dependency from your calendar.",
  },
  estimates: {
    title: "Estimates & Quotes",
    rec: "Automate estimate delivery and follow-up sequences. Every unsent estimate is cash on the table. A 2-day delay on follow-up costs you the job more often than you think.",
  },
  followup: {
    title: "Customer Follow-Up",
    rec: "Build an automated post-job sequence: thank you text, review request at 24 hours, maintenance check-in at 30 days. Runs without anyone remembering anything.",
  },
  documentation: {
    title: "Process Knowledge",
    rec: "Record your office manager's workflows this week. Screen recordings, checklists, anything. If it only lives in one brain, it's not a process. It's a risk you carry every day.",
  },
  after_hours: {
    title: "After-Hours Response",
    rec: "Implement AI call handling or smart routing for after-hours. The homeowner calling at 8pm books whoever answers first. That should be you, not your competitor.",
  },
  data_access: {
    title: "Customer Data",
    rec: "Consolidate everything into one CRM that auto-updates from every touchpoint. Notebooks, personal phones, and scattered spreadsheets are where customer relationships go to die.",
  },
};

const riskTiers = [
  { max: 20, tier: "Low Risk", color: "#22c55e", bg: "#052e16", desc: "Your operations have solid redundancy. Keep refining." },
  { max: 40, tier: "Moderate Risk", color: "#eab308", bg: "#422006", desc: "Some gaps that could hurt you on a bad week. Fixable." },
  { max: 60, tier: "High Risk", color: "#f97316", bg: "#431407", desc: "Significant fragility. One sick day away from chaos." },
  { max: 100, tier: "Critical Risk", color: "#ef4444", bg: "#450a0a", desc: "Your business runs on hope and one person's memory. Fix this now." },
];

export default function OperationsFragilityAudit() {
  const [screen, setScreen] = useState("welcome");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [sending, setSending] = useState(false);

  const transition = (callback) => {
    setFadeIn(false);
    setTimeout(() => {
      callback();
      setFadeIn(true);
    }, 250);
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
    }, 350);
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
    setSending(true);
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
      console.log("Webhook pending setup");
    }
    setSending(false);
    setSubmitted(true);
    setScreen("results");
  };

  const results = screen === "results" || screen === "teaser" ? calculateResults() : null;
  const progress = ((currentQ + 1) / questions.length) * 100;

  const inputStyle = {
    background: "#161616",
    border: "1px solid #262626",
    color: "#fff",
    padding: "14px 16px",
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e5e5e5",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
        backgroundSize: "60px 60px", pointerEvents: "none",
      }} />

      {/* Logo - small, top left */}
      <div style={{
        position: "fixed", top: 20, left: 24, zIndex: 10,
        opacity: 0.7,
      }}>
        <img src={LOGO_SRC} alt="Compound Systems" style={{ height: 22 }} />
      </div>

      <div style={{
        maxWidth: 640, margin: "0 auto", padding: "60px 20px 40px",
        position: "relative", zIndex: 1,
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}>

        {/* WELCOME */}
        {screen === "welcome" && (
          <div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
              color: "#f97316", textTransform: "uppercase", marginBottom: 24,
            }}>
              Operations Fragility Audit
            </div>

            <h1 style={{
              fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 700, lineHeight: 1.15,
              color: "#fff", margin: "0 0 20px 0",
            }}>
              How fragile is your business?
            </h1>

            <p style={{ fontSize: 16, lineHeight: 1.7, color: "#a3a3a3", margin: "0 0 12px 0" }}>
              Most home services companies are one sick day away from chaos. They just don't know it yet.
            </p>

            <p style={{ fontSize: 16, lineHeight: 1.7, color: "#a3a3a3", margin: "0 0 32px 0" }}>
              This audit scores your operational fragility, estimates monthly revenue at risk, and shows you exactly where automation fits.
            </p>

            <div style={{
              display: "flex", gap: 24, marginBottom: 40, flexWrap: "wrap",
            }}>
              {[
                { num: "7", label: "Questions" },
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
              fontSize: "clamp(19px, 4vw, 24px)", fontWeight: 700, lineHeight: 1.35,
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
                    padding: "16px 18px",
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
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
              color: "#f97316", textTransform: "uppercase", marginBottom: 24,
            }}>
              Your Results Are Ready
            </div>

            <div style={{
              background: "#161616", border: "1px solid #262626",
              padding: 28, marginBottom: 28,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
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
                height: 4, background: "#262626", width: "100%", marginBottom: 16,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${results.normalized}%`,
                  background: `linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444)`,
                  transition: "width 1s ease",
                }} />
              </div>

              <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>
                {results.tier.desc}
              </p>
            </div>

            {/* Blurred preview */}
            <div style={{ position: "relative", marginBottom: 28 }}>
              <div style={{ filter: "blur(6px)", opacity: 0.4, pointerEvents: "none" }}>
                <div style={{ background: "#161616", padding: 24, marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    Estimated Monthly Revenue at Risk
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 36, color: "#ef4444" }}>
                    ${results.estimatedLoss.toLocaleString()}/mo
                  </div>
                </div>
                <div style={{ background: "#161616", padding: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    Top Recommendations
                  </div>
                  <div style={{ color: "#a3a3a3", fontSize: 13 }}>
                    Based on your answers, here are the highest-impact changes...
                  </div>
                </div>
              </div>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  background: "#0a0a0aee", border: "1px solid #f97316",
                  padding: "14px 22px", textAlign: "center",
                }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#f97316", letterSpacing: 1 }}>
                    ENTER YOUR EMAIL TO UNLOCK FULL RESULTS
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="Your name" value={name}
                onChange={(e) => setName(e.target.value)} style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = "#262626"} />
              <input type="text" placeholder="Company name" value={company}
                onChange={(e) => setCompany(e.target.value)} style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = "#262626"} />
              <input type="email" placeholder="Your email" value={email}
                onChange={(e) => setEmail(e.target.value)} style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = "#262626"} />
              <button
                onClick={handleSubmit}
                disabled={!email || sending}
                style={{
                  background: email ? "#f97316" : "#404040",
                  color: email ? "#0a0a0a" : "#737373",
                  border: "none", padding: "16px 40px", fontSize: 16, fontWeight: 700,
                  cursor: email ? "pointer" : "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s", opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Unlocking..." : "Unlock My Full Results"}
              </button>
              <p style={{ fontSize: 11, color: "#525252", margin: "2px 0 0 0" }}>
                No spam. Just your results and a few tips to fix what's broken.
              </p>
            </div>
          </div>
        )}

        {/* FULL RESULTS */}
        {screen === "results" && results && (
          <div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
              color: "#f97316", textTransform: "uppercase", marginBottom: 24,
            }}>
              Full Audit Results
            </div>

            <div style={{
              background: "#161616", border: "1px solid #262626",
              padding: 28, marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 52, fontWeight: 700,
                  color: results.tier.color,
                }}>
                  {results.normalized}
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: results.tier.color }}>
                    {results.tier.tier}
                  </div>
                  <div style={{ fontSize: 13, color: "#737373" }}>Fragility Score out of 100</div>
                </div>
              </div>
              <div style={{
                height: 4, background: "#262626", width: "100%", marginBottom: 14,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${results.normalized}%`,
                  background: `linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444)`,
                }} />
              </div>
              <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>
                {results.tier.desc}
              </p>
            </div>

            <div style={{
              background: results.tier.bg, border: `1px solid ${results.tier.color}30`,
              padding: 28, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: "#a3a3a3", marginBottom: 6, fontWeight: 500 }}>
                Estimated Monthly Revenue at Risk
              </div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: "clamp(30px, 6vw, 44px)",
                fontWeight: 700, color: results.tier.color, marginBottom: 10,
              }}>
                ${results.estimatedLoss.toLocaleString()}/mo
              </div>
              <div style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
                Roughly ${(results.estimatedLoss * 12).toLocaleString()}/year leaking through operational gaps. Based on your answers and company size.
              </div>
            </div>

            {results.criticalCount > 0 && (
              <div style={{
                background: "#161616", border: "1px solid #262626",
                padding: 22, marginBottom: 20,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2,
                  color: "#ef4444", textTransform: "uppercase", marginBottom: 12,
                }}>
                  {results.criticalCount} Critical Vulnerabilit{results.criticalCount === 1 ? "y" : "ies"} Found
                </div>
                <p style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>
                  These are areas where a single disruption could directly impact revenue or customer experience within 24 hours.
                </p>
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3,
                color: "#f97316", textTransform: "uppercase", marginBottom: 18,
              }}>
                What To Fix First
              </div>

              {results.weakAreas.slice(0, 3).map((areaId, i) => (
                <div key={areaId} style={{
                  background: "#161616", border: "1px solid #262626",
                  padding: 22, marginBottom: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 12,
                      color: "#f97316", fontWeight: 700,
                    }}>
                      0{i + 1}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                      {recommendations[areaId]?.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.7, margin: 0 }}>
                    {recommendations[areaId]?.rec}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              background: "#161616", border: "1px solid #f97316",
              padding: 28, textAlign: "center",
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 10px 0" }}>
                Want help fixing this?
              </h3>
              <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                I help home services companies automate the exact gaps this audit found. No fluff. Just systems that work when your people can't.
              </p>
              <p style={{
                fontFamily: "'Space Mono', monospace", fontSize: 12,
                color: "#f97316", letterSpacing: 1, margin: 0,
              }}>
                DM me on LinkedIn or reply to the email with your results.
              </p>
            </div>

            {/* Footer logo */}
            <div style={{ textAlign: "center", marginTop: 40, opacity: 0.4 }}>
              <img src={LOGO_SRC} alt="Compound Systems" style={{ height: 18 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

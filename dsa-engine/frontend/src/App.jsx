import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import "./App.css";

function App() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeEmail = async () => {
    if (!subject.trim() && !body.trim()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:8080/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: subject,
          body: body
        })
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Could not connect to the Spam API. Make sure the Java API is running.");
    }

    setLoading(false);
  };

  const clearEmail = () => {
    setSubject("");
    setBody("");
    setResult(null);
  };

  const chartData = result
    ? result.keywords.map((keyword) => ({
        keyword: keyword,
        score: 2
      }))
    : [];

  return (
    <div className="app">

      <header className="header">
        <div className="brand">
          <div className="brand-mark"></div>
          <div>
            <strong>EmailGuard</strong>
            <span>Algorithm-based email analysis</span>
          </div>
        </div>
      </header>

      <main className="container">

        <section className="intro">
          <p className="eyebrow">EMAIL SECURITY</p>

          <h1>
            Analyze an email for spam risk.
          </h1>

          <p className="intro-text">
            Enter the subject and message below. The system checks the
            content against known spam patterns and assigns a risk level.
          </p>
        </section>

        <section className="workspace">

          {/* INPUT */}
          <div className="card">

            <div className="card-header">
              <h2>Email content</h2>
              <p>Provide the email you want to analyze.</p>
            </div>

            <label>Subject</label>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />

            <label>Email body</label>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste or type the email message here..."
            />

            <div className="actions">

              <button
                className="primary-button"
                onClick={analyzeEmail}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze Email"}
              </button>

              <button
                className="secondary-button"
                onClick={clearEmail}
              >
                Clear
              </button>

            </div>

          </div>

          {/* RESULT */}
          <div className="card result-card">

            <div className="card-header">
              <h2>Analysis result</h2>
              <p>Detection summary</p>
            </div>

            {!result ? (

              <div className="empty-result">
                <div className="empty-line"></div>

                <h3>Waiting for an email</h3>

                <p>
                  Your analysis result will appear here after you
                  submit an email.
                </p>
              </div>

            ) : (

              <div className="result-content">

                <div
                  className={`classification ${
                    result.classification === "SPAM"
                      ? "spam"
                      : "safe"
                  }`}
                >
                  <span>CLASSIFICATION</span>

                  <strong>
                    {result.classification}
                  </strong>
                </div>

                <div className="stats">

                  <div className="stat-box">
                    <span>SPAM SCORE</span>
                    <strong>{result.score}</strong>
                  </div>

                  <div className="stat-box">
                    <span>RISK LEVEL</span>
                    <strong>{result.risk}</strong>
                  </div>

                </div>

                <div className="keywords">

                  <h3>Detected Keywords</h3>

                  {result.keywords.length === 0 ? (

                    <p className="no-keywords">
                      No suspicious keywords detected.
                    </p>

                  ) : (

                    <div className="keyword-list">
                      {result.keywords.map((keyword, index) => (
                        <span key={index}>
                          {keyword}
                        </span>
                      ))}
                    </div>

                  )}

                </div>

              </div>

            )}

          </div>

        </section>

        {/* COMPARISON GRAPH */}
        {result && result.keywords.length > 0 && (

          <section className="comparison-section">

            <div className="section-heading">
              <p className="eyebrow">PATTERN ANALYSIS</p>

              <h2>Spam keyword comparison</h2>

              <p>
                Each detected spam pattern contributes to the overall
                spam score.
              </p>
            </div>

            <div className="chart-card">

              <ResponsiveContainer width="100%" height={320}>

                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 50
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="keyword"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis
                    allowDecimals={false}
                    label={{
                      value: "Score contribution",
                      angle: -90,
                      position: "insideLeft"
                    }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="score"
                    fill="#175c45"
                    radius={[4, 4, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </section>

        )}

        <footer>
          <p>
            EmailGuard uses pattern matching and fuzzy matching
            algorithms to identify suspicious email content.
          </p>
        </footer>

      </main>

    </div>
  );
}

export default App;
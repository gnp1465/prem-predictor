"use client";

import { useState, useEffect } from "react";

const teamMeta = {
  Arsenal: { color: "#EF0107", logo: "/logos/arsenal.png" },
  "Aston Villa": { color: "#95BFE5", logo: "/logos/aston_villa.png" },
  Bournemouth: { color: "#DA291C", logo: "/logos/bournemouth.png" },
  Brentford: { color: "#E30613", logo: "/logos/brentford.png" },
  Brighton: { color: "#0057B8", logo: "/logos/brighton.png" },
  Burnley: { color: "#6C1D45", logo: "/logos/burnley.png" },
  Chelsea: { color: "#034694", logo: "/logos/chelsea.png" },
  "Crystal Palace": { color: "#1B458F", logo: "/logos/crystal_palace.png" },
  Everton: { color: "#003399", logo: "/logos/everton.png" },
  Fulham: { color: "#111111", logo: "/logos/fulham.png" },
  Ipswich: { color: "#0057B8", logo: "/logos/ipswich.png" },
  Leeds: { color: "#FFCD00", logo: "/logos/leeds_united.png" },
  Leicester: { color: "#003090", logo: "/logos/leicester_city.png" },
  Liverpool: { color: "#C8102E", logo: "/logos/liverpool.png" },
  Luton: { color: "#FF6B00", logo: "/logos/luton.png" },
  "Man City": { color: "#6CABDD", logo: "/logos/man_city.png" },
  "Man United": { color: "#DA291C", logo: "/logos/man_united.png" },
  Newcastle: { color: "#241F20", logo: "/logos/newcastle.png" },
  Norwich: { color: "#00A650", logo: "/logos/norwich_city.png" },
  "Nott'm Forest": { color: "#DD0000", logo: "/logos/nottingham_forest.png" },
  "Sheffield United": {
    color: "#EE2737",
    logo: "/logos/sheffield_united.png",
  },
  Southampton: { color: "#D71920", logo: "/logos/southampton.png" },
  Sunderland: { color: "#E2231A", logo: "/logos/sunderland.png" },
  Tottenham: { color: "#132257", logo: "/logos/tottenham.png" },
  Watford: { color: "#FBEE23", logo: "/logos/watford.png" },
  "West Brom": { color: "#1C2C5B", logo: "/logos/west_brom.png" },
  "West Ham": { color: "#7A263A", logo: "/logos/west_ham.png" },
  Wolves: { color: "#FDB913", logo: "/logos/wolves.png" },
};
const defaultTeamMeta = {
  color: "#6b7280",
  logo: "/logos/default.png",
};

function resolveLogoName(apiName) {
  const mapping = {
    // Spurs & United
    Spurs: "Tottenham",
    "Tottenham Hotspur": "Tottenham",

    "Man Utd": "Man United",
    "Manchester United": "Man United",

    // Manchester City
    "Manchester City": "Man City",
    "Man City": "Man City",

    // West Ham
    "West Ham United": "West Ham",
    "West Ham Utd": "West Ham",

    // Nottingham Forest
    "Nottingham Forest": "Nott'm Forest",
    "Nott'm Forest": "Nott'm Forest",

    // Wolves
    Wolverhampton: "Wolves",
    "Wolverhampton Wanderers": "Wolves",
    Wolves: "Wolves",

    // Newcastle
    "Newcastle United": "Newcastle",
    Newcastle: "Newcastle",

    // Brighton
    "Brighton & Hove Albion": "Brighton",
    Brighton: "Brighton",
  };

  return mapping[apiName] || apiName;
}
function getTeamMeta(apiName) {
  const name = resolveLogoName(apiName);
  return teamMeta[name] || defaultTeamMeta;
}

const API_BASE = "http://localhost:8000";

export default function Home() {
  const [fixtures, setFixtures] = useState([]);
  const [selectedFixtureIndex, setSelectedFixtureIndex] = useState(0);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const res = await fetch(`${API_BASE}/fixtures`);
        const data = await res.json();
        setFixtures(data.fixtures || []);
        setSelectedFixtureIndex(0);
      } catch (err) {
        console.error(err);
        setError("Failed to load fixtures from API.");
      }
    };

    fetchFixtures();
  }, []);

  const currentFixture =
    fixtures.length > 0 ? fixtures[selectedFixtureIndex] : null;

  const handlePredict = async () => {
    setError("");
    setResult(null);

    if (!currentFixture) {
      setError("No fixture selected.");
      return;
    }

    const homeTeam = currentFixture.home;
    const awayTeam = currentFixture.away;

    setLoadingPrediction(true);

    try {
      const params = new URLSearchParams({
        home_team: homeTeam,
        away_team: awayTeam,
      });

      const res = await fetch(`${API_BASE}/predict?` + params.toString());
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "API error");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to get prediction from API.");
    } finally {
      setLoadingPrediction(false);
    }
  };

  const pct = (p) => (p * 100).toFixed(1);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Premier League Match Predictor ⚽</h1>
        <p style={styles.subtitle}>
          Select a real scheduled match and see win / draw / loss probabilities.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.field}>
          <label style={styles.label}>Select Match</label>
          {fixtures.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              Loading fixtures...
            </p>
          ) : (
            <select
              style={styles.select}
              value={selectedFixtureIndex}
              onChange={(e) => setSelectedFixtureIndex(Number(e.target.value))}
            >
              {fixtures.map((f, idx) => (
                <option key={`${f.date}-${f.home}-${f.away}`} value={idx}>
                  {f.home} vs {f.away} — {f.date}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          style={styles.button}
          onClick={handlePredict}
          disabled={loadingPrediction || fixtures.length === 0}
        >
          {loadingPrediction ? "Calculating..." : "Predict Match Outcome"}
        </button>

        {result && (
          <div style={styles.resultBox}>
            <div style={styles.teamsRow}>
              <div style={styles.teamBlock}>
                {(() => {
                  const meta = getTeamMeta(result.home);
                  return (
                    <>
                      <img
                        src={meta.logo}
                        alt={result.home}
                        style={styles.logo}
                      />
                      <div style={styles.teamName}>{result.home}</div>
                    </>
                  );
                })()}
              </div>

              <div style={styles.vs}>vs</div>

              <div style={styles.teamBlock}>
                {(() => {
                  const meta = getTeamMeta(result.away);
                  return (
                    <>
                      <img
                        src={meta.logo}
                        alt={result.away}
                        style={styles.logo}
                      />
                      <div style={styles.teamName}>{result.away}</div>
                    </>
                  );
                })()}
              </div>
            </div>

            {(() => {
              const homeMeta = getTeamMeta(result.home);
              const awayMeta = getTeamMeta(result.away);
              const homePct = pct(result.home_win);
              const drawPct = pct(result.draw);
              const awayPct = pct(result.away_win);

              return (
                <div style={styles.barWrapper}>
                  <div style={styles.barLabelsTop}>
                    <span>Home {homePct}%</span>
                    <span>Draw {drawPct}%</span>
                    <span>{awayPct}% Away</span>
                  </div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barSegment,
                        width: homePct + "%",
                        backgroundColor: homeMeta.color,
                      }}
                    />
                    <div
                      style={{
                        ...styles.barSegment,
                        width: drawPct + "%",
                        backgroundColor: "#9ca3af",
                      }}
                    />
                    <div
                      style={{
                        ...styles.barSegment,
                        width: awayPct + "%",
                        backgroundColor: awayMeta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            <div style={styles.barLabelsBottom}>
              <span>
                {result.home} win: <strong>{pct(result.home_win)}%</strong>
              </span>
              <span>
                Draw: <strong>{pct(result.draw)}%</strong>
              </span>
              <span>
                {result.away} win: <strong>{pct(result.away_win)}%</strong>
              </span>
            </div>

            <p style={styles.caption}>
              Total:{" "}
              {(
                (result.home_win + result.draw + result.away_win) *
                100
              ).toFixed(1)}
              %
            </p>

            {/* Most likely scoreline */}
            {result.scoreline && (
              <div style={styles.scorelineBox}>
                <p style={styles.scorelineText}>
                  Most likely score:&nbsp;
                  <strong>{result.scoreline}</strong>
                  &nbsp;(
                  {pct(result.scoreline_prob ?? 0)}
                  %)
                </p>
              </div>
            )}

            {/* Recent form badges */}
            <div style={styles.formRow}>
              <div style={styles.formBlock}>
                <div style={styles.formLabel}>{result.home} form</div>
                <div style={styles.formBadges}>
                  {(result.home_form || []).map((r, idx) => (
                    <span
                      key={idx}
                      style={{
                        ...styles.formBadge,
                        backgroundColor:
                          r === "W"
                            ? "#16a34a"
                            : r === "D"
                            ? "#6b7280"
                            : "#dc2626",
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div style={styles.formBlock}>
                <div style={styles.formLabel}>{result.away} form</div>
                <div style={styles.formBadges}>
                  {(result.away_form || []).map((r, idx) => (
                    <span
                      key={idx}
                      style={{
                        ...styles.formBadge,
                        backgroundColor:
                          r === "W"
                            ? "#16a34a"
                            : r === "D"
                            ? "#6b7280"
                            : "#dc2626",
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#020617",
    color: "#f9fafb",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    maxWidth: "640px",
    width: "95%",
    background: "#020617",
    borderRadius: "16px",
    padding: "24px 28px",
    border: "1px solid #1f2937",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginBottom: "20px",
  },
  field: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "4px",
    fontSize: "0.85rem",
    color: "#e5e7eb",
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#f9fafb",
    outline: "none",
  },
  button: {
    marginTop: "4px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  resultBox: {
    marginTop: "20px",
    padding: "14px",
    borderRadius: "12px",
    background: "#020617",
    border: "1px solid #1f2937",
  },
  error: {
    color: "#f97373",
    marginBottom: "8px",
  },
  teamsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  teamBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    width: "40%",
  },
  logo: {
    width: "56px",
    height: "56px",
    objectFit: "contain",
  },
  teamName: {
    fontWeight: 600,
    fontSize: "0.95rem",
    textAlign: "center",
  },
  vs: {
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#9ca3af",
  },
  barWrapper: {
    marginTop: "4px",
  },
  barLabelsTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    fontSize: "0.75rem",
    color: "#d1d5db",
  },
  barTrack: {
    display: "flex",
    height: "16px",
    borderRadius: "999px",
    overflow: "hidden",
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
  },
  barSegment: {
    height: "100%",
    transition: "width 0.6s ease",
  },
  barLabelsBottom: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  caption: {
    marginTop: "8px",
    fontSize: "0.8rem",
    color: "#9ca3af",
  },
  scorelineBox: {
    marginTop: "10px",
    padding: "8px 10px",
    borderRadius: "8px",
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
  },
  scorelineText: {
    fontSize: "0.85rem",
    color: "#e5e7eb",
  },
  formRow: {
    marginTop: "14px",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  formBlock: {
    flex: 1,
    minWidth: "140px",
  },
  formLabel: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginBottom: "4px",
    fontWeight: 600,
  },
  formBadges: {
    display: "flex",
    gap: "4px",
  },
  formBadge: {
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#f9fafb",
  },
};
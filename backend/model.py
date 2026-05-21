import pandas as pd
import glob
import math
import os

BASE_DIR = os.path.dirname(__file__)
files = glob.glob(os.path.join(BASE_DIR, "[0-9][0-9].csv"))

print("Files found:", files)

# weights for each season's data
weights_by_file = {
    "21.csv": 0.6,  
    "22.csv": 0.8,
    "23.csv": 1.0,
    "24.csv": 1.2,
    "25.csv": 1.5,  
}

dfs = []

for file in files:
    fname = os.path.basename(file)
    df = pd.read_csv(file)

    #  Weight of season depedning on how recent 
    weight = weights_by_file.get(fname, 1.0)
    df["weight"] = weight

    dfs.append(df)

all_matches = pd.concat(dfs, ignore_index=True)

def weighted_mean(series, weights):
    if len(series) == 0:
        return 0.0
    return (series * weights).sum() / weights.sum()

print(all_matches.head())
print(all_matches.sample(10))

# sorts by date and changes it from europen format to normal 
all_matches["Date"] = pd.to_datetime(
    all_matches["Date"],
    dayfirst=True,
    errors="coerce",
)
all_matches = all_matches.sort_values("Date")



# Calculate average goals
avg_home = weighted_mean(all_matches["FTHG"], all_matches["weight"])
avg_away = weighted_mean(all_matches["FTAG"], all_matches["weight"])

print(f"Average Home Goals: {avg_home}")
print(f"Average Away Goals: {avg_away}")

teams = sorted(all_matches['HomeTeam'].unique()) 
print("Teams found:", teams)

attack_home = {}
attack_away = {}
defense_home = {}
defense_away = {}

team_avg_home_scored = {}
team_avg_away_scored = {}
team_avg_home_conceded = {}
team_avg_away_conceded = {}

for team in teams:
    home_matches = all_matches[all_matches["HomeTeam"] == team]
    away_matches = all_matches[all_matches["AwayTeam"] == team]

    # Weighted goals scored
    goals_scored_home = weighted_mean(home_matches["FTHG"], home_matches["weight"])
    goals_scored_away = weighted_mean(away_matches["FTAG"], away_matches["weight"])

    # Weighted goals conceded
    goals_conceded_home = weighted_mean(home_matches["FTAG"], home_matches["weight"])
    goals_conceded_away = weighted_mean(away_matches["FTHG"], away_matches["weight"])

    # Store raw long-term averages for form
    team_avg_home_scored[team] = goals_scored_home
    team_avg_away_scored[team] = goals_scored_away
    team_avg_home_conceded[team] = goals_conceded_home
    team_avg_away_conceded[team] = goals_conceded_away

    # Build HOME / AWAY specific strengths
    attack_home[team] = goals_scored_home / avg_home if avg_home > 0 else 1.0
    attack_away[team] = goals_scored_away / avg_away if avg_away > 0 else 1.0
    defense_home[team] = goals_conceded_home / avg_away if avg_away > 0 else 1.0
    defense_away[team] = goals_conceded_away / avg_home if avg_home > 0 else 1.0

# --- RECENT FORM FACTORS (HOME + AWAY SEPARATE) ---
RECENT_HOME_N = 5
RECENT_AWAY_N = 5

form_attack_home = {}
form_attack_away = {}
form_defense_home = {}
form_defense_away = {}

def clamp(val, low=0.7, high=1.3):
    return max(low, min(high, val))

for team in teams:
    home_matches = all_matches[all_matches["HomeTeam"] == team].sort_values("Date")
    away_matches = all_matches[all_matches["AwayTeam"] == team].sort_values("Date")

    recent_home = home_matches.tail(RECENT_HOME_N)
    recent_away = away_matches.tail(RECENT_AWAY_N)

    # Default to neutral
    form_attack_home[team] = 1.0
    form_attack_away[team] = 1.0
    form_defense_home[team] = 1.0
    form_defense_away[team] = 1.0

    # HOME FORM
    if len(recent_home) > 0 and team_avg_home_scored.get(team, 0) > 0:
        recent_home_scored = recent_home["FTHG"].mean()
        factor = recent_home_scored / team_avg_home_scored[team]
        form_attack_home[team] = clamp(factor)

    if len(recent_home) > 0 and team_avg_home_conceded.get(team, 0) > 0:
        recent_home_conceded = recent_home["FTAG"].mean()
        factor = recent_home_conceded / team_avg_home_conceded[team]
        form_defense_home[team] = clamp(factor)

    # AWAY FORM
    if len(recent_away) > 0 and team_avg_away_scored.get(team, 0) > 0:
        recent_away_scored = recent_away["FTAG"].mean()
        factor = recent_away_scored / team_avg_away_scored[team]
        form_attack_away[team] = clamp(factor)

    if len(recent_away) > 0 and team_avg_away_conceded.get(team, 0) > 0:
        recent_away_conceded = recent_away["FTHG"].mean()
        factor = recent_away_conceded / team_avg_away_conceded[team]
        form_defense_away[team] = clamp(factor)

def expected_goals(home_team, away_team, use_form=True):
    # base expected goals from long-term strengths (HOME vs AWAY specific)
    exp_home = attack_home[home_team] * defense_away[away_team] * avg_home
    exp_away = attack_away[away_team] * defense_home[home_team] * avg_away

    if use_form:
        home_att = form_attack_home.get(home_team, 1.0)
        home_def = form_defense_home.get(home_team, 1.0)
        away_att = form_attack_away.get(away_team, 1.0)
        away_def = form_defense_away.get(away_team, 1.0)

        # Home goals boosted by HOME attack + AWAY defense
        exp_home *= home_att * away_def

        # Away goals boosted by AWAY attack + HOME defense
        exp_away *= away_att * home_def

    return exp_home, exp_away


def poisson_prob(k, lam): # Poisson probability function
     return (math.exp(-lam) * (lam ** k)) / math.factorial(k)

def predict_outcome(home_team, away_team, use_form=True):
    exp_home, exp_away = expected_goals(home_team, away_team, use_form=use_form)

    max_goals = 10
    home_win_prob = 0.0
    away_win_prob = 0.0
    draw_prob = 0.0

    best_prob = -1.0
    best_score = (0, 0)

    for home_goals in range(max_goals):
        for away_goals in range(max_goals):
            prob = poisson_prob(home_goals, exp_home) * poisson_prob(
                away_goals, exp_away
            )

            # track win/draw probabilities
            if home_goals > away_goals:
                home_win_prob += prob
            elif away_goals > home_goals:
                away_win_prob += prob
            else:
                draw_prob += prob

            # track most likely exact scoreline
            if prob > best_prob:
                best_prob = prob
                best_score = (home_goals, away_goals)

    return home_win_prob, draw_prob, away_win_prob, best_score, best_prob

def last_results(team, n=5):
    """
    Return last n results for a team as a list like ['W','D','L',...],
    ordered from oldest -> most recent.
    """
    team_matches = all_matches[
        (all_matches["HomeTeam"] == team) | (all_matches["AwayTeam"] == team)
    ].sort_values("Date")

    recent = team_matches.tail(n)
    results = []

    for _, row in recent.iterrows():
        if row["HomeTeam"] == team:
            gf = row["FTHG"]
            ga = row["FTAG"]
        else:
            gf = row["FTAG"]
            ga = row["FTHG"]

        if gf > ga:
            results.append("W")
        elif gf == ga:
            results.append("D")
        else:
            results.append("L")

    return results

#test run
if __name__ == "__main__":
    home = "Arsenal"
    away = "Man United"

    # Without form
    h0, d0, a0, score0, p0 = predict_outcome(home, away, use_form=False)
    print(f"Home: {home} vs Away: {away}")
    print("NO FORM:")
    print(f"Home: {h0:.2%}, Draw: {d0:.2%}, Away: {a0:.2%}")
    print(f"Most likely score (no form): {score0[0]}-{score0[1]} ({p0:.2%})")

    # With form
    h1, d1, a1, score1, p1 = predict_outcome(home, away, use_form=True)
    print("WITH FORM:")
    print(f"Home: {h1:.2%}, Draw: {d1:.2%}, Away: {a1:.2%}")
    print(f"Most likely score (with form): {score1[0]}-{score1[1]} ({p1:.2%})")

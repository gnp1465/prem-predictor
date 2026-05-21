from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from model import teams, predict_outcome, last_results


BASE_DIR = os.path.dirname(__file__)
fixtures_path = os.path.join(BASE_DIR, "fixtures.csv")
app = FastAPI()

# Frontend on localhost to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/fixtures")
def get_fixtures():
    try:
        df = pd.read_csv(fixtures_path)
        fixtures = df.to_dict(orient="records")
        return {"fixtures": fixtures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/teams")
def get_teams():
    """
    Return the list of valid team names from the model.
    """
    return {"teams": teams}

@app.get("/predict")
def get_prediction(home_team: str, away_team: str):
    print("Predict called with:", home_team, "vs", away_team)

    if home_team not in teams or away_team not in teams:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown team name. Pick from /teams."
        )

    home_p, draw_p, away_p, best_score, best_prob = predict_outcome(home_team, away_team)

    # Most likely scoreline
    home_goals, away_goals = best_score

    # Recent form
    home_form = last_results(home_team, n=5)
    away_form = last_results(away_team, n=5)

    return {
        "home": home_team,
        "away": away_team,
        "home_win": home_p,
        "draw": draw_p,
        "away_win": away_p,
        "scoreline": f"{home_goals}-{away_goals}",
        "scoreline_prob": best_prob,
        "home_form": home_form,
        "away_form": away_form,
    }
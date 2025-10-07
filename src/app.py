"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from typing import Optional
import os
import re
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Email validation pattern
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@mergington\.edu$')

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities(search: Optional[str] = Query(None, description="Search activities by name or description")):
    """Get all activities with optional search filter"""
    if search:
        search_lower = search.lower()
        filtered_activities = {
            name: details for name, details in activities.items()
            if search_lower in name.lower() or search_lower in details["description"].lower()
        }
        return filtered_activities
    return activities


@app.get("/activities/{activity_name}/participants")
def get_activity_participants(activity_name: str):
    """Get list of participants for a specific activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return {
        "activity": activity_name,
        "participants": activities[activity_name]["participants"],
        "count": len(activities[activity_name]["participants"]),
        "max_participants": activities[activity_name]["max_participants"]
    }


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    # Validate inputs
    if not activity_name or not activity_name.strip():
        raise HTTPException(status_code=400, detail="Activity name is required")
    
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Normalize inputs
    email = email.strip().lower()
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Validate email format
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="Invalid email. Must be a @mergington.edu email address")

    # Get the specific activity
    activity = activities[activity_name]

    # Check if already signed up
    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Already signed up for this activity")

    # Check if activity is full
    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(status_code=400, detail="Activity is full")

    # Add student
    activity["participants"].append(email)
    return {
        "message": f"Successfully signed up {email} for {activity_name}",
        "spots_left": activity["max_participants"] - len(activity["participants"])
    }


@app.delete("/activities/{activity_name}/signup")
def unsign_from_activity(activity_name: str, email: str):
    """Remove a student from an activity"""
    # Validate inputs
    if not activity_name or not activity_name.strip():
        raise HTTPException(status_code=400, detail="Activity name is required")
    
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Normalize inputs
    email = email.strip().lower()
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Check if signed up
    if email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Not signed up for this activity")

    # Remove student
    activity["participants"].remove(email)
    return {
        "message": f"Successfully removed {email} from {activity_name}",
        "spots_left": activity["max_participants"] - len(activity["participants"])
    }


document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search");
  let searchTimeout;
  let currentActivities = {};

  // Debounced search function
  function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchActivities(searchInput.value);
    }, 300);
  }

  // Function to fetch activities from API
  async function fetchActivities(searchQuery = "") {
    try {
      const url = searchQuery 
        ? `/activities?search=${encodeURIComponent(searchQuery)}`
        : "/activities";
      
      const response = await fetch(url);
      
      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const activities = await response.json();
      currentActivities = activities;

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Check if no activities found
      if (Object.keys(activities).length === 0) {
        activitiesList.innerHTML = "<p>No activities found matching your search.</p>";
        return;
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const isFull = spotsLeft === 0;

        // Create elements safely to prevent XSS
        const h4 = document.createElement("h4");
        h4.textContent = name;
        
        const descP = document.createElement("p");
        descP.textContent = details.description;
        
        const scheduleP = document.createElement("p");
        scheduleP.innerHTML = `<strong>Schedule:</strong> `;
        scheduleP.appendChild(document.createTextNode(details.schedule));
        
        const availP = document.createElement("p");
        availP.innerHTML = `<strong>Availability:</strong> `;
        availP.appendChild(document.createTextNode(`${spotsLeft} spots left ${isFull ? '(FULL)' : ''}`));
        
        const viewBtn = document.createElement("button");
        viewBtn.className = "view-participants-btn";
        viewBtn.textContent = "View Participants";
        viewBtn.dataset.activity = name;
        viewBtn.addEventListener("click", () => viewParticipants(name));

        activityCard.appendChild(h4);
        activityCard.appendChild(descP);
        activityCard.appendChild(scheduleP);
        activityCard.appendChild(availP);
        activityCard.appendChild(viewBtn);

        if (isFull) {
          activityCard.classList.add("full");
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown (only if not full)
        if (!isFull) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          activitySelect.appendChild(option);
        }
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to view participants
  async function viewParticipants(activityName) {
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}/participants`);
      
      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Create participant list safely to prevent XSS
      messageDiv.innerHTML = "";
      
      const h4 = document.createElement("h4");
      h4.textContent = `Participants for ${data.activity}`;
      
      const countP = document.createElement("p");
      countP.textContent = `${data.count} / ${data.max_participants} spots filled`;
      
      const ul = document.createElement("ul");
      ul.className = "participants-list";
      
      if (data.participants.length > 0) {
        data.participants.forEach(email => {
          const li = document.createElement("li");
          li.textContent = email;
          ul.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No participants yet";
        ul.appendChild(li);
      }
      
      messageDiv.appendChild(h4);
      messageDiv.appendChild(countP);
      messageDiv.appendChild(ul);
      messageDiv.className = "info";
      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 10000);
    } catch (error) {
      messageDiv.textContent = "Failed to load participants.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error fetching participants:", error);
    }
  }

  // Helper function to show messages
  function showMessage(text, type = "info", duration = 5000) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, duration);
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;

    // Validate activity selection
    if (!activity) {
      showMessage("Please select an activity", "error");
      return;
    }

    // Basic email validation
    if (!email.endsWith("@mergington.edu")) {
      showMessage("Email must be a @mergington.edu address", "error");
      return;
    }

    // Disable submit button to prevent double submission
    const submitBtn = signupForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up...";

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh activities to show updated spots
        await fetchActivities(searchInput ? searchInput.value : "");
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    }
  });

  // Add search input listener
  if (searchInput) {
    searchInput.addEventListener("input", debounceSearch);
  }

  // Initialize app
  fetchActivities();
});

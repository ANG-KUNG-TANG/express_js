import { requireGuest } from "../../core/router.js";
import { apiFetch } from "../../core/api.js";
import { toast } from "../../core/toast.js";

requireGuest();

const form = document.getElementById("register-form");
const errorEl = document.getElementById("reg-alert");
const submitBtn = form.querySelector("button");

function showError(message) {
  errorEl.style.display = "block";
  errorEl.textContent = message;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorEl.style.display = "none";
  errorEl.textContent = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm-password").value;

  if (!name || !email || !password) {
    showError("All fields are required.");
    return;
  }

  if (password.length < 8) {
    showError("Password must be at least 8 characters.");
    return;
  }

  if (password !== confirm) {
    showError("Passwords do not match.");
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    await apiFetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    toast("Account created successfully. Please log in.");
    window.location.href = "/pages/auth/login.html";

  } catch (err) {
    showError(err?.message || "Registration failed.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});
import { requireGuest } from "../../core/router.js";
import { apiFetch }     from "../../core/api.js";
import { toast }        from "../../core/toast.js";

requireGuest();

const form      = document.getElementById("register-form");
const errorEl   = document.getElementById("reg-alert");
const submitBtn = form.querySelector("button");

function showError(message) {
    errorEl.style.display = "block";
    errorEl.textContent   = message;
}

function clearError() {
    errorEl.style.display = "none";
    errorEl.textContent   = "";
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const name     = document.getElementById("name").value.trim();
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm  = document.getElementById("confirm-password").value;

    // ── Client-side validation ────────────────────────────────────────────────
    if (!name || !email || !password) {
        showError("All fields are required.");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("Please enter a valid email address.");
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

    // ── Submit ────────────────────────────────────────────────────────────────
    try {
        submitBtn.disabled    = true;
        submitBtn.textContent = "Creating account...";

        // FIX: /api/users requires admin auth (401).
        // Public self-registration goes to /api/auth/register instead.
        await apiFetch("/api/auth/register", {
            method: "POST",
            body:   JSON.stringify({ name, email, password }),
        });

        toast("Account created successfully. Please log in.");
        window.location.href = "/pages/auth/login.html";

    } catch (err) {
        // Show the server's message if available (e.g. "Email already in use")
        showError(err?.message || "Registration failed. Please try again.");
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = "Create Account";
    }
});
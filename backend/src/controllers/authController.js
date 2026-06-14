const authService = require("../services/authService");

// Simple email validation helper
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required and must be a non-empty string." });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password is required and must be at least 6 characters long." });
  }

  try {
    const user = await authService.registerUser(name, email, password);
    return res.status(201).json(user);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Register Controller Error:", error);
    return res.status(500).json({ error: "Failed to register user." });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "Email is required." });
  }
  if (!password || typeof password !== "string" || password.trim() === "") {
    return res.status(400).json({ error: "Password is required." });
  }

  try {
    const result = await authService.loginUser(email, password);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Login Controller Error:", error);
    return res.status(500).json({ error: "Failed to log in user." });
  }
}

module.exports = {
  register,
  login,
};

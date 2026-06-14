const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Registers a new user, hashing the password and storing user info.
 */
async function registerUser(name, email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already registered
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1",
    [normalizedEmail]
  );
  if (existingUser.rows.length > 0) {
    throw { status: 400, message: "User with this email already exists." };
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Insert user
  const insertRes = await pool.query(
    `INSERT INTO users (name, email, password_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, name, email, created_at`,
    [name.trim(), normalizedEmail, passwordHash]
  );

  return insertRes.rows[0];
}

/**
 * Log in a user, validating credentials and returning a signed JWT.
 */
async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // Fetch user
  const res = await pool.query(
    "SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = $1",
    [normalizedEmail]
  );
  if (res.rows.length === 0) {
    throw { status: 401, message: "Invalid email or password." };
  }

  const user = res.rows[0];

  // Compare password hash
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw { status: 401, message: "Invalid email or password." };
  }

  // Sign token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
};

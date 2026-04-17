const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getCache, setCache } = require("./cache");

const JWT_SECRET = process.env.JWT_SECRET || "devdna-secret-change-in-prod";
const JWT_EXPIRES = "7d";

// In-memory user store (replace with DB in production)
const users = new Map();

async function register(email, password) {
  if (users.has(email)) throw new Error("User already exists");
  const hash = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email, password: hash, createdAt: new Date() };
  users.set(email, user);
  return { id: user.id, email: user.email };
}

async function login(email, password) {
  const user = users.get(email);
  if (!user) throw new Error("Invalid credentials");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Invalid credentials");
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { token, user: { id: user.id, email: user.email } };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { register, login, authMiddleware };

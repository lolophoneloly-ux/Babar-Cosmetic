/**
 * Babar Cosmetics — Backend Server
 * Pure Node.js (no external dependencies, no "npm install" required)
 *
 * Run with:  node server.js
 * Then open: http://localhost:3000
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");

const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// In-memory session store: token -> { userId, email, createdAt }
// (Kept simple on purpose — good enough for a small site. Sessions reset
// if the server restarts/redeploys.)
const sessions = new Map();
const SESSION_COOKIE = "bc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// ---------- helpers ----------

function readJSON(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function sendJSON(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    const MAX = 1e6; // 1MB safety cap
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isValidPassword(pw) {
  return typeof pw === "string" && pw.length >= 6;
}

// ---------- cookies ----------

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

// ---------- password hashing (built-in crypto, no external deps) ----------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, email: user.email, createdAt: Date.now() });
  return token;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token || !sessions.has(token)) return null;
  const session = sessions.get(token);
  const users = readJSON(USERS_FILE, []);
  const user = users.find((u) => u.id === session.userId);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

// ---------- static file serving ----------

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  // Prevent path traversal outside /public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(path.join(PUBLIC_DIR, "404.html"), (err2, content404) => {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          res.end(content404 || "404 Not Found");
        });
      } else {
        res.writeHead(500);
        res.end("Server error");
      }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

// ---------- API routes ----------

async function handleApi(req, res, pathname) {
  // GET /api/products
  if (pathname === "/api/products" && req.method === "GET") {
    const products = readJSON(PRODUCTS_FILE, []);
    return sendJSON(res, 200, { success: true, products });
  }

  // POST /api/contact  { name, email, message }
  if (pathname === "/api/contact" && req.method === "POST") {
    try {
      const body = await collectBody(req);
      const { name, email, message } = JSON.parse(body || "{}");

      if (!name || !email || !message) {
        return sendJSON(res, 400, { success: false, error: "Naam, email aur message zaroori hain." });
      }
      if (!isValidEmail(email)) {
        return sendJSON(res, 400, { success: false, error: "Sahi email address likhein." });
      }

      const contacts = readJSON(CONTACTS_FILE, []);
      contacts.push({
        id: "c_" + Date.now(),
        name: escapeHTML(name).slice(0, 200),
        email: escapeHTML(email).slice(0, 200),
        message: escapeHTML(message).slice(0, 2000),
        receivedAt: new Date().toISOString(),
      });
      writeJSON(CONTACTS_FILE, contacts);

      return sendJSON(res, 200, { success: true, message: "Shukriya! Hum jald aap se rabta karenge." });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: "Invalid request." });
    }
  }

  // POST /api/newsletter  { email }
  if (pathname === "/api/newsletter" && req.method === "POST") {
    try {
      const body = await collectBody(req);
      const { email } = JSON.parse(body || "{}");

      if (!isValidEmail(email)) {
        return sendJSON(res, 400, { success: false, error: "Sahi email address likhein." });
      }

      const subscribers = readJSON(SUBSCRIBERS_FILE, []);
      if (subscribers.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
        return sendJSON(res, 200, { success: true, message: "Aap pehle se subscribe hain." });
      }
      subscribers.push({ email: escapeHTML(email), subscribedAt: new Date().toISOString() });
      writeJSON(SUBSCRIBERS_FILE, subscribers);

      return sendJSON(res, 200, { success: true, message: "Subscribe ho gaya — shukriya!" });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: "Invalid request." });
    }
  }

  // POST /api/auth/signup  { name, email, password }
  if (pathname === "/api/auth/signup" && req.method === "POST") {
    try {
      const body = await collectBody(req);
      const { name, email, password } = JSON.parse(body || "{}");

      if (!name || !email || !password) {
        return sendJSON(res, 400, { success: false, error: "Naam, email aur password zaroori hain." });
      }
      if (!isValidEmail(email)) {
        return sendJSON(res, 400, { success: false, error: "Sahi email address likhein." });
      }
      if (!isValidPassword(password)) {
        return sendJSON(res, 400, { success: false, error: "Password kam az kam 6 characters ka ho." });
      }

      const users = readJSON(USERS_FILE, []);
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return sendJSON(res, 409, { success: false, error: "Is email se pehle hi account bana hua hai. Login karein." });
      }

      const newUser = {
        id: "u_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
        name: escapeHTML(name).slice(0, 100),
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      writeJSON(USERS_FILE, users);

      const token = createSession(newUser);
      setSessionCookie(res, token);

      return sendJSON(res, 200, {
        success: true,
        message: "Account ban gaya! Khush amdeed, " + newUser.name + ".",
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
      });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: "Invalid request." });
    }
  }

  // POST /api/auth/login  { email, password }
  if (pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await collectBody(req);
      const { email, password } = JSON.parse(body || "{}");

      if (!email || !password) {
        return sendJSON(res, 400, { success: false, error: "Email aur password zaroori hain." });
      }

      const users = readJSON(USERS_FILE, []);
      const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendJSON(res, 401, { success: false, error: "Email ya password ghalat hai." });
      }

      const token = createSession(user);
      setSessionCookie(res, token);

      return sendJSON(res, 200, {
        success: true,
        message: "Khush amdeed wapas, " + user.name + "!",
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: "Invalid request." });
    }
  }

  // POST /api/auth/logout
  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE];
    if (token) sessions.delete(token);
    clearSessionCookie(res);
    return sendJSON(res, 200, { success: true, message: "Logout ho gaye." });
  }

  // GET /api/auth/me
  if (pathname === "/api/auth/me" && req.method === "GET") {
    const user = getSessionUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: "Not logged in." });
    return sendJSON(res, 200, { success: true, user });
  }

  sendJSON(res, 404, { success: false, error: "Route not found." });
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res, pathname);
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n  Babar Cosmetics server chal raha hai`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
});

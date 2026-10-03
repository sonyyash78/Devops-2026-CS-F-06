const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// Hardcoded valid user credentials
const VALID_CREDENTIALS = {
  email: "ujala@gmail.com",
  password: "ujala@123",
};

const LOG_FILE = path.join(__dirname, "log.json");

function saveLog(entry) {
  try {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE, "utf8");
      if (raw.trim()) {
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) {
          logs = [];
        }
      }
    }
    logs.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    console.error(`Failed to save log to ${LOG_FILE}:`, err);
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const contentTypeMap = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypeMap[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);

  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/login") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { email, password } = data;
        const timestamp = new Date().toISOString();

        // 1. Validation: Required fields check
        if (!email || !password) {
          saveLog({
            email: email || "",
            password: password || "",
            status: "failed",
            message: "Both email and password are required.",
            timestamp,
            loggedAt: timestamp,
          });
          return sendJson(res, 400, {
            success: false,
            message: "Both email and password are required.",
          });
        }

        // 2. Validation: Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          saveLog({
            email,
            password,
            status: "failed",
            message: "Invalid email address format.",
            timestamp,
            loggedAt: timestamp,
          });
          return sendJson(res, 400, {
            success: false,
            message: "Invalid email address format.",
          });
        }

        // 3. Validation: Password length check
        if (password.length < 6) {
          saveLog({
            email,
            password,
            status: "failed",
            message: "Password must be at least 6 characters long.",
            timestamp,
            loggedAt: timestamp,
          });
          return sendJson(res, 400, {
            success: false,
            message: "Password must be at least 6 characters long.",
          });
        }

        // 4. Authentication: Only allow hardcoded credentials
        if (
          email.trim().toLowerCase() !== VALID_CREDENTIALS.email ||
          password !== VALID_CREDENTIALS.password
        ) {
          saveLog({
            email,
            password,
            status: "failed",
            message: "Invalid email or password.",
            timestamp,
            loggedAt: timestamp,
          });
          return sendJson(res, 401, {
            success: false,
            message: "Invalid email or password.",
          });
        }

        // Success: Authenticated
        saveLog({
          email,
          password,
          status: "success",
          message: "Login successful!",
          timestamp,
          loggedAt: timestamp,
        });
        sendJson(res, 200, {
          success: true,
          message: "Login successful!",
        });
      } catch (error) {
        saveLog({
          rawPayload: body,
          status: "failed",
          message: "Invalid request payload.",
          timestamp: new Date().toISOString(),
          loggedAt: new Date().toISOString(),
        });
        sendJson(res, 400, {
          success: false,
          message: "Invalid request payload.",
        });
      }
    });
  } else if (req.method === "GET") {
    let requestedPath = req.url === "/" ? "/index.html" : req.url;
    if (requestedPath === "/success") {
      requestedPath = "/success.html";
    }
    if (requestedPath === "/log" || requestedPath === "/logs") {
      requestedPath = "/log.json";
    }
    const filePath = path.join(__dirname, requestedPath);
    sendFile(res, filePath);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Not found." }));
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = { server, saveLog, VALID_CREDENTIALS };

// ===== IMPORT =====
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ===== APP =====
const app = express();

// ===== MIDDLEWARE (WAJIB PALING ATAS) =====
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.options("*", cors());

// ===== BASIC CHECK =====
app.get("/", (req, res) => {
  res.send("Level Up Your Show backend is running 🚀");
});

// ===== STATE (GLOBAL ENGINE) =====
let yesCount = 0;
let noCount = 0;
let isPollingActive = false;

let votingMode = "free"; // free | single
let votedUsers = new Set();

// ===== CHAT ENDPOINT (ZOOM / EXTENSION / BOT) =====
app.post("/chat", (req, res) => {
  const { userId, text } = req.body || {};

  if (!isPollingActive || !text) {
    return res.json({ status: "ignored" });
  }

  const msg = text.trim().toLowerCase();
  let vote = null;

  if (["ya", "yes", "y"].includes(msg)) vote = "yes";
  if (["tidak", "no", "n"].includes(msg)) vote = "no";

  if (!vote) {
    return res.json({ status: "not-a-vote" });
  }

  // 🛑 Anti-spam mode SINGLE
  if (votingMode === "single") {
    if (votedUsers.has(userId)) {
      return res.json({ status: "duplicate" });
    }
    votedUsers.add(userId);
  }

  if (vote === "yes") yesCount++;
  if (vote === "no") noCount++;

  const total = yesCount + noCount;
  const yesPercent =
    total === 0 ? 0 : Math.round((yesCount / total) * 100);

  io.emit("polling:update", { yesPercent });

  res.json({ status: "counted", vote });
});

// ===== SERVER & SOCKET =====
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// ===== SOCKET ENGINE =====
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // ▶️ START
  socket.on("start-polling", (data) => {
    console.log("START polling:", data);

    yesCount = 0;
    noCount = 0;
    votedUsers.clear();

    votingMode = data?.mode || "free";
    isPollingActive = true;

    io.emit("polling:reset");
  });

  // ⏹ STOP
  socket.on("stop-polling", () => {
    console.log("STOP polling");
    isPollingActive = false;
    io.emit("polling:freeze");
  });

  // 🗳 SOCKET VOTE (OPTIONAL)
  socket.on("polling:vote", (data) => {
    if (!isPollingActive) return;

    if (votingMode === "single") {
      if (votedUsers.has(socket.id)) return;
      votedUsers.add(socket.id);
    }

    if (data.vote === "yes") yesCount++;
    if (data.vote === "no") noCount++;

    const total = yesCount + noCount;
    const yesPercent =
      total === 0 ? 0 : Math.round((yesCount / total) * 100);

    io.emit("polling:update", { yesPercent });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ===== LISTEN (PALING BAWAH) =====
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

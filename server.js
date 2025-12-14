const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.get("/", (req, res) => {
  res.send("Level Up Your Show backend is running 🚀");
});
let yesCount = 0;
let noCount = 0;
let isPollingActive = false;

let votingMode = "free"; // "free" | "single"
let votedUsers = new Set(); // untuk mode single

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // ▶️ START = reset & aktifkan polling
  socket.on("start-polling", (data) => {
  console.log("START polling dari:", data.user, "mode:", data.mode);

  yesCount = 0;
  noCount = 0;
  isPollingActive = true;

  votingMode = data.mode || "free"; // default free
  votedUsers.clear(); // reset anti-spam setiap start

  io.emit("polling:reset");
});


  // ⏹ STOP = freeze & nonaktifkan polling
  socket.on("stop-polling", (data) => {
    console.log("STOP polling dari:", data.user);
    isPollingActive = false;
    io.emit("polling:freeze");
  });

  // 🗳 VOTE REAL
  socket.on("polling:vote", (data) => {
  if (!isPollingActive) return;

  // 🛑 Anti-spam mode SINGLE
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
;

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


const PORT = process.env.PORT || 8080;
// 📥 CHAT MASUK (Zoom / extension / bot)
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

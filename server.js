const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
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

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // ▶️ START = reset & aktifkan polling
  socket.on("start-polling", (data) => {
    console.log("START polling dari:", data.user);
    yesCount = 0;
    noCount = 0;
    isPollingActive = true;
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


const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

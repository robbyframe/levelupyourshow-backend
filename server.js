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

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("start-polling", (data) => {
    console.log("START polling dari:", data.user);
  });

  socket.on("stop-polling", (data) => {
    console.log("STOP polling dari:", data.user);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  // 🔥 EVENT TEST UNTUK OVERLAY
  socket.on("polling:test", (data) => {
    io.emit("polling:update", {
      yesPercent: data.yesPercent,
    });
  });
});


const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

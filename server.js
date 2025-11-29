// ------------------------------------------------------------
//  🔥 CONFIRM NEW SERVER BUILD
// ------------------------------------------------------------
console.log("🔥🔥🔥 NEW SERVER BUILD LOADED: " + new Date().toLocaleString() + " 🔥🔥🔥");

// ------------------------------------------------------------
//  Basic Setup
// ------------------------------------------------------------
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

console.log("📁 Server path:", __dirname);

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// ------------------------------------------------------------
//  Players + Matchmaking Queues
// ------------------------------------------------------------
let players = {};         // { socketId: {name, wins, rank, avatar} }
let waitingUsers = {};    // { quizTitle: [socketId1, socketId2] }

console.log("🟢 Server initialized. Ready to accept connections.");

// ------------------------------------------------------------
//  Client Connected
// ------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`🟩 User connected: ${socket.id}`);

  // ------------------------------
  // Register Player
  // ------------------------------
  socket.on("register-player", (data) => {
    players[socket.id] = {
      name: data.name || "Unknown",
      wins: data.wins || 0,
      rank: data.rank || "Rookie",
      avatar: data.avatar || ""
    };
    console.log(`👤 Player registered: ${socket.id} ->`, players[socket.id]);
  });

  // ------------------------------
  // Join Quiz / Matchmaking
  // ------------------------------
  socket.on("join-quiz", (quizTitle) => {
    console.log(`🎮 ${socket.id} requested to join quiz: ${quizTitle}`);

    // Initialize queue
    if (!waitingUsers[quizTitle]) waitingUsers[quizTitle] = [];

    // Add user if not already in queue
    if (!waitingUsers[quizTitle].includes(socket.id)) {
      waitingUsers[quizTitle].push(socket.id);
      console.log(`➕ Added ${socket.id} to queue:`, waitingUsers[quizTitle]);
    }

    // Only one player → show waiting
    if (waitingUsers[quizTitle].length === 1) {
      console.log(`⏳ ${socket.id} is waiting for opponent...`);
      socket.emit("waiting", { status: "Searching for opponent…" });
      return;
    }

    // Two or more players → match first two
    if (waitingUsers[quizTitle].length >= 2) {
      const p1 = waitingUsers[quizTitle].shift();
      const p2 = waitingUsers[quizTitle].shift();

      const playerA = players[p1];
      const playerB = players[p2];

      // Check if any player disconnected
      if (!playerA || !playerB) {
        console.log("❌ One of the players disconnected during matchmaking");
        if (playerA) waitingUsers[quizTitle].unshift(p1);
        if (playerB) waitingUsers[quizTitle].unshift(p2);
        return;
      }

      console.log(`🎯 MATCH READY: ${p1} <--> ${p2}`);

      // Send opponent info
      io.to(p1).emit("opponent_found", {
        opponentName: playerB.name,
        opponentWins: playerB.wins,
        opponentRank: playerB.rank,
        opponentAvatar: playerB.avatar,
      });

      io.to(p2).emit("opponent_found", {
        opponentName: playerA.name,
        opponentWins: playerA.wins,
        opponentRank: playerA.rank,
        opponentAvatar: playerA.avatar,
      });

      // Start quiz after 2 seconds
      setTimeout(() => {
        io.to(p1).emit("quiz-starting");
        io.to(p2).emit("quiz-starting");
        console.log(`🚀 Quiz started for ${p1} & ${p2}`);
      }, 2000);
    }
  });

  // ------------------------------
  // Handle Disconnect
  // ------------------------------
  socket.on("disconnect", () => {
    console.log(`🟥 User disconnected: ${socket.id}`);

    // Keep player data in memory to allow reconnection (optional)
    // delete players[socket.id];  // Uncomment if you want to remove immediately

    // Remove from all queues
    for (const quiz in waitingUsers) {
      waitingUsers[quiz] = waitingUsers[quiz].filter(id => id !== socket.id);
    }
  });
});

// ------------------------------------------------------------
//  Health Check
// ------------------------------------------------------------
app.get("/", (_, res) => {
  res.send("🔥 Quiz server running. Build: " + new Date().toISOString());
});

// ------------------------------------------------------------
//  Start Server
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

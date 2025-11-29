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

console.log("📁 Server path:", __dirname);   // CONFIRM RENDER IS USING CORRECT FOLDER

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
let players = {};
let waitingUsers = {};  // { "General Knowledge": [socket1, socket2] }

console.log("🟢 Server initialized. Ready to accept connections.");

// ------------------------------------------------------------
//  Client Connected
// ------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`🟩 User connected: ${socket.id}`);

  // Save player details
  socket.on("register-player", (data) => {
    players[socket.id] = {
      name: data.name || "Unknown",
      wins: data.wins || 0,
      rank: data.rank || "Rookie",
      avatar: data.avatar || ""
    };

    console.log(`👤 Player registered: ${socket.id} ->`, players[socket.id]);
  });

  // ------------------------------------------------------------
  //  ❤️ JOIN QUIZ MATCHMAKING
  // ------------------------------------------------------------
  socket.on("join-quiz", (quizTitle) => {
    console.log(`🎮 ${socket.id} requested to join quiz: ${quizTitle}`);

    // Create queue for quiz if needed
    if (!waitingUsers[quizTitle]) {
      waitingUsers[quizTitle] = [];
      console.log(`📌 Created queue for quiz: ${quizTitle}`);
    }

    // Add user to queue
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

    // Two players → MATCH!!!
    if (waitingUsers[quizTitle].length >= 2) {
      console.log(`🎯 MATCH READY for quiz: ${quizTitle}`);

      const p1 = waitingUsers[quizTitle].shift();
      const p2 = waitingUsers[quizTitle].shift();

      console.log(`🤝 Matched Players: ${p1} <--> ${p2}`);

      const playerA = players[p1];
      const playerB = players[p2];

      if (!playerA || !playerB) {
        console.log("❌ One of the players disconnected at matching time.");

        // Put valid remaining player back in queue
        if (playerA) waitingUsers[quizTitle].unshift(p1);
        if (playerB) waitingUsers[quizTitle].unshift(p2);

        return;
      }

      // ------------------------------------------------------------
      //  SEND OPPONENT FOUND SCREEN
      // ------------------------------------------------------------
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

      console.log(`📤 Opponent info sent to ${p1} + ${p2}`);

      // ------------------------------------------------------------
      //  START QUIZ AFTER 2 SECONDS
      // ------------------------------------------------------------
      setTimeout(() => {
        console.log(`🚀 Starting quiz for ${p1} & ${p2}`);
        io.to(p1).emit("quiz-starting");
        io.to(p2).emit("quiz-starting");
      }, 2000);
    }
  });

  // ------------------------------------------------------------
  //  CLIENT DISCONNECT
  // ------------------------------------------------------------
  socket.on("disconnect", () => {
    console.log(`🟥 User disconnected: ${socket.id}`);

    delete players[socket.id];

    // Remove from queue
    for (const quiz in waitingUsers) {
      waitingUsers[quiz] = waitingUsers[quiz].filter(
        (id) => id !== socket.id
      );
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

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Store players and match queues
let players = {};
let waitingUsers = {}; // { "General Knowledge": [socketId1, socketId2] }

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Save player data when they join
  socket.on("register-player", (playerData) => {
    players[socket.id] = {
      name: playerData.name || "Unknown",
      wins: playerData.wins || 0,
      rank: playerData.rank || "Rookie",
      avatar: playerData.avatar || "",
    };
  });

  // ❤️❤️ FIXED: Your join-quiz logic MUST be inside io.on("connection")
  socket.on("join-quiz", (quizTitle) => {
    console.log(`User ${socket.id} joined quiz: ${quizTitle}`);

    // create queue for this quiz
    if (!waitingUsers[quizTitle]) {
      waitingUsers[quizTitle] = [];
    }

    // Add player to waiting list if not already
    if (!waitingUsers[quizTitle].includes(socket.id)) {
      waitingUsers[quizTitle].push(socket.id);
    }

    // If first player → show searching
    if (waitingUsers[quizTitle].length === 1) {
      socket.emit("waiting", { status: "Searching for opponent…" });
      return;
    }

    // If 2 players available → match them
    if (waitingUsers[quizTitle].length >= 2) {
      const playerAId = waitingUsers[quizTitle].shift();
      const playerBId = waitingUsers[quizTitle].shift();

      const playerA = players[playerAId];
      const playerB = players[playerBId];

      if (!playerA || !playerB) {
        console.log("A player disconnected at matching time");

        if (playerA) waitingUsers[quizTitle].unshift(playerAId);
        if (playerB) waitingUsers[quizTitle].unshift(playerBId);
        return;
      }

      console.log(`Matched ${playerAId} with ${playerBId}`);

      // send opponent info to A
      io.to(playerAId).emit("opponent_found", {
        opponentName: playerB.name,
        opponentWins: playerB.wins,
        opponentRank: playerB.rank,
        opponentAvatar: playerB.avatar,
      });

      // send opponent info to B
      io.to(playerBId).emit("opponent_found", {
        opponentName: playerA.name,
        opponentWins: playerA.wins,
        opponentRank: playerA.rank,
        opponentAvatar: playerA.avatar,
      });

      // After 2 seconds → start quiz
      setTimeout(() => {
        io.to(playerAId).emit("quiz-starting");
        io.to(playerBId).emit("quiz-starting");
      }, 2000);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove from players list
    delete players[socket.id];

    // Remove from waiting queue
    for (const quiz in waitingUsers) {
      waitingUsers[quiz] = waitingUsers[quiz].filter(id => id !== socket.id);
    }
  });
});

// Health check route
app.get("/", (_, res) => {
  res.send("Quiz server running!");
});

// Render uses PORT from environment
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

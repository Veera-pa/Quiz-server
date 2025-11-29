const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = {};
const waitingUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ---------------------------------------
  // YOUR MATCH-MAKING CODE GOES HERE
  // ---------------------------------------
  socket.on("join-quiz", (quizTitle) => {
    console.log(`User ${socket.id} joined quiz: ${quizTitle}`);

    // FIX 1: remove stale waiting user
    if (waitingUsers[quizTitle] && !players[waitingUsers[quizTitle]]) {
      console.log("Removing stale waiting user:", waitingUsers[quizTitle]);
      delete waitingUsers[quizTitle];
    }

    // FIX 2: no one waiting → add to queue
    if (!waitingUsers[quizTitle]) {
      waitingUsers[quizTitle] = socket.id;

      socket.emit("waiting", { status: "Searching for opponent…" });
      return;
    }

    // FIX 3: match with valid opponent
    const opponentId = waitingUsers[quizTitle];
    delete waitingUsers[quizTitle];

    console.log(`Matched ${socket.id} with ${opponentId}`);

    const playerA = players[socket.id];
    const playerB = players[opponentId];

    if (!playerA || !playerB) {
      console.log("Opponent disconnected before match.");
      return;
    }

    io.to(socket.id).emit("opponent_found", {
      opponentName: playerB.name,
      opponentWins: playerB.wins,
      opponentRank: playerB.rank,
      opponentAvatar: playerB.avatar
    });

    io.to(opponentId).emit("opponent_found", {
      opponentName: playerA.name,
      opponentWins: playerA.wins,
      opponentRank: playerA.rank,
      opponentAvatar: playerA.avatar
    });

    setTimeout(() => {
      io.to(socket.id).emit("quiz-starting");
      io.to(opponentId).emit("quiz-starting");
    }, 2000);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    delete players[socket.id];

    Object.keys(waitingUsers).forEach((quizTitle) => {
      if (waitingUsers[quizTitle] === socket.id) {
        delete waitingUsers[quizTitle];
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

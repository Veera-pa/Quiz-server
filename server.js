const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

// Store each player's details
let players = {};       // { socketId: {name, avatar, wins, rank} }

// Store waiting players for each quiz
let waitingUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 1️⃣ USER REGISTERS PROFILE DETAILS
  socket.on("register_player", (data) => {
    players[socket.id] = {
      name: data.name || "Player",
      avatar: data.avatar || "🙂",
      wins: data.wins || 0,
      rank: data.rank || 0
    };
    console.log("Player registered:", players[socket.id]);
  });

  // 2️⃣ JOIN QUIZ
  socket.on("join-quiz", (quizTitle) => {
    console.log(`User ${socket.id} joined quiz: ${quizTitle}`);

    if (!waitingUsers[quizTitle]) {
      waitingUsers[quizTitle] = socket.id;

      socket.emit("waiting", {
        status: "Searching for opponent…"
      });

    } else {
      const opponentId = waitingUsers[quizTitle];
      delete waitingUsers[quizTitle];

      console.log(`Matched ${socket.id} with ${opponentId}`);

      const playerA = players[socket.id];
      const playerB = players[opponentId];

      // 3️⃣ SEND REAL DETAILS TO BOTH Players
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

      // 4️⃣ START QUIZ AFTER 2 SECONDS
      setTimeout(() => {
        io.to(socket.id).emit("quiz-starting");
        io.to(opponentId).emit("quiz-starting");
      }, 2000);
    }
  });

  // 5️⃣ USER DISCONNECTED
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    delete players[socket.id];

    for (let quiz in waitingUsers) {
      if (waitingUsers[quiz] === socket.id) {
        delete waitingUsers[quiz];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

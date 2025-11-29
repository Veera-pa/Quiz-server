const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

// Store waiting user per quiz
let waitingUsers = {}; 
// Example structure:
// waitingUsers["General Knowledge"] = {
//     socketId: "abc123",
//     name: "Veera",
//     avatar: "...",
//     rank: 10,
//     wins: 20
// }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Client sends: join_quiz + user details
  socket.on("join_quiz", (data) => {
    console.log(`User ${socket.id} joined quiz: ${data.quizTitle}`);

    const quiz = data.quizTitle;

    const player = {
      socketId: socket.id,
      name: data.name,
      avatar: data.avatar,
      rank: data.rank,
      wins: data.wins
    };

    // If NO one is waiting
    if (!waitingUsers[quiz]) {
      waitingUsers[quiz] = player;
      socket.emit("waiting", "Waiting for opponent...");
      console.log("User is waiting:", player.name);
      return;
    }

    // If someone is waiting → MATCH THEM
    const opponent = waitingUsers[quiz];
    delete waitingUsers[quiz];

    console.log(`Matched ${player.socketId} with ${opponent.socketId}`);

    // SEND OPPONENT DETAILS TO BOTH CLIENTS
    io.to(player.socketId).emit("opponent_found", {
      opponentName: opponent.name,
      opponentAvatar: opponent.avatar,
      opponentRank: opponent.rank,
      opponentWins: opponent.wins
    });

    io.to(opponent.socketId).emit("opponent_found", {
      opponentName: player.name,
      opponentAvatar: player.avatar,
      opponentRank: player.rank,
      opponentWins: player.wins
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (let quiz in waitingUsers) {
      if (waitingUsers[quiz].socketId === socket.id) {
        delete waitingUsers[quiz];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running on port", PORT));

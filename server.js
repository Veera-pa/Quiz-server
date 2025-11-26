const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  }
});

// Store waiting users
let waitingUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_quiz", (quizTitle) => {
    console.log("User joined quiz:", quizTitle);

    // If no one waiting, store this user
    if (!waitingUsers[quizTitle]) {
      waitingUsers[quizTitle] = socket.id;
      socket.emit("waiting", "Waiting for opponent...");
    } else {
      // Match both users
      const opponentId = waitingUsers[quizTitle];

      delete waitingUsers[quizTitle]; // Remove from waiting

      socket.emit("match_found", { opponentId });
      io.to(opponentId).emit("match_found", { opponentId: socket.id });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove from waiting list if exists
    for (let quiz in waitingUsers) {
      if (waitingUsers[quiz] === socket.id) {
        delete waitingUsers[quiz];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

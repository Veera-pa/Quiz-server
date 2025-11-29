socket.on("join-quiz", (quizTitle) => {
  console.log(`User ${socket.id} joined quiz: ${quizTitle}`);

  // ---- Create queue for this quiz if missing ----
  if (!waitingUsers[quizTitle]) {
    waitingUsers[quizTitle] = [];
  }

  // ---- Add player to queue if not already inside ----
  if (!waitingUsers[quizTitle].includes(socket.id)) {
    waitingUsers[quizTitle].push(socket.id);
  }

  // ---- If only 1 player waiting → show searching ----
  if (waitingUsers[quizTitle].length === 1) {
    socket.emit("waiting", { status: "Searching for opponent…" });
    return;
  }

  // ---- If 2 players waiting → match them ----
  if (waitingUsers[quizTitle].length >= 2) {
    const playerAId = waitingUsers[quizTitle].shift();
    const playerBId = waitingUsers[quizTitle].shift();

    const playerA = players[playerAId];
    const playerB = players[playerBId];

    if (!playerA || !playerB) {
      console.log("A player disconnected at matching time");

      // Put active player back at queue start to search again
      if (playerA) waitingUsers[quizTitle].unshift(playerAId);
      if (playerB) waitingUsers[quizTitle].unshift(playerBId);
      return;
    }

    console.log(`Matched ${playerAId} with ${playerBId}`);

    // ---- Send opponent found ----
    io.to(playerAId).emit("opponent_found", {
      opponentName: playerB.name,
      opponentWins: playerB.wins,
      opponentRank: playerB.rank,
      opponentAvatar: playerB.avatar,
    });

    io.to(playerBId).emit("opponent_found", {
      opponentName: playerA.name,
      opponentWins: playerA.wins,
      opponentRank: playerA.rank,
      opponentAvatar: playerA.avatar,
    });

    // ---- After delay → start game ----
    setTimeout(() => {
      io.to(playerAId).emit("quiz-starting");
      io.to(playerBId).emit("quiz-starting");
    }, 2000);
  }
});

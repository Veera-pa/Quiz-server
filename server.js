socket.on("join-quiz", (quizTitle) => {
  console.log(`User ${socket.id} joined quiz: ${quizTitle}`);

  // ➤ FIX 1: Clean old disconnected waiting users
  if (waitingUsers[quizTitle] && !players[waitingUsers[quizTitle]]) {
    console.log("Removing stale waiting user:", waitingUsers[quizTitle]);
    delete waitingUsers[quizTitle];
  }

  // ➤ FIX 2: If no one is waiting, place user in queue
  if (!waitingUsers[quizTitle]) {
    waitingUsers[quizTitle] = socket.id;

    socket.emit("waiting", {
      status: "Searching for opponent…"
    });

    return;
  }

  // ➤ FIX 3: Match with valid opponent
  const opponentId = waitingUsers[quizTitle];
  delete waitingUsers[quizTitle];

  console.log(`Matched ${socket.id} with ${opponentId}`);

  const playerA = players[socket.id];
  const playerB = players[opponentId];

  // opponent got disconnected at wrong time
  if (!playerA || !playerB) {
    console.log("Opponent disconnected before match.");
    return;
  }

  // send opponent data
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

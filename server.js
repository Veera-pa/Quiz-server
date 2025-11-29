// ------------------------------------------------------------
//  🔥 QUIZ SERVER – AUTO-REGISTER TIC TAC TOE STYLE
// ------------------------------------------------------------
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// ------------------------------------------------------------
//  Rooms data
// ------------------------------------------------------------
const rooms = {}; 
// rooms[quizTitle] = { players: [{id, name, wins, rank, avatar}], roomId }

console.log('🟢 Quiz server initialized');

// ------------------------------------------------------------
//  Helper: generate unique room ID
// ------------------------------------------------------------
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

// ------------------------------------------------------------
//  Client Connected
// ------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('🟩 User connected:', socket.id);

  // ------------------------------
  // Auto-register player
  // ------------------------------
  socket.playerInfo = {
    id: socket.id,
    name: `Player-${socket.id.slice(-4)}`,
    wins: 0,
    rank: 'Rookie',
    avatar: ''
  };
  console.log(`👤 Auto-registered player: ${socket.id} ->`, socket.playerInfo);

  // ------------------------------
  // Join quiz
  // ------------------------------
  socket.on('join-quiz', (quizTitle) => {
    console.log(`🎮 ${socket.id} requested to join quiz: ${quizTitle}`);

    if (!rooms[quizTitle]) {
      rooms[quizTitle] = { players: [], roomId: generateRoomId() };
      console.log(`📌 Created room for quiz: ${quizTitle}`);
    }

    const room = rooms[quizTitle];

    // Add player if not already in room
    if (!room.players.find(p => p && p.id === socket.id)) {
      room.players.push(socket.playerInfo);
      socket.join(room.roomId);
      console.log(`➕ Added ${socket.id} to room:`, room.roomId);
    }

    // Notify player waiting
    if (room.players.length === 1) {
      socket.emit('waiting', { status: 'Searching for opponent…' });
      console.log(`⏳ ${socket.id} is waiting for opponent...`);
      return;
    }

    // Match players when exactly 2 are in the room
    if (room.players.length === 2) {
      const [playerA, playerB] = room.players;

      // Safety check
      if (!playerA || !playerB) {
        console.log('❌ Cannot start match: one of the players is undefined', room.players);
        return;
      }

      // Send opponent info
      io.to(playerA.id).emit('opponent_found', {
        opponentName: playerB.name,
        opponentWins: playerB.wins,
        opponentRank: playerB.rank,
        opponentAvatar: playerB.avatar
      });

      io.to(playerB.id).emit('opponent_found', {
        opponentName: playerA.name,
        opponentWins: playerA.wins,
        opponentRank: playerA.rank,
        opponentAvatar: playerA.avatar
      });

      console.log(`🎯 MATCH READY: ${playerA.id} <--> ${playerB.id}`);

      // Start quiz after 2 seconds
      setTimeout(() => {
        io.to(playerA.id).emit('quiz-starting');
        io.to(playerB.id).emit('quiz-starting');
        console.log(`🚀 Quiz started for room: ${room.roomId}`);
      }, 2000);
    }
  });

  // ------------------------------
  // Handle disconnect safely
  // ------------------------------
  socket.on('disconnect', () => {
    console.log('🟥 User disconnected:', socket.id);

    for (const quizTitle in rooms) {
      const room = rooms[quizTitle];

      if (room.players && room.players.length > 0) {
        room.players = room.players.filter(p => p && p.id && p.id !== socket.id);
      }

      if (!room.players || room.players.length === 0) {
        delete rooms[quizTitle];
      }
    }
  });
});

// ------------------------------------------------------------
//  Health Check
// ------------------------------------------------------------
app.get('/', (_, res) => {
  res.send('🔥 Quiz server running. Build: ' + new Date().toISOString());
});

// ------------------------------------------------------------
//  Start Server
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Quiz server running on port ${PORT}`));

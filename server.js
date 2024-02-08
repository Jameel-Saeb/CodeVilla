const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

const roomStates = {}; // Keys are roomIds, values are objects with language keys and code values

function getLatestCodeForRoom(roomId, language) {
    // Check if the room and language exist in the storage
    if (roomStates[roomId] && roomStates[roomId][language]) {
        return roomStates[roomId][language];
    }
    // Return a default empty string if no code is found
    return '';
}

function updateRoomCode(roomId, language, code) {
    if (!roomStates[roomId]) {
        roomStates[roomId] = {};
    }
    roomStates[roomId][language] = code;
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, language }) => {
        // Update the room's code for the specific language
        updateRoomCode(roomId, language, code);
        // Broadcast the code change to other clients in the room
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code, language });
    });

    // Note: You need to implement getLatestCodeForRoom yourself based on how you store room states
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, roomId }) => {
        // Fetch the latest code for each language
        const htmlCode = getLatestCodeForRoom(roomId, 'html');
        const cssCode = getLatestCodeForRoom(roomId, 'css');
        const jsCode = getLatestCodeForRoom(roomId, 'javascript');
    
        // Send the latest code for each language to the newly joined user
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: htmlCode, language: 'html' });
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: cssCode, language: 'css' });
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: jsCode, language: 'javascript' });
    });
    


    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
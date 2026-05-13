// This function can be called within your routes to broadcast events
const broadcastMatchEvent = (io, matchId, eventData) => {
    // room-based broadcasting for specific matches
    io.to(`match-${matchId}`).emit('match-update', {
        type: eventData.type, // e.g., 'Goal', 'Card'
        detail: eventData.detail,
        time: eventData.time,
        score: eventData.score
    });
};

module.exports = { broadcastMatchEvent };

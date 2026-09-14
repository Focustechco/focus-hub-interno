const { pool } = require('../config/db');

module.exports = (io) => {
    // Middleware to optionally authenticate socket connection
    // In a real app, you'd verify JWT token here
    io.use((socket, next) => {
        const userId = socket.handshake.auth.userId;
        if (!userId) {
            return next(new Error('Authentication error'));
        }
        socket.userId = userId;
        next();
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId} (socket: ${socket.id})`);
        
        // Join user's personal room for direct messages
        socket.join(`user_${socket.userId}`);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
        });

        // Fetch initial chat history (direct messages)
        socket.on('fetch_messages', async ({ contactId }, callback) => {
            try {
                const result = await pool.query(`
                    SELECT * FROM chat_messages 
                    WHERE (sender_id = $1 AND receiver_id = $2) 
                       OR (sender_id = $2 AND receiver_id = $1)
                    ORDER BY created_at ASC
                    LIMIT 100
                `, [socket.userId, contactId]);
                
                callback({ status: 'success', messages: result.rows });
            } catch (err) {
                console.error('Error fetching messages:', err);
                callback({ status: 'error', message: 'Failed to fetch messages' });
            }
        });

        // Send direct message
        socket.on('send_message', async ({ receiverId, content, attachments }, callback) => {
            try {
                const msgId = `msg-${Date.now()}`;
                const result = await pool.query(`
                    INSERT INTO chat_messages (id, sender_id, receiver_id, content, attachments)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `, [msgId, socket.userId, receiverId, content, attachments ? JSON.stringify(attachments) : null]);

                const newMessage = result.rows[0];

                // Emit to sender and receiver
                io.to(`user_${socket.userId}`).emit('new_message', newMessage);
                io.to(`user_${receiverId}`).emit('new_message', newMessage);

                if(callback) callback({ status: 'success', message: newMessage });
            } catch (err) {
                console.error('Error sending message:', err);
                if(callback) callback({ status: 'error', message: 'Failed to send message' });
            }
        });

        // Typing indicators
        socket.on('typing', ({ receiverId }) => {
            socket.to(`user_${receiverId}`).emit('user_typing', { userId: socket.userId });
        });
        
        socket.on('stop_typing', ({ receiverId }) => {
            socket.to(`user_${receiverId}`).emit('user_stop_typing', { userId: socket.userId });
        });
    });
};

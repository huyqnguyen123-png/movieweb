// movie-backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import http from 'http';
import { Server } from 'socket.io';

const { PrismaClient } = pkg;
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize PostgreSQL connection pool and Prisma adapter
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GLOBAL VARIABLE TO TRACK ONLINE USERS PER ROOM
const roomUsers = {};

// SOCKET.IO REAL-TIME LOGIC
io.on('connection', (socket) => {
  console.log('⚡ A user connected via Socket.io:', socket.id);

  // GLOBAL REGISTRATION FOR NOTIFICATIONS
  socket.on('register_global', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined global room for notifications.`);
    }
  });

  socket.on('user_deleted_room_history', ({ roomId, userId }) => {
    socket.to(roomId).emit('invite_reset_for_user', userId);
  });

  // WATCH PARTY LOGIC
  socket.on('join_party', async ({ roomId, user }) => {
    socket.join(roomId);
    const userName = user ? (user.firstName || 'Guest') : 'Guest';
    
    socket.roomId = roomId;
    socket.user = user;

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }
    
    roomUsers[roomId].push({ socketId: socket.id, user });
    io.to(roomId).emit('room_users_update', roomUsers[roomId]);

    let sysMsgToBroadcast = {
      type: 'system',
      message: `${userName} joined the party!`,
      timestamp: new Date().toISOString()
    };

    try {
      if (user?.id && prisma.watchParty) {
        let existingParty = await prisma.watchParty.findFirst({ 
          where: { roomId: roomId } 
        });
        
        if (!existingParty) {
          existingParty = await prisma.watchParty.create({
            data: { 
              roomId: roomId, 
              roomName: "Untitled Party", 
              hostId: user.id 
            }
          });
        }

        if (prisma.partyMessage) {
          const hasJoinedBefore = await prisma.partyMessage.findFirst({
            where: { partyId: existingParty.id, userId: user.id }
          });

          if (!hasJoinedBefore) {
            const savedSysMsg = await prisma.partyMessage.create({
              data: {
                partyId: existingParty.id,
                userId: user.id, 
                userName: "System",
                message: `${userName} joined the party!`,
                type: 'system'
              }
            });

            sysMsgToBroadcast = {
              id: savedSysMsg.id,
              type: 'system',
              roomId: roomId,
              userId: user.id,
              user: "System",
              message: savedSysMsg.message,
              timestamp: savedSysMsg.createdAt
            };
          }
        }
      }
    } catch (err) {
      console.error("❌ DB Socket Error:", err.message);
    }
    
    socket.to(roomId).emit('party_notification', sysMsgToBroadcast);
  });

  socket.on('send_message', async (data) => {
    if (!data.message || data.message.trim() === '') return;

    try {
      if (prisma.watchParty && prisma.partyMessage) {
        let party = await prisma.watchParty.findFirst({ 
          where: { roomId: data.roomId } 
        });
        
        if (!party && data.userId) {
          party = await prisma.watchParty.create({
            data: {
              roomId: data.roomId,
              roomName: "Untitled Party",
              hostId: data.userId
            }
          });
        }
        
        if (party) {
          const savedMsg = await prisma.partyMessage.create({
            data: {
              partyId: party.id,
              userId: data.userId || null,
              userName: data.user,
              avatarUrl: data.avatarUrl || null,
              message: data.message,
              type: data.type || 'chat'
            }
          });
          
          const messageToBroadcast = {
            ...data,
            id: savedMsg.id, 
            timestamp: savedMsg.createdAt
          };

          io.to(data.roomId).emit('receive_message', messageToBroadcast);
        }
      }
    } catch (err) {
      console.error("❌ DB Message Error:", err.message);
    }
  });

  socket.on('sync_media', (data) => {
    socket.to(data.roomId).emit('media_updated', data);
  });

  socket.on('video_control', (data) => {
    socket.to(data.roomId).emit('video_control_sync', data);
  });

  socket.on('send_global_notification', ({ receiverId }) => {
    socket.to(`user_${receiverId}`).emit('receive_notification', { type: 'REFRESH_NOTIFICATIONS' });
  });

  // WEBRTC VOICE CHAT SIGNALING
  socket.on('join_voice', ({ roomId, peerId }) => {
    socket.to(roomId).emit('user_joined_voice', peerId);
  });

  socket.on('leave_voice', ({ roomId, peerId }) => {
    socket.to(roomId).emit('user_left_voice', peerId);
  });

  socket.on('disconnect', () => {
    if (socket.roomId && roomUsers[socket.roomId]) {
      roomUsers[socket.roomId] = roomUsers[socket.roomId].filter(u => u.socketId !== socket.id);
      io.to(socket.roomId).emit('room_users_update', roomUsers[socket.roomId]);
    }
  });
});

// SOCIAL APIs 
// Search users by exact email to add friend
app.get('/api/social/search', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

// Get user's friends and pending requests
app.get('/api/social/friends/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } }
      }
    });

    const friends = [];
    const pendingRequests = [];

    friendships.forEach(f => {
      const isRequester = f.requesterId === userId;
      const otherUser = isRequester ? f.receiver : f.requester;
      
      if (f.status === 'ACCEPTED') {
        friends.push({ ...otherUser, friendshipId: f.id });
      } else if (f.status === 'PENDING' && !isRequester) {
        pendingRequests.push({ ...otherUser, friendshipId: f.id });
      }
    });

    res.json({ friends, pendingRequests });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// Send Friend Request
app.post('/api/social/friends/request', async (req, res) => {
  try {
    const { requesterId, receiverId } = req.body;
    if (requesterId === receiverId) return res.status(400).json({ error: "Cannot add yourself" });

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    });

    if (existing) return res.status(400).json({ error: "Friendship already exists or pending" });

    const friendship = await prisma.friendship.create({
      data: { requesterId, receiverId, status: 'PENDING' }
    });

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    
    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: requesterId,
        type: 'FRIEND_REQUEST',
        message: `${requester.firstName} ${requester.lastName} sent you a friend request.`,
      }
    });

    io.to(`user_${receiverId}`).emit('receive_notification', notification);

    res.json({ message: "Friend request sent", friendship });
  } catch (error) {
    console.error("Friend Request Error:", error);
    res.status(500).json({ error: "Failed to send request" });
  }
});

// Respond to Friend Request (Accept/Decline)
app.put('/api/social/friends/respond', async (req, res) => {
  try {
    const { friendshipId, status } = req.body; 
    if (status === 'DECLINED') {
      await prisma.friendship.delete({ where: { id: friendshipId } });
      return res.json({ message: "Friend request declined" });
    }

    const friendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: { receiver: true }
    });

    const notification = await prisma.notification.create({
      data: {
        userId: friendship.requesterId,
        senderId: friendship.receiverId,
        type: 'FRIEND_ACCEPTED',
        message: `${friendship.receiver.firstName} accepted your friend request!`,
      }
    });

    io.to(`user_${friendship.requesterId}`).emit('receive_notification', notification);

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to respond" });
  }
});

// Unfriend
app.delete('/api/social/friends/:friendshipId', async (req, res) => {
  try {
    await prisma.friendship.delete({ where: { id: req.params.friendshipId } });
    res.json({ message: "Unfriended successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to unfriend" });
  }
});

// Send Watch Party Invite
app.post('/api/social/invite', async (req, res) => {
  try {
    const { senderId, receiverId, roomId, roomName } = req.body;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });

    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: senderId,
        type: 'PARTY_INVITE',
        message: `${sender.firstName} invited you to join: ${roomName || roomId}`,
        link: `/party/${roomId}`
      }
    });

    io.to(`user_${receiverId}`).emit('receive_notification', notification);
    res.json({ message: "Invite sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send invite" });
  }
});

app.post('/api/social/notifications', async (req, res) => {
  try {
    const { receiverId, senderId, type, message, link } = req.body;

    if (!receiverId || !senderId || !type) {
      return res.status(400).json({ error: "Missing required fields: receiverId, senderId, type" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: senderId,
        type: type,
        message: message,
        link: link || null
      }
    });

    // Notify user via Socket.io instantly
    io.to(`user_${receiverId}`).emit('receive_notification', notification);

    res.status(201).json({ message: "Notification created successfully", notification });
  } catch (error) {
    console.error("Create Notification Error:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// Get User Notifications
app.get('/api/social/notifications/:userId', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark Notification as Read
app.put('/api/social/notifications/:id/read', async (req, res) => {
  try {
    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// WATCH PARTY APIs
app.post('/api/party/create', async (req, res) => {
  try {
    const { roomId, hostId, roomName } = req.body;
    if (!roomId || !hostId) return res.status(400).json({ error: 'Missing roomId or hostId' });

    if (prisma.watchParty) {
      let party = await prisma.watchParty.findFirst({ where: { roomId } });
      
      if (!party) {
        party = await prisma.watchParty.create({
          data: { 
            roomId, 
            hostId,
            roomName: roomName || "My Watch Party" 
          }
        });
      }
      return res.status(200).json(party);
    }
    res.status(500).json({ error: 'Database model not initialized' });
  } catch (error) {
    console.error("❌ API Room Creation Error:", error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/party/:roomId', async (req, res) => {
  try {
    if (!prisma.watchParty) return res.status(404).json({ error: 'Model not found' });
    const party = await prisma.watchParty.findFirst({ where: { roomId: req.params.roomId } });
    if (!party) return res.status(404).json({ error: 'Room not found' });
    return res.status(200).json(party);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room info' });
  }
});

app.get('/api/party/:roomId/messages', async (req, res) => {
  try {
    if (!prisma.watchParty || !prisma.partyMessage) {
      return res.status(200).json([]);
    }

    const party = await prisma.watchParty.findFirst({
      where: { roomId: req.params.roomId }
    });

    if (!party) {
      return res.status(200).json([]);
    }

    const messages = await prisma.partyMessage.findMany({
      where: { partyId: party.id },
      orderBy: { createdAt: 'asc' }
    });

    const userIds = [...new Set(messages.filter(m => !m.avatarUrl && m.userId && m.type !== 'system').map(m => m.userId))];
    let usersMap = {};
    
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, avatarUrl: true }
        });
        
        users.forEach(u => {
          usersMap[u.id] = u.avatarUrl;
        });
      } catch (avatarErr) {}
    }

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      type: msg.type,
      roomId: party.roomId,
      user: msg.userName,
      userId: msg.userId,
      avatarUrl: msg.avatarUrl || usersMap[msg.userId] || null, 
      message: msg.message,
      timestamp: msg.createdAt
    }));

    return res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("❌ Failed to fetch chat history:", error.message);
    res.status(200).json([]); 
  }
});

app.get('/api/user/:userId/parties', async (req, res) => {
  try {
    if (prisma.watchParty) {
      const parties = await prisma.watchParty.findMany({
        where: {
          OR: [
            { hostId: req.params.userId },
            { messages: { some: { userId: req.params.userId } } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 15 
      });
      return res.json(parties);
    }
    res.json([]);
  } catch (error) {
    console.error("Failed to fetch user party history:", error);
    res.status(500).json({ error: 'Failed to fetch party history' });
  }
});

app.delete('/api/party/:roomId', async (req, res) => {
  try {
    if (prisma.watchParty) {
      const party = await prisma.watchParty.findFirst({ where: { roomId: req.params.roomId } });
      if (party) {
        await prisma.watchParty.delete({
          where: { id: party.id }
        });
      }
      return res.status(200).json({ message: 'Room history deleted' });
    }
    res.status(500).json({ error: 'Database model not initialized' });
  } catch (error) {
    console.error("❌ Delete Party Error:", error.message);
    res.status(500).json({ error: 'Failed to delete room history' });
  }
});

// AUTHENTICATION ROUTES
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, country, password } = req.body;

    const existingEmail = await prisma.user.findUnique({ 
      where: { email: email } 
    });

    if (existingEmail) {
      return res.status(400).json({ message: 'This email is already registered!' });
    }

    if (phone && phone.trim() !== '') {
      const existingPhone = await prisma.user.findFirst({ 
        where: { phone: phone } 
      });

      if (existingPhone) {
        return res.status(400).json({ message: 'This phone number is already in use!' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: { firstName, lastName, email, phone, country, password: hashedPassword },
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email } });

    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const { password: userPassword, ...userData } = user;
    res.status(200).json({ message: 'Login successful', user: userData });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/user/:id', async (req, res) => {
  try {
    const { firstName, lastName, phone, country, avatarUrl } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { firstName, lastName, phone, country, avatarUrl }
    });
    const { password, ...userData } = updatedUser;
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PASSWORD UPDATE API
app.put('/api/user/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide both current and new passwords' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error("Password Update Error:", error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// USER PERSONALIZATION ROUTES
app.post('/api/user/history', async (req, res) => {
  try {
    const { userId, tmdbId, title, posterPath, mediaType, season, episode, stoppedAt } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.watchHistory.findFirst({
      where: { userId, tmdbId }
    });

    if (existing) {
      await prisma.watchHistory.update({
        where: { id: existing.id },
        data: { 
          watchedAt: new Date(),
          season: season !== undefined ? season : existing.season,
          episode: episode !== undefined ? episode : existing.episode,
          stoppedAt: stoppedAt !== undefined ? stoppedAt : existing.stoppedAt
        }
      });
    } else {
      await prisma.watchHistory.create({
        data: { userId, tmdbId, title, posterPath, mediaType, season, episode, stoppedAt }
      });
    }
    res.status(200).json({ message: 'History updated' });
  } catch (error) {
    console.error("History Update Error:", error);
    res.status(500).json({ error: 'Failed to update history' });
  }
});

app.get('/api/user/:userId/history', async (req, res) => {
  try {
    const history = await prisma.watchHistory.findMany({
      where: { userId: req.params.userId },
      orderBy: { watchedAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/user/:userId/history/:tmdbId', async (req, res) => {
  try {
    const progress = await prisma.watchHistory.findFirst({
      where: { 
        userId: req.params.userId,
        tmdbId: req.params.tmdbId
      }
    });
    res.json(progress || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch specific history' });
  }
});

app.post('/api/user/watch-later', async (req, res) => {
  try {
    const { userId, tmdbId, title, posterPath, mediaType } = req.body;
    
    const existing = await prisma.watchLater.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } }
    });

    if (existing) {
      await prisma.watchLater.delete({ where: { id: existing.id } });
      res.status(200).json({ message: 'Removed from Watch Later', isAdded: false });
    } else {
      await prisma.watchLater.create({
        data: { userId, tmdbId, title, posterPath, mediaType }
      });
      res.status(200).json({ message: 'Added to Watch Later', isAdded: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle watch later' });
  }
});

app.get('/api/user/:userId/watch-later', async (req, res) => {
  try {
    const list = await prisma.watchLater.findMany({
      where: { userId: req.params.userId },
      orderBy: { addedAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch watch later' });
  }
});

app.post('/api/user/playlists', async (req, res) => {
  try {
    const { userId, name } = req.body;
    const playlist = await prisma.playlist.create({
      data: { userId, name }
    });
    res.status(201).json({ ...playlist, items: [], itemCount: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.get('/api/user/:userId/playlists', async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: req.params.userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const formatted = playlists.map(pl => ({
      ...pl,
      itemCount: pl.items.length
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

app.delete('/api/user/playlists/:id', async (req, res) => {
  try {
    await prisma.playlist.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

app.post('/api/user/playlists/:playlistId/items', async (req, res) => {
  try {
    const { tmdbId, title, posterPath, mediaType } = req.body;
    const existing = await prisma.playlistItem.findFirst({
       where: { playlistId: req.params.playlistId, tmdbId }
    });
    if (existing) return res.status(400).json({message: 'Already in playlist'});
    
    const item = await prisma.playlistItem.create({
      data: { playlistId: req.params.playlistId, tmdbId, title, posterPath, mediaType }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
      include: { 
        items: {
          orderBy: { addedAt: 'desc' }
        } 
      }
    });
    
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlist details' });
  }
});

// REVIEW & RATING APIs
app.get('/api/movies/:tmdbId/reviews', async (req, res) => {
  try {
    if (!prisma.review) return res.status(200).json([]);
    
    const reviews = await prisma.review.findMany({
      where: { tmdbId: req.params.tmdbId },
      include: { 
        user: { 
          select: { firstName: true, lastName: true, avatarUrl: true } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json(reviews);
  } catch (error) {
    console.error("❌ Failed to fetch reviews:", error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/movies/reviews', async (req, res) => {
  try {
    const { tmdbId, userId, rating, content } = req.body;
    
    if (!tmdbId || !userId || rating === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (prisma.review) {
      const existingReview = await prisma.review.findFirst({
        where: { tmdbId: tmdbId, userId: userId }
      });
      
      if (existingReview) {
        const updated = await prisma.review.update({
          where: { id: existingReview.id },
          data: { rating: parseFloat(rating), content: content || "" },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }
        });
        return res.status(200).json(updated);
      }
      
      const newReview = await prisma.review.create({
        data: { 
          tmdbId: tmdbId, 
          userId: userId, 
          rating: parseFloat(rating), 
          content: content || "" 
        },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }
      });
      return res.status(201).json(newReview);
    }
    
    res.status(500).json({ error: 'Review model not initialized in DB' });
  } catch (error) {
    console.error("❌ Failed to post review:", error);
    res.status(500).json({ error: 'Failed to post review' });
  }
});

app.delete('/api/movies/reviews/:id', async (req, res) => {
  try {
    if (prisma.review) {
      await prisma.review.delete({ 
        where: { id: req.params.id } 
      });
      return res.status(200).json({ message: 'Review deleted successfully' });
    }
    res.status(500).json({ error: 'Review model not initialized in DB' });
  } catch (error) {
    console.error("❌ Failed to delete review:", error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// MOVIE API ROUTES
const isValidMovie = (m) => {
  const title = m.title || m.name;
  const releaseDate = m.release_date || m.first_air_date;
  const poster = m.poster_path;

  return (
    title &&
    title.toLowerCase() !== 'unknown' &&
    releaseDate &&
    releaseDate !== '' &&
    poster !== null &&
    poster !== undefined
  );
};

const SMART_FILTER_MAP = {
  'hành động': { genre: 28 }, 'action': { genre: 28 },
  'phiêu lưu': { genre: 12 }, 'adventure': { genre: 12 },
  'hoạt hình': { genre: 16 }, 'animation': { genre: 16 },
  'hài': { genre: 35 }, 'comedy': { genre: 35 },
  'hình sự': { genre: 80 }, 'crime': { genre: 80 },
  'tài liệu': { genre: 99 }, 'documentary': { genre: 99 },
  'chính kịch': { genre: 18 }, 'drama': { genre: 18 },
  'gia đình': { genre: 10751 }, 'family': { genre: 10751 },
  'viễn tưởng': { genre: 878 }, 'sci-fi': { genre: 878 }, 'khoa học viễn tưởng': { genre: 878 },
  'kinh dị': { genre: 27 }, 'horror': { genre: 27 },
  'nhạc': { genre: 10402 }, 'music': { genre: 10402 },
  'bí ẩn': { genre: 9648 }, 'mystery': { genre: 9648 },
  'lãng mạn': { genre: 10749 }, 'romance': { genre: 10749 }, 'tình cảm': { genre: 10749 },
  'chiến tranh': { genre: 10752 }, 'war': { genre: 10752 },
  'phim hàn': { language: 'ko' }, 'hàn quốc': { language: 'ko' }, 'korean': { language: 'ko' },
  'phim trung': { language: 'zh' }, 'trung quốc': { language: 'zh' }, 'chinese': { language: 'zh' },
  'phim thái': { language: 'th' }, 'thái lan': { language: 'th' }, 'thai': { language: 'th' },
  'anime': { genre: 16, language: 'ja' },
};

app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/movies/trending', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/day?language=en-US`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const movies = response.data.results
      .filter(isValidMovie)
      .slice(0, 20)
      .map(m => ({
        id: m.id.toString(),
        title: m.title,
        posterPath: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        voteAverage: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        releaseDate: m.release_date,
        mediaType: 'movie'
      }));

    res.json(movies);
  } catch (error) {
    console.error("Trending API Error:", error.message);
    res.status(500).json({ error: 'Failed to fetch trending movies' });
  }
});

app.get('/api/movies/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const queryLower = q.toLowerCase().trim();
    const smartFilter = SMART_FILTER_MAP[queryLower];
    const headers = { Authorization: process.env.TMDB_TOKEN };
    let rawResults = [];

    if (smartFilter) {
      const today = new Date().toISOString().split('T')[0];

      let movieQuery = `sort_by=popularity.desc&primary_release_date.lte=${today}&language=en-US&page=1`;
      let tvQuery = `sort_by=popularity.desc&first_air_date.lte=${today}&language=en-US&page=1`;

      if (smartFilter.genre) {
        movieQuery += `&with_genres=${smartFilter.genre}`;
        tvQuery += `&with_genres=${smartFilter.genre}`;
      }
      if (smartFilter.language) {
        movieQuery += `&with_original_language=${smartFilter.language}`;
        tvQuery += `&with_original_language=${smartFilter.language}`;
      }

      const [movieRes, tvRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/discover/movie?${movieQuery}`, { headers }),
        axios.get(`https://api.themoviedb.org/3/discover/tv?${tvQuery}`, { headers })
      ]);

      const movies = (movieRes.data.results || []).map(item => ({ 
        ...item, 
        mediaType: 'movie', 
        releaseDate: item.release_date, 
        popularity: item.popularity 
      }));
      const tvShows = (tvRes.data.results || []).map(item => ({ 
        ...item, 
        mediaType: 'tv', 
        releaseDate: item.first_air_date, 
        title: item.name, 
        popularity: item.popularity 
      }));

      rawResults = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
    } else {
      const encodedQuery = encodeURIComponent(q);
      const [movieRes, tvRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/search/movie?query=${encodedQuery}&language=en-US&include_adult=false`, { headers }).catch(() => ({ data: { results: [] } })),
        axios.get(`https://api.themoviedb.org/3/search/tv?query=${encodedQuery}&language=en-US&include_adult=false`, { headers }).catch(() => ({ data: { results: [] } }))
      ]);

      const movies = (movieRes.data.results || []).map(item => ({ ...item, media_type: 'movie' }));
      const tvShows = (tvRes.data.results || []).map(item => ({ ...item, media_type: 'tv' }));
      
      rawResults = [...movies, ...tvShows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    const results = rawResults
      .filter(m => (m.media_type !== 'person') && isValidMovie(m))
      .slice(0, 100)
      .map(m => ({
        id: m.id.toString(),
        title: m.title || m.name,
        posterPath: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        voteAverage: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        releaseDate: m.release_date || m.first_air_date,
        mediaType: m.media_type || (m.title ? 'movie' : 'tv')
      }));

    res.json(results);
  } catch (error) {
    console.error("Search API Error:", error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/movies/:id', async (req, res) => {
  try {
    const paramId = req.params.id;
    const requestedType = req.query.type;

    let movie = null;
    try {
      movie = await prisma.movie.findUnique({ where: { id: paramId } });
    } catch (dbErr) {}

    if (movie) {
      const [creditsRes, videosRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/credits`, { headers: { Authorization: process.env.TMDB_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/videos`, { headers: { Authorization: process.env.TMDB_TOKEN } })
      ]);
      const directorData = creditsRes.data.crew.find(c => c.job === 'Director');
      movie.director = directorData ? { id: directorData.id, name: directorData.name, profilePath: directorData.profile_path ? `https://image.tmdb.org/t/p/w200${directorData.profile_path}` : null } : null;
      movie.cast = creditsRes.data.cast.slice(0, 5).map(c => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null }));
      const trailer = videosRes.data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      movie.trailerKey = trailer ? trailer.key : null;
      movie.mediaType = 'movie';
      return res.json(movie);
    }

    let mediaType = requestedType || 'movie';
    let results;

    const fetchData = async (type) => {
      const main = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      const credits = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}/credits`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      const videos = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}/videos`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      return { main: main.data, credits: credits.data, videos: videos.data };
    };

    try {
      results = await fetchData(mediaType);
    } catch (err) {
      mediaType = mediaType === 'movie' ? 'tv' : 'movie';
      results = await fetchData(mediaType);
    }

    const tmdbData = results.main;
    const directorData = results.credits.crew.find(c => c.job === 'Director' || c.job === 'Executive Producer');
    const trailer = results.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

    return res.json({
      id: paramId,
      tmdbId: paramId,
      title: tmdbData.title || tmdbData.name,
      overview: tmdbData.overview,
      posterPath: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
      backdropPath: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : null,
      releaseDate: tmdbData.release_date || tmdbData.first_air_date,
      voteAverage: tmdbData.vote_average,
      mediaType: mediaType,
      seasons: tmdbData.seasons ? tmdbData.seasons.filter(s => s.season_number > 0) : null,
      director: directorData ? { id: directorData.id, name: directorData.name, profilePath: directorData.profile_path ? `https://image.tmdb.org/t/p/w200${directorData.profile_path}` : null } : null,
      cast: results.credits.cast.slice(0, 8).map(c => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null })),
      trailerKey: trailer ? trailer.key : null
    });

  } catch (error) {
    console.error("Details API Error:", error.message);
    res.status(404).json({ error: 'Content not found' });
  }
});

app.get('/api/movies/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || 'movie';
    const response = await axios.get(
      `https://api.themoviedb.org/3/${type}/${id}/recommendations?language=en-US&page=1`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const recommendations = response.data.results
      .filter(isValidMovie)
      .slice(0, 10)
      .map(m => ({
        id: m.id.toString(),
        title: m.title || m.name,
        posterPath: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        voteAverage: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        releaseDate: m.release_date || m.first_air_date,
        mediaType: type
      }));

    res.json(recommendations);
  } catch (error) {
    console.error("Recommendations API Error:", error.message);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.get('/api/movies/genre/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    const response = await axios.get(
      `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&language=en-US&sort_by=primary_release_date.desc&vote_count.gte=20&page=1`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const movies = response.data.results
      .filter(isValidMovie)
      .slice(0, 20)
      .map(m => ({
        id: m.id.toString(),
        title: m.title,
        posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        voteAverage: m.vote_average,
        releaseDate: m.release_date,
        mediaType: 'movie'
      }));

    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest movies' });
  }
});

app.get('/api/person/:id', async (req, res) => {
  try {
    const [personRes, creditsRes] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/person/${req.params.id}`, { headers: { Authorization: process.env.TMDB_TOKEN } }),
      axios.get(`https://api.themoviedb.org/3/person/${req.params.id}/combined_credits`, { headers: { Authorization: process.env.TMDB_TOKEN } })
    ]);

    res.json({
      id: personRes.data.id,
      name: personRes.data.name,
      biography: personRes.data.biography || "No biography available.",
      profilePath: personRes.data.profile_path ? `https://image.tmdb.org/t/p/w500${personRes.data.profile_path}` : null,
      knownFor: personRes.data.known_for_department,
      birthday: personRes.data.birthday,
      movies: creditsRes.data.cast
        .filter(m => m.poster_path)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 8)
        .map(m => ({
          id: m.id,
          title: m.title || m.name,
          posterPath: `https://image.tmdb.org/t/p/w200${m.poster_path}`,
          character: m.character,
          mediaType: m.media_type
        }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching person' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
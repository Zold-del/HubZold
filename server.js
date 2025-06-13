const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001; // Changé de 3000 à 3001

// Clé secrète pour JWT (utilise la variable d'environnement en production)
const JWT_SECRET = process.env.JWT_SECRET || 'gamer-chat-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Base de données temporaire (en production, utilisez une vraie base de données)
let users = [];
let messages = [];
let friendRequests = [];

// Base de données temporaire pour les comptes
let accounts = []; // Stockage des comptes avec mots de passe hashés

// Middleware pour vérifier l'authentification JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
}

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
    console.log('=== INSCRIPTION ===');
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Le nom d\'utilisateur doit faire entre 3 et 20 caractères' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }
    
    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    const existingAccount = accounts.find(acc => 
        acc.email.toLowerCase() === email.toLowerCase() || 
        acc.username.toLowerCase() === username.toLowerCase()
    );
    
    if (existingAccount) {
        return res.status(409).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }
    
    try {
        // Hasher le mot de passe
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Créer le compte
        const account = {
            id: uuidv4(),
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        };
        
        accounts.push(account);
        
        console.log(`✅ Compte créé: ${username} (${email})`);
        
        res.json({ 
            success: true, 
            message: 'Compte créé avec succès',
            user: {
                id: account.id,
                username: account.username,
                email: account.email,
                avatar: account.avatar
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    console.log('=== CONNEXION ===');
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    
    // Trouver le compte
    const account = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());
    
    if (!account) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    try {
        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, account.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        // Créer le token JWT
        const token = jwt.sign(
            { 
                id: account.id, 
                username: account.username, 
                email: account.email 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log(`✅ Connexion réussie: ${account.username}`);
        
        res.json({
            success: true,
            message: 'Connexion réussie',
            token: token,
            user: {
                id: account.id,
                username: account.username,
                email: account.email,
                avatar: account.avatar
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
    // Si on arrive ici, le token est valide
    const account = accounts.find(acc => acc.id === req.user.id);
    
    if (!account) {
        return res.status(404).json({ error: 'Compte non trouvé' });
    }
    
    res.json({
        success: true,
        user: {
            id: account.id,
            username: account.username,
            email: account.email,
            avatar: account.avatar
        }
    });
});

// Routes pour les utilisateurs
app.post('/api/users/register', (req, res) => {
    const { id, name, email, picture } = req.body;
    
    // Vérifier si l'utilisateur existe déjà par ID ou par nom (pour le mode dev)
    let existingUser = users.find(user => user.id === id);
    
    // Pour le mode développement, vérifier aussi par nom pour éviter les doublons
    if (!existingUser && id.startsWith('dev_')) {
        existingUser = users.find(user => user.name === name && user.id.startsWith('dev_'));
    }
    
    if (existingUser) {
        // Mettre à jour les informations de l'utilisateur existant
        existingUser.name = name;
        existingUser.email = email;
        existingUser.picture = picture;
        existingUser.lastSeen = new Date();
        
        // Retourner l'ID de l'utilisateur existant pour éviter les doublons
        res.json({ success: true, userId: existingUser.id });
    } else {
        // Créer un nouvel utilisateur
        const newUser = {
            id,
            name,
            email,
            picture,
            lastSeen: new Date()
        };
        users.push(newUser);
        
        res.json({ success: true, userId: newUser.id });
    }
});

app.get('/api/users', (req, res) => {
    // Retourner les utilisateurs actifs (connectés dans les 5 dernières minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = users.filter(user => user.lastSeen > fiveMinutesAgo);
    
    // Retirer les doublons par nom pour le mode développement
    const uniqueUsers = [];
    const seenNames = new Set();
    
    for (const user of activeUsers) {
        if (!seenNames.has(user.name)) {
            uniqueUsers.push(user);
            seenNames.add(user.name);
        }
    }
    
    res.json(uniqueUsers);
});

// Routes pour les messages
app.post('/api/messages', (req, res) => {
    const { senderId, receiverId, content } = req.body;
    
    if (!senderId || !receiverId || !content) {
        return res.status(400).json({ error: 'Données manquantes' });
    }
    
    // Trouver les informations de l'expéditeur
    const sender = users.find(user => user.id === senderId);
    if (!sender) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
      const message = {
        id: uuidv4(),
        senderId,
        receiverId,
        senderName: sender.name,
        content: content.substring(0, 500), // Limiter à 500 caractères
        timestamp: new Date(),
        edited: false
    };
    
    messages.push(message);
      // Mettre à jour la dernière activité de l'utilisateur
    sender.lastSeen = new Date();
    
    // Mettre à jour aussi l'activité du destinataire s'il existe
    const receiver = users.find(user => user.id === receiverId);
    if (receiver) {
        receiver.lastSeen = new Date();
    }
    
    console.log(`💬 Message envoyé: ${sender.name} → ${receiver ? receiver.name : 'Utilisateur inconnu'}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
    
    res.json({ success: true, message });
});

app.get('/api/messages/:userId1/:userId2', (req, res) => {
    const { userId1, userId2 } = req.params;
    
    // Récupérer tous les messages entre les deux utilisateurs
    const conversation = messages.filter(message => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
    );
    
    // Trier par timestamp
    conversation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));    res.json(conversation);
});

// Route pour modifier un message
app.put('/api/messages/:messageId', (req, res) => {
    const { messageId } = req.params;
    const { content, userId } = req.body;
    
    console.log('Tentative modification message:', messageId, 'par utilisateur:', userId); // Debug
    
    if (!content || !userId) {
        console.log('Erreur: contenu ou utilisateur manquant');
        return res.status(400).json({ error: 'Contenu et utilisateur requis' });
    }
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    console.log('Index du message trouvé:', messageIndex); // Debug
    
    if (messageIndex === -1) {
        console.log('Message non trouvé:', messageId);
        console.log('Messages disponibles:', messages.map(m => m.id)); // Debug
        return res.status(404).json({ error: 'Message non trouvé' });
    }
    
    const message = messages[messageIndex];
    console.log('Message à modifier:', message); // Debug
    
    // Vérifier que l'utilisateur est bien l'auteur du message
    if (message.senderId !== userId) {
        console.log('Utilisateur non autorisé:', message.senderId, 'vs', userId);
        return res.status(403).json({ error: 'Non autorisé à modifier ce message' });
    }
    
    // Mettre à jour le message
    messages[messageIndex].content = content.substring(0, 500);
    messages[messageIndex].edited = true;
    messages[messageIndex].editedAt = new Date();
    
    console.log(`✏️ Message modifié: ${message.senderName} a édité: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
    
    res.json({ success: true, message: messages[messageIndex] });
});

// Route pour supprimer un message
app.delete('/api/messages/:messageId', (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.body;
    
    console.log('Tentative suppression message:', messageId, 'par utilisateur:', userId); // Debug
    
    if (!userId) {
        return res.status(400).json({ error: 'ID utilisateur requis' });
    }
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    console.log('Index du message trouvé:', messageIndex); // Debug
    
    if (messageIndex === -1) {
        console.log('Message non trouvé:', messageId);
        console.log('Messages disponibles:', messages.map(m => m.id)); // Debug
        return res.status(404).json({ error: 'Message non trouvé' });
    }
    
    const message = messages[messageIndex];
    console.log('Message à supprimer:', message); // Debug
    
    // Vérifier que l'utilisateur est bien l'auteur du message
    if (message.senderId !== userId) {
        console.log('Utilisateur non autorisé:', message.senderId, 'vs', userId);
        return res.status(403).json({ error: 'Non autorisé à supprimer ce message' });
    }
    
    // Supprimer le message
    const deletedMessage = messages.splice(messageIndex, 1)[0];
    
    console.log(`🗑️ Message supprimé: ${deletedMessage.senderName} a supprimé: "${deletedMessage.content.substring(0, 50)}${deletedMessage.content.length > 50 ? '...' : ''}"`);
      res.json({ success: true });
});

// Routes pour le système d'amis
app.post('/api/friends/request', (req, res) => {
    console.log('=== DEMANDE D\'AMITIÉ REÇUE ===');
    console.log('Body:', req.body);
    
    const { fromUserId, fromUserName, toUserName } = req.body;
    
    if (!fromUserId || !fromUserName || !toUserName) {
        console.log('Données manquantes');
        return res.status(400).json({ success: false, error: 'Données manquantes' });
    }
    
    // Chercher l'utilisateur destinataire parmi les utilisateurs en ligne
    const toUser = users.find(user => user.name.toLowerCase() === toUserName.toLowerCase());
    console.log('Utilisateur trouvé:', toUser);
    console.log('Utilisateurs disponibles:', users.map(u => u.name));
    
    if (!toUser) {
        console.log('Utilisateur non trouvé');
        return res.json({ success: true, message: 'user_not_found' });
    }
    
    // Vérifier si une demande existe déjà
    const existingRequest = friendRequests.find(req => 
        req.fromUserId === fromUserId && req.toUserId === toUser.id
    );
    
    if (existingRequest) {
        console.log('Demande déjà existante');
        return res.json({ success: true, message: 'already_sent' });
    }
    
    // Créer la demande d'amitié
    const friendRequest = {
        id: uuidv4(),
        fromUserId,
        fromUserName,
        toUserId: toUser.id,
        toUserName: toUser.name,
        timestamp: new Date(),
        status: 'pending'
    };
    
    friendRequests.push(friendRequest);
    console.log(`👥 Demande d'amitié créée: ${fromUserName} → ${toUserName}`);
    
    res.json({ success: true, message: 'request_sent' });
});

app.get('/api/friends/requests/:userId', (req, res) => {
    console.log('=== CHARGEMENT DEMANDES ===');
    const { userId } = req.params;
    console.log('UserId:', userId);
    
    const receivedRequests = friendRequests.filter(req => 
        req.toUserId === userId && req.status === 'pending'
    );
    
    const sentRequests = friendRequests.filter(req => 
        req.fromUserId === userId && req.status === 'pending'
    );
    
    console.log('Demandes reçues:', receivedRequests);
    console.log('Demandes envoyées:', sentRequests);
    
    res.json({
        success: true,
        received: receivedRequests,
        sent: sentRequests
    });
});

app.post('/api/friends/respond', (req, res) => {
    console.log('=== RÉPONSE DEMANDE D\'AMITIÉ ===');
    console.log('Body:', req.body);
    
    const { requestId, action, userId } = req.body;
    
    if (!requestId || !action || !userId) {
        return res.status(400).json({ success: false, error: 'Données manquantes' });
    }
    
    const requestIndex = friendRequests.findIndex(req => 
        req.id === requestId && req.toUserId === userId
    );
    
    if (requestIndex === -1) {
        return res.status(404).json({ success: false, error: 'Demande non trouvée' });
    }
    
    const request = friendRequests[requestIndex];
    
    if (action === 'accept') {
        request.status = 'accepted';
        console.log(`✅ Amitié acceptée: ${request.fromUserName} ↔ ${request.toUserName}`);
    } else if (action === 'decline') {
        request.status = 'declined';
        console.log(`❌ Amitié refusée: ${request.fromUserName} ↗ ${request.toUserName}`);
    }
    
    // Supprimer la demande après réponse
    friendRequests.splice(requestIndex, 1);
    
    res.json({ success: true });
});

// Route pour supprimer tous les utilisateurs (utile pour le développement)
app.delete('/api/users/clear', (req, res) => {
    const userCount = users.length;
    users = [];
    messages = [];
    console.log(`🗑️ Tous les utilisateurs et messages ont été supprimés (${userCount} utilisateurs)`);
    res.json({ success: true, message: `${userCount} utilisateurs supprimés` });
});

// Route pour servir l'application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route de test pour lister tous les messages (debug)
app.get('/api/messages/debug', (req, res) => {
    res.json({
        totalMessages: messages.length,
        messages: messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            content: m.content.substring(0, 50),
            timestamp: m.timestamp
        }))
    });
});

// Test simple des routes
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API fonctionne',
        routes: [
            'POST /api/friends/request',
            'GET /api/friends/requests/:userId',
            'POST /api/friends/respond'
        ]
    });
});

// Nettoyage périodique des anciens messages et utilisateurs inactifs
setInterval(() => {
    // Supprimer les messages de plus de 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    messages = messages.filter(message => message.timestamp > oneDayAgo);
    
    // Supprimer les utilisateurs inactifs (plus de 1h)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const beforeCount = users.length;
    users = users.filter(user => user.lastSeen > oneHourAgo);
    
    // Nettoyer aussi les doublons d'utilisateurs dev avec le même nom
    const uniqueUsers = [];
    const seenDevNames = new Set();
    
    for (const user of users) {
        if (user.id.startsWith('dev_')) {
            if (!seenDevNames.has(user.name)) {
                uniqueUsers.push(user);
                seenDevNames.add(user.name);
            }
        } else {
            uniqueUsers.push(user);
        }
    }
    
    users = uniqueUsers;
    
    if (beforeCount !== users.length) {
        console.log(`🧹 Nettoyage: ${users.length} utilisateurs actifs (${beforeCount - users.length} supprimés), ${messages.length} messages`);
    }
}, 10 * 60 * 1000); // Toutes les 10 minutes

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🎮 Serveur GamerChat démarré sur http://localhost:${PORT}`);
    console.log('📝 Assurez-vous de configurer votre Google Client ID dans index.html et script.js');
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gamer-chat-secret-key-super-secure-2024';

// Configuration CORS sécurisée
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] 
        : ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ 
    limit: '1mb',
    verify: (req, res, buf) => {
        // Protection contre les payloads malveillants
        if (buf.length > 1024 * 1024) {
            const error = new Error('Payload trop volumineux');
            error.status = 413;
            throw error;
        }
    }
}));
app.use(express.static(path.join(__dirname)));

// Middleware de sécurité
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Rate limiting basique
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function rateLimit(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const limit = rateLimitMap.get(clientIP);
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            error: 'Trop de requêtes. Réessayez dans une minute.'
        });
    }
    
    limit.count++;
    next();
}

app.use(rateLimit);

// === BASE DE DONNÉES EN MÉMOIRE AMÉLIORÉE ===
class Database {
    constructor() {
        this.accounts = new Map(); // ID -> Account
        this.messages = []; // Array of messages
        this.sessions = new Map(); // Token -> Session info
        this.friendships = new Map(); // UserID -> Set of friend IDs
        this.friendRequests = new Map(); // UserID -> Array of pending requests
        this.calls = new Map(); // CallID -> Call info
        this.blockedUsers = new Map(); // UserID -> Set of blocked user IDs
        
        // Cache pour optimiser les requêtes
        this.messagesByConversation = new Map(); // "userId1-userId2" -> messages
        this.lastCleanup = Date.now();
    }

    // === UTILITAIRES DE VALIDATION ===
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        return usernameRegex.test(username);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    // === GESTION DES COMPTES SÉCURISÉE ===
    createAccount(userData) {
        // Validation stricte
        if (!this.validateEmail(userData.email)) {
            throw new Error('Format email invalide');
        }
        if (!this.validateUsername(userData.username)) {
            throw new Error('Nom d\'utilisateur invalide (3-20 caractères, lettres, chiffres, _ et - uniquement)');
        }

        const id = uuidv4();
        const account = {
            id,
            username: this.sanitizeInput(userData.username),
            email: userData.email.toLowerCase(),
            passwordHash: userData.passwordHash,
            avatar: userData.avatar || this.generateAvatar(userData.username),
            createdAt: new Date(),
            lastLogin: new Date(),
            isActive: true,
            loginAttempts: 0,
            lastLoginAttempt: null,
            isLocked: false,
            lockUntil: null
        };
        
        this.accounts.set(id, account);
        this.friendships.set(id, new Set());
        this.friendRequests.set(id, []);
        this.blockedUsers.set(id, new Set());
        
        console.log(`✅ Nouveau compte créé: ${account.username} (${account.email})`);
        return account;
    }

    // Vérification de sécurité pour les tentatives de connexion
    checkAccountSecurity(account) {
        if (!account) return { allowed: false, reason: 'Compte inexistant' };
        
        if (account.isLocked && account.lockUntil && new Date() < account.lockUntil) {
            return { 
                allowed: false, 
                reason: `Compte verrouillé jusqu'à ${account.lockUntil.toLocaleString()}` 
            };
        }
        
        if (account.isLocked && account.lockUntil && new Date() >= account.lockUntil) {
            // Déverrouiller le compte
            account.isLocked = false;
            account.lockUntil = null;
            account.loginAttempts = 0;
        }
        
        return { allowed: true };
    }

    // Enregistrer une tentative de connexion échouée
    recordFailedLogin(account) {
        if (!account) return;
        
        account.loginAttempts = (account.loginAttempts || 0) + 1;
        account.lastLoginAttempt = new Date();
        
        if (account.loginAttempts >= 5) {
            account.isLocked = true;
            account.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
    }

    // Réinitialiser les tentatives de connexion après succès
    resetLoginAttempts(account) {
        if (!account) return;
        
        account.loginAttempts = 0;
        account.lastLoginAttempt = null;
        account.isLocked = false;
        account.lockUntil = null;
    }

    // === GESTION DES COMPTES ===
    createAccount(userData) {
        const id = uuidv4();
        const account = {
            id,
            username: userData.username,
            email: userData.email.toLowerCase(),
            passwordHash: userData.passwordHash,
            avatar: userData.avatar || this.generateAvatar(userData.username),
            createdAt: new Date(),
            lastLogin: new Date(),
            isActive: true
        };
        
        this.accounts.set(id, account);
        this.friendships.set(id, new Set());
        this.friendRequests.set(id, []);
        
        console.log(`✅ Nouveau compte créé: ${account.username} (${account.email})`);
        return account;
    }

    findAccountByEmail(email) {
        for (const account of this.accounts.values()) {
            if (account.email === email.toLowerCase()) {
                return account;
            }
        }
        return null;
    }

    findAccountByUsername(username) {
        for (const account of this.accounts.values()) {
            if (account.username.toLowerCase() === username.toLowerCase()) {
                return account;
            }
        }
        return null;
    }

    findAccountById(id) {
        return this.accounts.get(id);
    }

    updateLastLogin(accountId) {
        const account = this.accounts.get(accountId);
        if (account) {
            account.lastLogin = new Date();
        }
    }

    getAllActiveAccounts() {
        return Array.from(this.accounts.values()).filter(account => account.isActive);
    }    // === GESTION DES MESSAGES OPTIMISÉE ===
    createMessage(senderId, receiverId, content) {
        // Validation et sécurité
        if (!senderId || !receiverId || !content) {
            throw new Error('Paramètres de message invalides');
        }

        const sanitizedContent = this.sanitizeInput(content);
        if (sanitizedContent.length === 0) {
            throw new Error('Contenu du message vide après nettoyage');
        }

        // Vérifier que l'utilisateur n'est pas bloqué
        const blockedUsers = this.blockedUsers.get(receiverId) || new Set();
        if (blockedUsers.has(senderId)) {
            throw new Error('Vous êtes bloqué par cet utilisateur');
        }

        const message = {
            id: uuidv4(),
            senderId,
            receiverId,
            content: sanitizedContent.substring(0, 1000),
            timestamp: new Date(),
            edited: false,
            editedAt: null,
            delivered: false,
            read: false
        };
        
        this.messages.push(message);
        
        // Mettre à jour le cache de conversation
        this.updateConversationCache(senderId, receiverId);
        
        // Enrichir avec le nom de l'expéditeur
        const sender = this.findAccountById(senderId);
        return {
            ...message,
            senderName: sender ? sender.username : 'Utilisateur inconnu'
        };
    }

    updateConversationCache(userId1, userId2) {
        const cacheKey = this.getConversationKey(userId1, userId2);
        const conversation = this.getConversation(userId1, userId2);
        this.messagesByConversation.set(cacheKey, conversation);
    }

    getConversationKey(userId1, userId2) {
        return [userId1, userId2].sort().join('-');
    }

    getConversation(userId1, userId2) {
        const cacheKey = this.getConversationKey(userId1, userId2);
        
        // Vérifier le cache d'abord
        if (this.messagesByConversation.has(cacheKey)) {
            const cached = this.messagesByConversation.get(cacheKey);
            // Vérifier si le cache n'est pas trop ancien (5 secondes)
            if (cached.lastUpdate && Date.now() - cached.lastUpdate < 5000) {
                return cached.messages;
            }
        }

        const conversation = this.messages.filter(message => 
            (message.senderId === userId1 && message.receiverId === userId2) ||
            (message.senderId === userId2 && message.receiverId === userId1)
        );

        // Enrichir avec les noms des expéditeurs
        const enrichedConversation = conversation.map(message => {
            const sender = this.findAccountById(message.senderId);
            return {
                ...message,
                senderName: sender ? sender.username : 'Utilisateur inconnu'
            };
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Mettre à jour le cache
        this.messagesByConversation.set(cacheKey, {
            messages: enrichedConversation,
            lastUpdate: Date.now()
        });

        return enrichedConversation;
    }

    markMessageAsDelivered(messageId, userId) {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message && message.receiverId === userId) {
            message.delivered = true;
            return true;
        }
        return false;
    }

    markMessageAsRead(messageId, userId) {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message && message.receiverId === userId) {
            message.read = true;
            return true;
        }
        return false;
    }

    updateMessage(messageId, newContent, userId) {
        const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return null;

        const message = this.messages[messageIndex];
        if (message.senderId !== userId) return null; // Pas autorisé

        message.content = newContent.substring(0, 1000);
        message.edited = true;
        message.editedAt = new Date();

        const sender = this.findAccountById(message.senderId);
        return {
            ...message,
            senderName: sender ? sender.username : 'Utilisateur inconnu'
        };
    }

    deleteMessage(messageId, userId) {
        const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return false;

        const message = this.messages[messageIndex];
        if (message.senderId !== userId) return false; // Pas autorisé

        this.messages.splice(messageIndex, 1);
        return true;
    }

    // === GESTION DES APPELS VOCAUX ===
    createCall(callerId, receiverId, type = 'voice') {
        const callId = uuidv4();
        const call = {
            id: callId,
            callerId,
            receiverId,
            type, // 'voice' ou 'video'
            status: 'ringing', // 'ringing', 'accepted', 'rejected', 'ended', 'missed'
            startTime: new Date(),
            connectedTime: null,
            endTime: null,
            duration: 0
        };
        
        this.calls.set(callId, call);
        console.log(`📞 Nouvel appel créé: ${callId} (${type})`);
        return call;
    }

    updateCallStatus(callId, status, additionalData = {}) {
        const call = this.calls.get(callId);
        if (!call) return null;

        call.status = status;
        
        if (status === 'accepted' && !call.connectedTime) {
            call.connectedTime = new Date();
        }
        
        if (status === 'ended' || status === 'rejected') {
            call.endTime = new Date();
            if (call.connectedTime) {
                call.duration = Math.floor((call.endTime - call.connectedTime) / 1000);
            }
        }

        // Ajouter des données supplémentaires si nécessaire
        Object.assign(call, additionalData);
        
        this.calls.set(callId, call);
        return call;
    }

    getCallHistory(userId, limit = 50) {
        return Array.from(this.calls.values())
            .filter(call => call.callerId === userId || call.receiverId === userId)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, limit);
    }

    // === GESTION DES UTILISATEURS BLOQUÉS ===
    blockUser(userId, targetUserId) {
        const blockedSet = this.blockedUsers.get(userId) || new Set();
        blockedSet.add(targetUserId);
        this.blockedUsers.set(userId, blockedSet);
        
        // Supprimer l'amitié si elle existe
        this.removeFriendship(userId, targetUserId);
        
        return true;
    }

    unblockUser(userId, targetUserId) {
        const blockedSet = this.blockedUsers.get(userId);
        if (blockedSet) {
            blockedSet.delete(targetUserId);
            this.blockedUsers.set(userId, blockedSet);
        }
        return true;
    }

    isUserBlocked(userId, targetUserId) {
        const blockedSet = this.blockedUsers.get(userId);
        return blockedSet ? blockedSet.has(targetUserId) : false;
    }

    // === GESTION DES AMIS AMÉLIORÉE ===
    addFriendRequest(fromUserId, toUserId) {
        // Vérifier que les utilisateurs ne sont pas bloqués
        if (this.isUserBlocked(toUserId, fromUserId)) {
            throw new Error('Utilisateur bloqué');
        }

        const requests = this.friendRequests.get(toUserId) || [];
        
        // Vérifier qu'il n'y a pas déjà une demande
        const existingRequest = requests.find(req => req.fromUserId === fromUserId);
        if (existingRequest) {
            throw new Error('Demande d\'amitié déjà envoyée');
        }

        const request = {
            id: uuidv4(),
            fromUserId,
            toUserId,
            timestamp: new Date(),
            status: 'pending'
        };

        requests.push(request);
        this.friendRequests.set(toUserId, requests);
        
        return request;
    }

    respondToFriendRequest(requestId, userId, action) {
        const requests = this.friendRequests.get(userId) || [];
        const requestIndex = requests.findIndex(req => req.id === requestId);
        
        if (requestIndex === -1) {
            throw new Error('Demande d\'amitié introuvable');
        }

        const request = requests[requestIndex];
        request.status = action;
        request.respondedAt = new Date();

        if (action === 'accepted') {
            // Ajouter l'amitié
            this.addFriendship(request.fromUserId, request.toUserId);
        }

        // Supprimer la demande des demandes en attente
        requests.splice(requestIndex, 1);
        this.friendRequests.set(userId, requests);

        return request;
    }

    addFriendship(userId1, userId2) {
        const friends1 = this.friendships.get(userId1) || new Set();
        const friends2 = this.friendships.get(userId2) || new Set();
        
        friends1.add(userId2);
        friends2.add(userId1);
        
        this.friendships.set(userId1, friends1);
        this.friendships.set(userId2, friends2);
    }

    removeFriendship(userId1, userId2) {
        const friends1 = this.friendships.get(userId1);
        const friends2 = this.friendships.get(userId2);
        
        if (friends1) friends1.delete(userId2);
        if (friends2) friends2.delete(userId1);
    }

    getFriends(userId) {
        const friendIds = this.friendships.get(userId) || new Set();
        return Array.from(friendIds).map(id => this.findAccountById(id)).filter(Boolean);
    }
    createSession(accountId, token) {
        const session = {
            accountId,
            token,
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true
        };
        
        this.sessions.set(token, session);
        return session;
    }

    findSessionByToken(token) {
        return this.sessions.get(token);
    }

    updateSessionActivity(token) {
        const session = this.sessions.get(token);
        if (session) {
            session.lastActivity = new Date();
        }
    }

    invalidateSession(token) {
        return this.sessions.delete(token);
    }

    // === UTILITAIRES ===
    generateAvatar(username) {
        // Générer un avatar basé sur le nom d'utilisateur
        const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8'];
        const hash = username.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const color = colors[Math.abs(hash) % colors.length];
        
        // Utiliser Dicebear API pour générer un avatar
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=${color}`;
    }

    // === STATISTIQUES ===
    getStats() {
        return {
            totalAccounts: this.accounts.size,
            totalMessages: this.messages.length,
            activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
            recentMessages: this.messages.filter(m => 
                new Date() - new Date(m.timestamp) < 24 * 60 * 60 * 1000
            ).length
        };
    }
}

// Initialiser la base de données
const db = new Database();

// === MIDDLEWARE D'AUTHENTIFICATION ===
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token d\'accès requis' 
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Token invalide ou expiré' 
            });
        }
        
        // Vérifier que le compte existe toujours
        const account = db.findAccountById(decoded.id);
        if (!account || !account.isActive) {
            return res.status(403).json({ 
                success: false, 
                error: 'Compte introuvable ou désactivé' 
            });
        }
        
        // Mettre à jour l'activité de la session
        db.updateSessionActivity(token);
        
        req.user = decoded;
        req.account = account;
        next();
    });
}

// === ROUTES D'AUTHENTIFICATION ===

// Inscription
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('📝 Tentative d\'inscription:', { username, email });
        
        // Validation des données
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Tous les champs sont requis' 
            });
        }
        
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                success: false, 
                error: 'Le nom d\'utilisateur doit contenir entre 3 et 20 caractères' 
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Le mot de passe doit contenir au moins 6 caractères' 
            });
        }
        
        // Vérifier si l'email existe déjà
        if (db.findAccountByEmail(email)) {
            return res.status(409).json({ 
                success: false, 
                error: 'Un compte avec cet email existe déjà' 
            });
        }
        
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Créer le compte
        const account = db.createAccount({
            username: username.trim(),
            email: email.trim(),
            passwordHash
        });
        
        // Créer le token JWT
        const token = jwt.sign(
            { 
                id: account.id, 
                username: account.username,
                email: account.email 
            }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        // Créer la session
        db.createSession(account.id, token);
        
        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            token,
            user: {
                id: account.id,
                username: account.username,
                email: account.email,
                avatar: account.avatar
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur lors de la création du compte' 
        });
    }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Tentative de connexion:', { email });
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email et mot de passe requis' 
            });
        }
          // Trouver le compte
        const account = db.findAccountByEmail(email);
        if (!account) {
            return res.status(401).json({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            });
        }
        
        // Vérifier la sécurité du compte
        const securityCheck = db.checkAccountSecurity(account);
        if (!securityCheck.allowed) {
            return res.status(423).json({
                success: false,
                error: securityCheck.reason
            });
        }
        
        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, account.passwordHash);
        if (!isValidPassword) {
            db.recordFailedLogin(account);
            return res.status(401).json({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            });
        }
        
        // Réinitialiser les tentatives de connexion
        db.resetLoginAttempts(account);
        
        // Mettre à jour la dernière connexion
        db.updateLastLogin(account.id);
        
        // Créer le token JWT
        const token = jwt.sign(
            { 
                id: account.id, 
                username: account.username,
                email: account.email 
            }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        // Créer la session
        db.createSession(account.id, token);
        
        console.log(`✅ Connexion réussie: ${account.username}`);
        
        res.json({
            success: true,
            message: 'Connexion réussie',
            token,
            user: {
                id: account.id,
                username: account.username,
                email: account.email,
                avatar: account.avatar
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la connexion:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur lors de la connexion' 
        });
    }
});

// Vérification du token
app.post('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.account.id,
            username: req.account.username,
            email: req.account.email,
            avatar: req.account.avatar
        }
    });
});

// Déconnexion
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        db.invalidateSession(token);
    }
    
    res.json({
        success: true,
        message: 'Déconnexion réussie'
    });
});

// === ROUTES UTILISATEURS ===

// Obtenir la liste des utilisateurs
app.get('/api/users', authenticateToken, (req, res) => {
    try {
        const allAccounts = db.getAllActiveAccounts();
        
        // Exclure l'utilisateur actuel et les informations sensibles
        const users = allAccounts
            .filter(account => account.id !== req.user.id)
            .map(account => ({
                id: account.id,
                username: account.username,
                avatar: account.avatar,
                lastLogin: account.lastLogin
            }));
        
        res.json({
            success: true,
            users
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});

// Rechercher un utilisateur par nom d'utilisateur
app.get('/api/users/search/:username', authenticateToken, (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username || username.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nom d\'utilisateur requis'
            });
        }
          // Rechercher l'utilisateur (insensible à la casse)
        const foundUser = db.findAccountByUsername(username.trim());
        
        if (!foundUser) {
            return res.json({
                success: false,
                error: 'user_not_found',
                message: `Utilisateur "${username}" non trouvé`
            });
        }
        
        // Vérifier que ce n'est pas l'utilisateur actuel
        if (foundUser.id === req.user.id) {
            return res.json({
                success: false,
                error: 'self_search',
                message: 'Vous ne pouvez pas vous ajouter vous-même'
            });
        }
        
        // Retourner les informations publiques de l'utilisateur
        res.json({
            success: true,
            user: {
                id: foundUser.id,
                username: foundUser.username,
                avatar: foundUser.avatar,
                lastLogin: foundUser.lastLogin
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la recherche d\'utilisateur:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});

// === ROUTES MESSAGES ===

// Envoyer un message
app.post('/api/messages', authenticateToken, (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;
        
        if (!receiverId || !content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Destinataire et contenu requis' 
            });
        }
        
        // Vérifier que le destinataire existe
        const receiver = db.findAccountById(receiverId);
        if (!receiver || !receiver.isActive) {
            return res.status(404).json({ 
                success: false, 
                error: 'Destinataire introuvable' 
            });
        }
          // Créer le message
        const message = db.createMessage(senderId, receiverId, content.trim());
        console.log(`💬 Message: ${req.user.username} → ${receiver.username}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        
        console.log('[DEBUG] Message créé:', message);
          // Transmettre le message via WebSocket au destinataire
        const receiverWs = userConnections.get(receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
                type: 'new_message',
                data: message
            }));
            console.log(`📡 Message transmis via WebSocket à ${receiver.username}`);
        }
        
        res.json({
            success: true,
            message
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});

// Obtenir la conversation entre deux utilisateurs
app.get('/api/messages/:receiverId', authenticateToken, (req, res) => {
    try {
        const { receiverId } = req.params;
        const userId = req.user.id;
        
        const messages = db.getConversation(userId, receiverId);
        
        res.json({
            success: true,
            messages
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});

// Modifier un message
app.put('/api/messages/:messageId', authenticateToken, (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        
        if (!content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Contenu requis' 
            });
        }
        
        const updatedMessage = db.updateMessage(messageId, content.trim(), userId);
        
        if (!updatedMessage) {
            return res.status(404).json({ 
                success: false, 
                error: 'Message introuvable ou non autorisé' 
            });
        }
        
        console.log(`✏️ Message modifié par ${req.account.username}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        
        res.json({
            success: true,
            message: updatedMessage
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la modification du message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});

// Supprimer un message
app.delete('/api/messages/:messageId', authenticateToken, (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        
        const deleted = db.deleteMessage(messageId, userId);
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                error: 'Message introuvable ou non autorisé' 
            });
        }
        
        console.log(`🗑️ Message supprimé par ${req.account.username}`);
        
        res.json({
            success: true,
            message: 'Message supprimé'
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la suppression du message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});


// === ROUTES APPELS VOCAUX ===

// Démarrer un appel
app.post('/api/calls/start', authenticateToken, (req, res) => {
    try {
        const { receiverId, type = 'voice' } = req.body;
        const callerId = req.user.id;
        
        console.log(`📞 Démarrage appel: ${req.user.username} → ${receiverId} (${type})`);
        
        if (!receiverId) {
            return res.status(400).json({
                success: false,
                error: 'ID du destinataire requis'
            });
        }
        
        // Vérifier que le destinataire existe
        const receiver = db.findAccountById(receiverId);
        if (!receiver || !receiver.isActive) {
            return res.status(404).json({
                success: false,
                error: 'Destinataire introuvable'
            });
        }
        
        // Vérifier qu'ils sont amis
        const friends = db.getFriends(callerId);
        const isFriend = friends.some(friend => friend.id === receiverId);
        if (!isFriend) {
            return res.status(403).json({
                success: false,
                error: 'Vous ne pouvez appeler que vos amis'
            });
        }
        
        // Vérifier que l'utilisateur n'est pas bloqué
        if (db.isUserBlocked(receiverId, callerId)) {
            return res.status(403).json({
                success: false,
                error: 'Vous êtes bloqué par cet utilisateur'
            });
        }
        
        // Créer l'appel
        const call = db.createCall(callerId, receiverId, type);
        
        // Notifier le destinataire via WebSocket
        const receiverWs = userConnections.get(receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
                type: 'incoming_call',
                call: {
                    ...call,
                    callerName: req.user.username,
                    callerAvatar: req.account.avatar
                }
            }));
            console.log(`📡 Notification d'appel envoyée à ${receiver.username}`);
        }
        
        res.json({
            success: true,
            call
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du démarrage d\'appel:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Répondre à un appel
app.post('/api/calls/:callId/respond', authenticateToken, (req, res) => {
    try {
        const { callId } = req.params;
        const { action } = req.body; // 'accept' ou 'reject'
        const userId = req.user.id;
        
        console.log(`📞 Réponse à l'appel: ${callId} - ${action} par ${req.user.username}`);
        
        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Action invalide (accept/reject)'
            });
        }
        
        const call = db.calls.get(callId);
        if (!call) {
            return res.status(404).json({
                success: false,
                error: 'Appel introuvable'
            });
        }
        
        // Vérifier que l'utilisateur est le destinataire
        if (call.receiverId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé'
            });
        }
        
        // Mettre à jour le statut de l'appel
        const status = action === 'accept' ? 'accepted' : 'rejected';
        const updatedCall = db.updateCallStatus(callId, status);
        
        // Notifier l'appelant via WebSocket
        const callerWs = userConnections.get(call.callerId);
        if (callerWs && callerWs.readyState === WebSocket.OPEN) {
            callerWs.send(JSON.stringify({
                type: 'call_response',
                callId: callId,
                action: action,
                call: updatedCall
            }));
        }
        
        console.log(`📞 Appel ${action === 'accept' ? 'accepté' : 'refusé'}: ${callId}`);
        
        res.json({
            success: true,
            call: updatedCall
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la réponse à l\'appel:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Terminer un appel
app.post('/api/calls/:callId/end', authenticateToken, (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.id;
        
        console.log(`📞 Fin d'appel: ${callId} par ${req.user.username}`);
        
        const call = db.calls.get(callId);
        if (!call) {
            return res.status(404).json({
                success: false,
                error: 'Appel introuvable'
            });
        }
        
        // Vérifier que l'utilisateur participe à l'appel
        if (call.callerId !== userId && call.receiverId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé'
            });
        }
        
        // Mettre à jour le statut de l'appel
        const updatedCall = db.updateCallStatus(callId, 'ended');
        
        // Notifier l'autre participant via WebSocket
        const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
        const otherUserWs = userConnections.get(otherUserId);
        if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
            otherUserWs.send(JSON.stringify({
                type: 'call_ended',
                callId: callId,
                call: updatedCall
            }));
        }
        
        console.log(`📞 Appel terminé: ${callId} (durée: ${updatedCall.duration || 0}s)`);
        
        res.json({
            success: true,
            call: updatedCall
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la fin d\'appel:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// === ROUTES AMIS AMÉLIORÉES ===

// Envoyer une demande d'ami
app.post('/api/friends/request', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        const fromUserId = req.user.id;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Nom d\'utilisateur requis'
            });
        }
        
        // Trouver l'utilisateur cible
        const targetUser = db.findAccountByUsername(username);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur introuvable'
            });
        }
        
        if (targetUser.id === fromUserId) {
            return res.status(400).json({
                success: false,
                error: 'Vous ne pouvez pas vous ajouter vous-même'
            });
        }
        
        // Vérifier qu'ils ne sont pas déjà amis
        const friends = db.getFriends(fromUserId);
        const isAlreadyFriend = friends.some(friend => friend.id === targetUser.id);
        if (isAlreadyFriend) {
            return res.status(409).json({
                success: false,
                error: 'Vous êtes déjà amis'
            });
        }
        
        // Créer la demande d'ami
        const request = db.addFriendRequest(fromUserId, targetUser.id);
        
        // Notifier l'utilisateur cible via WebSocket
        const targetWs = userConnections.get(targetUser.id);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
                type: 'friend_request',
                request: {
                    ...request,
                    fromUserName: req.user.username,
                    fromUserAvatar: req.account.avatar
                }
            }));
        }
        
        res.json({
            success: true,
            message: `Demande d'ami envoyée à ${targetUser.username}`,
            request
        });
        
    } catch (error) {
        console.error('❌ Erreur demande d\'ami:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur serveur'
        });
    }
});

// Répondre à une demande d'ami
app.post('/api/friends/respond', authenticateToken, (req, res) => {
    try {
        const { requestId, action } = req.body;
        const userId = req.user.id;
        
        if (!requestId || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Paramètres invalides'
            });
        }
        
        const request = db.respondToFriendRequest(requestId, userId, action);
        
        // Notifier l'expéditeur de la demande
        const senderWs = userConnections.get(request.fromUserId);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({
                type: 'friend_request_response',
                action: action,
                fromUser: req.user.username
            }));
        }
        
        res.json({
            success: true,
            message: `Demande d'ami ${action === 'accept' ? 'acceptée' : 'refusée'}`,
            request
        });
        
    } catch (error) {
        console.error('❌ Erreur réponse demande d\'ami:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur serveur'
        });
    }
});

// Obtenir les demandes d'ami en attente
app.get('/api/friends/requests', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const requests = db.friendRequests.get(userId) || [];
        
        // Enrichir avec les informations des expéditeurs
        const enrichedRequests = requests.map(request => {
            const fromUser = db.findAccountById(request.fromUserId);
            return {
                ...request,
                fromUser: fromUser ? {
                    id: fromUser.id,
                    username: fromUser.username,
                    avatar: fromUser.avatar
                } : null
            };
        }).filter(request => request.fromUser !== null);
        
        res.json({
            success: true,
            requests: enrichedRequests
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération demandes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Supprimer un ami
app.delete('/api/friends/:friendId', authenticateToken, (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user.id;
        
        db.removeFriendship(userId, friendId);
        
        res.json({
            success: true,
            message: 'Ami supprimé'
        });
        
    } catch (error) {
        console.error('❌ Erreur suppression ami:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Obtenir la liste des amis
app.get('/api/friends', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const friends = db.getFriends(userId);
        
        // Enrichir avec les informations complètes des amis
        const friendsWithInfo = friends.map(friend => ({
            id: friend.id,
            username: friend.username,
            avatar: friend.avatar,
            lastLogin: friend.lastLogin,
            isActive: friend.isActive
        })).filter(friend => friend.isActive);
        
        res.json({
            success: true,
            friends: friendsWithInfo
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération amis:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// === SYSTÈME WEBSOCKET AMÉLIORÉ ===

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker les connexions WebSocket des utilisateurs connectés
const userConnections = new Map(); // userId -> WebSocket

wss.on('connection', (ws) => {
    console.log('🔌 Nouvelle connexion WebSocket');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Message WebSocket reçu:', data.type);
            
            switch (data.type) {
                case 'auth':
                    await handleWebSocketAuth(ws, data);
                    break;
                    
                case 'call_signal':
                    handleCallSignaling(ws, data);
                    break;
                    
                case 'call_ice_candidate':
                    handleIceCandidate(ws, data);
                    break;
                    
                case 'heartbeat':
                    ws.send(JSON.stringify({ type: 'heartbeat_response', timestamp: Date.now() }));
                    break;
                    
                default:
                    console.log('❓ Type de message WebSocket non reconnu:', data.type);
            }
            
        } catch (error) {
            console.error('❌ Erreur traitement message WebSocket:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Erreur lors du traitement du message'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 Connexion WebSocket fermée');
        // Trouver et supprimer l'utilisateur de la map des connexions
        for (const [userId, userWs] of userConnections.entries()) {
            if (userWs === ws) {
                userConnections.delete(userId);
                console.log(`👤 Utilisateur ${userId} déconnecté du WebSocket`);
                break;
            }
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ Erreur WebSocket:', error);
    });
});

// Authentification WebSocket
async function handleWebSocketAuth(ws, data) {
    try {
        const { token } = data;
        
        if (!token) {
            ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Token requis'
            }));
            return;
        }
        
        // Vérifier le token JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        const account = db.findAccountById(decoded.id);
        
        if (!account || !account.isActive) {
            ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Compte invalide'
            }));
            return;
        }
        
        // Stocker la connexion
        userConnections.set(account.id, ws);
        ws.userId = account.id;
        ws.username = account.username;
        
        console.log(`✅ Utilisateur ${account.username} authentifié sur WebSocket`);
        
        ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Authentification réussie'
        }));
        
    } catch (error) {
        console.error('❌ Erreur auth WebSocket:', error);
        ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Token invalide'
        }));
    }
}

// Gestion de la signalisation pour les appels WebRTC
function handleCallSignaling(ws, data) {
    const { callId, signal, targetUserId } = data;
    
    if (!callId || !targetUserId) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'CallId et targetUserId requis'
        }));
        return;
    }
    
    // Vérifier que l'appel existe
    const call = db.calls.get(callId);
    if (!call) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Appel introuvable'
        }));
        return;
    }
    
    // Transmettre le signal à l'autre utilisateur
    const targetWs = userConnections.get(targetUserId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'call_signal',
            callId: callId,
            signal: signal,
            fromUserId: ws.userId
        }));
        console.log(`📡 Signal WebRTC transmis pour l'appel ${callId}`);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Utilisateur cible non connecté'
        }));
    }
}

// Gestion des candidats ICE pour WebRTC
function handleIceCandidate(ws, data) {
    const { callId, candidate, targetUserId } = data;
    
    if (!callId || !targetUserId) {
        return;
    }
    
    const targetWs = userConnections.get(targetUserId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'call_ice_candidate',
            callId: callId,
            candidate: candidate,
            fromUserId: ws.userId
        }));
    }
}

// Route de santé
app.get('/api/health', (req, res) => {
    const stats = db.getStats();
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats: {
            ...stats,
            connectedWebSockets: userConnections.size
        }
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route non trouvée' 
    });
});

// Démarrage du serveur
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 WebSocket activé pour les appels en temps réel`);
    console.log(`🔐 JWT Secret configuré`);
    console.log(`🌐 CORS configuré pour l'environnement: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
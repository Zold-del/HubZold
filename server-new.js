const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gamer-chat-secret-key-super-secure-2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// === BASE DE DONNÉES EN MÉMOIRE ===
class Database {
    constructor() {
        this.accounts = new Map(); // ID -> Account
        this.messages = []; // Array of messages
        this.sessions = new Map(); // Token -> Session info
        this.friendships = new Map(); // UserID -> Set of friend IDs
        this.friendRequests = new Map(); // UserID -> Array of pending requests
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
    }

    // === GESTION DES MESSAGES ===
    createMessage(senderId, receiverId, content) {
        const message = {
            id: uuidv4(),
            senderId,
            receiverId,
            content: content.substring(0, 1000), // Limite de caractères
            timestamp: new Date(),
            edited: false,
            editedAt: null
        };
        
        this.messages.push(message);
        
        // Enrichir avec le nom de l'expéditeur
        const sender = this.findAccountById(senderId);
        return {
            ...message,
            senderName: sender ? sender.username : 'Utilisateur inconnu'
        };
    }

    getConversation(userId1, userId2) {
        const conversation = this.messages.filter(message => 
            (message.senderId === userId1 && message.receiverId === userId2) ||
            (message.senderId === userId2 && message.receiverId === userId1)
        );

        // Enrichir avec les noms des expéditeurs
        return conversation.map(message => {
            const sender = this.findAccountById(message.senderId);
            return {
                ...message,
                senderName: sender ? sender.username : 'Utilisateur inconnu'
            };
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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

    // === GESTION DES SESSIONS ===
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
        
        if (!account.isActive) {
            return res.status(401).json({ 
                success: false, 
                error: 'Compte désactivé' 
            });
        }
        
        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, account.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            });
        }
        
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
        
        console.log(`💬 Message: ${req.account.username} → ${receiver.username}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        
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

// === ROUTES DE DEBUG ET STATS ===

// Statistiques du serveur
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats: db.getStats(),
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// Route de test pour créer des comptes de démo
app.post('/api/demo/create-accounts', async (req, res) => {
    try {
        const demoAccounts = [
            { username: 'Joueur1', email: 'joueur1@demo.com', password: '123456' },
            { username: 'Joueur2', email: 'joueur2@demo.com', password: '123456' },
            { username: 'GameMaster', email: 'gm@demo.com', password: '123456' }
        ];
        
        const createdAccounts = [];
        
        for (const accountData of demoAccounts) {
            // Vérifier si le compte existe déjà
            if (!db.findAccountByEmail(accountData.email)) {
                const passwordHash = await bcrypt.hash(accountData.password, 12);
                const account = db.createAccount({
                    username: accountData.username,
                    email: accountData.email,
                    passwordHash
                });
                
                createdAccounts.push({
                    username: account.username,
                    email: account.email
                });
            }
        }
        
        res.json({
            success: true,
            message: `${createdAccounts.length} comptes de démo créés`,
            accounts: createdAccounts
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des comptes de démo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur' 
        });
    }
});

// === GESTION DES ERREURS ===
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Erreur interne du serveur' 
    });
});

// Route 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route non trouvée' 
    });
});

// === DÉMARRAGE DU SERVEUR ===
app.listen(PORT, () => {
    console.log(`🎮 GamerChat démarré sur http://localhost:${PORT}`);
    console.log(`🔐 Système d'authentification JWT activé`);
    console.log(`📊 Base de données en mémoire initialisée`);
    console.log(`🚀 Prêt à recevoir des connexions !`);
});

module.exports = app;

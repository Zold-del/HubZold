// Configuration sécurisée
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api'; // Pour la production

let currentUser = null;
let selectedUserId = null;
let authToken = null;
let messagesInterval = null;

// Variables WebSocket pour les appels en temps réel
let websocket = null;
let isWebSocketConnected = false;

// Variables système d'appel WebRTC
let currentCall = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let callTimer = null;
let callStartTime = null;
let isMuted = false;
let isVideoEnabled = false;

// Configuration WebRTC
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Cache des messages pour optimiser les performances
let messagesCache = new Map(); // conversationKey -> messages
let lastMessagesHash = new Map(); // conversationKey -> hash

// Initialisation sécurisée
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INITIALISATION APPLICATION SÉCURISÉE ===');
    
    // Sécurité : Nettoyer les données sensibles du localStorage au démarrage
    cleanupStorageData();
    
    checkAuthStatus();
    setupAuthInterface();
    setupEventListeners();
    setupContextMenu();
    setupUserProfile();
    setupFriendsSystem();
    setupCallSystem();
    
    // Initialiser le WebSocket dès le chargement si utilisateur connecté
    if (authToken && currentUser) {
        connectWebSocket();
    }
});

// Nettoyage sécurisé des données de stockage
function cleanupStorageData() {
    try {
        // Vérifier et nettoyer les données expirées
        const tokenStr = localStorage.getItem('authToken');
        if (tokenStr) {
            try {
                // Vérifier si le token n'est pas expiré (basique, côté client seulement)
                const tokenPayload = JSON.parse(atob(tokenStr.split('.')[1]));
                const now = Date.now() / 1000;
                if (tokenPayload.exp && tokenPayload.exp < now) {
                    console.log('🧹 Token expiré, nettoyage automatique');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                }
            } catch (e) {
                console.log('🧹 Token invalide, nettoyage automatique');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    }
}

// Vérifie l'état d'authentification de manière sécurisée
function checkAuthStatus() {
    console.log('🔐 Vérification de l\'état d\'authentification');
    
    authToken = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    
    if (authToken && userStr) {
        try {
            currentUser = JSON.parse(userStr);
            // Vérifier que l'utilisateur a bien les propriétés nécessaires
            if (currentUser && currentUser.id && currentUser.username) {
                console.log('✅ Utilisateur trouvé en local:', currentUser.username);
                // Vérifier le token côté serveur
                verifyTokenWithServer();
            } else {
                throw new Error('Données utilisateur incomplètes');
            }
        } catch (error) {
            console.log('❌ Données utilisateur corrompues, nettoyage');
            logout();
        }
    } else {
        console.log('📝 Aucune session trouvée, affichage de la connexion');
        showLoginScreen();
    }
}

// Vérification du token côté serveur
async function verifyTokenWithServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('✅ Token valide, affichage du chat');
                currentUser = result.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showChatScreen();
                return;
            }
        }
        
        console.log('❌ Token invalide, déconnexion');
        logout();
        
    } catch (error) {
        console.error('❌ Erreur vérification token:', error);
        logout();
    }
}

// Configuration de l'interface d'authentification
function setupAuthInterface() {
    console.log('=== CONFIGURATION INTERFACE AUTH ===');
    
    // Éléments de l'interface
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    console.log('Éléments trouvés:', {
        loginTab, registerTab, loginForm, registerForm, loginBtn, registerBtn
    });
    
    // Gestion des onglets
    if (loginTab && registerTab && loginForm && registerForm) {
        loginTab.addEventListener('click', () => {
            console.log('Onglet connexion cliqué');
            switchToLoginTab();
        });
        
        registerTab.addEventListener('click', () => {
            console.log('Onglet inscription cliqué');
            switchToRegisterTab();
        });
    }
    
    // Gestion des boutons de soumission
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Bouton connexion cliqué');
            handleLogin();
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Bouton inscription cliqué');
            handleRegister();
        });
    }
    
    // Gestion des touches Entrée
    const loginInputs = ['loginEmail', 'loginPassword'];
    loginInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin();
                }
            });
        }
    });
    
    const registerInputs = ['registerUsername', 'registerEmail', 'registerPassword'];
    registerInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRegister();
                }
            });
        }
    });
}

// Basculer vers l'onglet connexion
function switchToLoginTab() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginTab && registerTab && loginForm && registerForm) {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    }
}

// Basculer vers l'onglet inscription
function switchToRegisterTab() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginTab && registerTab && loginForm && registerForm) {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// Gérer la connexion
async function handleLogin() {
    console.log('=== DÉBUT CONNEXION ===');
    
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const messageDiv = document.getElementById('authMessage');
    
    if (!email || !password) {
        showAuthMessage('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = '🔄 Connexion...';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        console.log('Résultat connexion:', result);
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showAuthMessage('Connexion réussie !', 'success');
            setTimeout(() => {
                showChatScreen();
            }, 1000);
        } else {
            showAuthMessage(result.message || 'Erreur de connexion', 'error');
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        showAuthMessage('Erreur de connexion au serveur', 'error');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = '🚀 Se connecter';
        }
    }
}

// Gérer l'inscription
async function handleRegister() {
    console.log('=== DÉBUT INSCRIPTION ===');
    
    const username = document.getElementById('registerUsername')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    
    if (!username || !email || !password) {
        showAuthMessage('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = '🔄 Inscription...';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const result = await response.json();
        console.log('Résultat inscription:', result);
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showAuthMessage('Compte créé avec succès !', 'success');
            setTimeout(() => {
                showChatScreen();
            }, 1000);
        } else {
            showAuthMessage(result.message || 'Erreur lors de l\'inscription', 'error');
        }
    } catch (error) {
        console.error('Erreur inscription:', error);
        showAuthMessage('Erreur de connexion au serveur', 'error');
    } finally {
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = '✨ S\'inscrire';
        }
    }
}

// Système de notifications
function showNotification(message, type = 'info') {
    console.log(`📢 Notification [${type}]: ${message}`);
    
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles inline pour la notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        minWidth: '200px',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        opacity: '0'
    });
    
    // Couleurs selon le type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #00ff88, #00dd77)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #ff4757, #ff3742)';
            break;
        case 'info':
            notification.style.background = 'linear-gradient(135deg, #3742fa, #2f3542)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #747d8c, #57606f)';
    }
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Suppression automatique après 4 secondes
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Fonction pour afficher les messages d'authentification
function showAuthMessage(message, type = 'info') {
    const messageDiv = document.getElementById('authMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `auth-message ${type}`;
        messageDiv.style.display = 'block';
        
        // Masquer après 5 secondes
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback vers showNotification si l'élément n'existe pas
        showNotification(message, type);
    }
}

// Gestion des écrans
function showChatScreen() {
    console.log('=== AFFICHAGE ÉCRAN DE CHAT ===');
    
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    console.log('Login screen élément:', loginScreen);
    console.log('Chat screen élément:', chatScreen);
    
    // Vérifier que les éléments existent
    if (!loginScreen || !chatScreen) {
        console.error('ERREUR: Éléments manquants!');
        return;
    }
    
    // Méthode 1: Classes CSS
    loginScreen.className = 'screen';
    chatScreen.className = 'screen active';
    
    // Méthode 2: Styles directs (backup)
    loginScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    
    console.log('Classes et styles appliqués');
    console.log('Login screen classes:', loginScreen.className);
    console.log('Chat screen classes:', chatScreen.className);
    
    // Initialiser l'interface de chat
    try {        // Mettre à jour le profil utilisateur dans la sidebar
        if (typeof updateCurrentUserProfile === 'function') {
            updateCurrentUserProfile();
        }
          // Charger les amis
        if (typeof loadFriends === 'function') {
            loadFriends();
        }        // Charger les demandes d'amitié
        if (typeof loadFriendRequests === 'function') {
            loadFriendRequests();
        }
        
        // Forcer l'affichage de la section demandes d'amis (même vide)
        initializeFriendRequestsSection();
        
        // Démarrer le polling des messages
        if (typeof startMessagesPolling === 'function') {
            startMessagesPolling();
        }
          // Charger les utilisateurs
        if (typeof loadUsers === 'function') {
            loadUsers();
        }
        
        // Reconfigurer le système d'amis pour l'utilisateur connecté
        setupFriendsSystem();
          // Reconfigurer les event listeners pour le chat
        setupChatEventListeners();
          // Configurer le système d'appel
        setupCallSystem();
        
        // Connecter WebSocket pour les appels en temps réel
        connectWebSocket();
        
        console.log('=== ÉCRAN DE CHAT AFFICHÉ ET INITIALISÉ ===');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du chat:', error);
    }
}

function showLoginScreen() {
    console.log('=== AFFICHAGE ÉCRAN LOGIN ===');
    
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    if (loginScreen && chatScreen) {
        chatScreen.classList.remove('active');
        chatScreen.classList.add('hidden');
        loginScreen.classList.add('active');
        loginScreen.classList.remove('hidden');
        console.log('Écran de login affiché');
    }
    
    if (messagesInterval) {
        clearInterval(messagesInterval);
    }
}

// Configuration des événements
function setupEventListeners() {
    console.log('=== CONFIGURATION EVENT LISTENERS ===');
      // Bouton de déconnexion
    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('profileLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('✅ Event listener logout configuré');
    } else {
        console.log('⚠️ Bouton logout non trouvé');
    }
    
    // Bouton d'envoi de message
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎯 Bouton envoi cliqué');
            sendMessage();
        });
        console.log('✅ Event listener sendBtn configuré');
    } else {
        console.log('⚠️ Bouton sendBtn non trouvé');
    }
    
    // Champ de saisie de message
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('🎯 Touche Entrée pressée');
                sendMessage();
            }
        });
        console.log('✅ Event listener messageInput configuré');    } else {
        console.log('⚠️ Champ messageInput non trouvé');
    }
    
    // Initialiser le menu contextuel des profils
    if (typeof initProfileContextMenu === 'function') {
        initProfileContextMenu();
        console.log('✅ Menu contextuel des profils initialisé');
    }
}

// Fonction pour reconfigurer les event listeners après affichage du chat
function setupChatEventListeners() {
    console.log('=== CONFIGURATION EVENT LISTENERS CHAT ===');
    
    // Reconfigurer seulement les éléments du chat
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (sendBtn) {
        // Supprimer les anciens listeners en clonant l'élément
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        newSendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎯 Bouton envoi cliqué (reconfiguré)');
            sendMessage();
        });
        console.log('✅ Event listener sendBtn reconfiguré');
    }
    
    if (messageInput) {
        // Supprimer les anciens listeners en clonant l'élément
        const newMessageInput = messageInput.cloneNode(true);
        messageInput.parentNode.replaceChild(newMessageInput, messageInput);
        
        newMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('🎯 Touche Entrée pressée (reconfiguré)');
                sendMessage();
            }
        });
        console.log('✅ Event listener messageInput reconfiguré');
    }
}

// Fonction pour envoyer un message (corrigée et sécurisée)
async function sendMessage() {
    console.log('=== ENVOI MESSAGE SÉCURISÉ ===');
    
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !selectedUserId || !authToken) {
        console.error('❌ Impossible d\'envoyer le message: données manquantes');
        return;
    }
    
    const content = messageInput.value.trim();
    if (!content) {
        console.log('❌ Message vide');
        return;
    }
    
    console.log('📤 Envoi du message:', content.substring(0, 50) + '...');
    
    // Désactiver temporairement le bouton d'envoi
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                receiverId: selectedUserId,
                content: content
            })
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Message envoyé avec succès');
            
            // Vider le champ de saisie
            messageInput.value = '';
            
            // Mettre à jour la conversation localement
            const conversationKey = getConversationKey(currentUser.id, selectedUserId);
            const cachedMessages = messagesCache.get(conversationKey) || [];
            cachedMessages.push(result.message);
            messagesCache.set(conversationKey, cachedMessages);
            
            // Rafraîchir l'affichage
            displayMessages(cachedMessages, conversationKey);
            
        } else {
            throw new Error(result.error || 'Erreur lors de l\'envoi');
        }
        
    } catch (error) {
        console.error('❌ Erreur envoi message:', error);
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        // Réactiver le bouton d'envoi
        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }
}

// Gestion des utilisateurs
async function loadUsers() {
    console.log('=== CHARGEMENT AMIS ===');
    console.log('Auth token:', authToken ? 'Présent' : 'Manquant');
    console.log('Current user:', currentUser);
    
    if (!authToken) {
        console.error('Pas de token d\'authentification');
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<div class="no-users-message">Non connecté</div>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/friends`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.error('Token invalide, déconnexion nécessaire');
            logout();
            return;
        }
        
        if (!response.ok) {
            console.error('Erreur lors du chargement des amis:', response.status);
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '<div class="no-users-message">Erreur de connexion au serveur</div>';
            return;
        }
        
        const result = await response.json();
        console.log('Résultat serveur:', result);
        
        const friends = result.friends || [];
        
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        if (Array.isArray(friends) && friends.length > 0) {
            friends.forEach(friend => {
                const userElement = createUserElement(friend);
                usersList.appendChild(userElement);
            });
            
            console.log(`${friends.length} ami(s) chargé(s)`);
        } else {
            usersList.innerHTML = '<div class="no-users-message">Aucun ami ajouté<br><small>Utilisez la recherche pour ajouter des amis !</small></div>';
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des amis:', error);
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<div class="no-users-message">Erreur de connexion</div>';    }
}

function createUserElement(user) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = user.id;
    
    // Support des deux formats : nouveau (username/avatar) et ancien (name/picture)
    const userName = user.username || user.name || 'Utilisateur';
    const userAvatar = user.avatar || user.picture || '/img/default-avatar.png';
      div.innerHTML = `
        <img src="${userAvatar}" alt="${userName}" class="user-avatar">
        <div class="user-info">
            <div class="user-name">${userName}</div>
            <div class="user-status">En ligne</div>
        </div>
    `;
    
    div.addEventListener('click', () => selectUser(user.id, div, user));
    
    // Ajouter le menu contextuel
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showProfileContextMenu(e, user);
    });
    
    return div;
}

function selectUser(userId, element, userInfo) {
    // Retirer la sélection précédente
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
      // Sélectionner le nouvel utilisateur
    element.classList.add('active');
    selectedUserId = userId;
    
    // Réinitialiser le hash des messages pour forcer le rechargement
    lastMessagesHash = '';
    
    // Afficher l'en-tête de chat
    const chatHeader = document.getElementById('chatHeaderArea');
    const messageContainer = document.getElementById('messageInputContainer');
    const noChatSelected = document.getElementById('noChatSelected');
      chatHeader.classList.remove('hidden');
    messageContainer.classList.remove('hidden');
    
    const noChatElement = document.getElementById('noChatSelected');
    if (noChatElement) {
        noChatElement.classList.add('hidden');
    }
      // Mettre à jour les infos de l'utilisateur sélectionné
    const selectedUserName = userInfo.username || userInfo.name || 'Utilisateur';
    const selectedUserAvatar = userInfo.avatar || userInfo.picture || '/img/default-avatar.png';
    
    document.getElementById('selectedUserName').textContent = selectedUserName;
    document.getElementById('selectedUserAvatar').src = selectedUserAvatar;
    
    // Charger les messages
    loadMessages();
}

// Fonction pour charger les messages d'une conversation (améliorée)
async function loadMessages(userId = selectedUserId) {
    if (!userId || !authToken) {
        console.log('❌ Impossible de charger les messages: userId ou token manquant');
        return;
    }
    
    console.log('=== CHARGEMENT MESSAGES OPTIMISÉ ===');
    console.log('User ID:', userId);
    console.log('Current User:', currentUser?.username);
    
    const conversationKey = getConversationKey(currentUser.id, userId);
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ Erreur HTTP lors du chargement des messages:', response.status);
            if (response.status === 401 || response.status === 403) {
                logout();
            }
            return;
        }
        
        const result = await response.json();
        console.log('✅ Messages reçus:', result.messages?.length || 0, 'messages');
        
        if (result.success && result.messages) {
            // Mettre à jour le cache
            messagesCache.set(conversationKey, result.messages);
            displayMessages(result.messages, conversationKey);
        } else {
            console.log('❌ Échec du chargement des messages:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des messages:', error);
        showNotification('❌ Erreur lors du chargement des messages', 'error');
    }
}

// Fonction pour obtenir la clé de conversation
function getConversationKey(userId1, userId2) {
    return [userId1, userId2].sort().join('-');
}

// Fonction pour afficher les messages (corrigée et optimisée)
function displayMessages(messages, conversationKey) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) {
        console.error('❌ Container de messages introuvable');
        return;
    }
    
    // Vérifier si les messages ont changé pour éviter les re-rendus inutiles
    const messagesHash = JSON.stringify(messages.map(m => ({ id: m.id, content: m.content, timestamp: m.timestamp })));
    const lastHash = lastMessagesHash.get(conversationKey);
    
    if (messagesHash === lastHash) {
        console.log('📋 Messages identiques, pas de re-rendu');
        return;
    }
    
    lastMessagesHash.set(conversationKey, messagesHash);
    
    console.log('🎨 Affichage de', messages.length, 'messages');
    
    // Sauvegarder la position de scroll avant le re-rendu
    const wasAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 1;
    
    // Nettoyer le container
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="no-messages">
                <div class="no-messages-icon">💬</div>
                <p>Aucun message dans cette conversation</p>
                <p class="no-messages-help">Envoyez le premier message pour commencer !</p>
            </div>
        `;
        return;
    }
    
    // Créer les éléments de message
    messages.forEach((message, index) => {
        const messageElement = createMessageElement(message, index);
        messagesContainer.appendChild(messageElement);
    });
    
    // Gerer le scroll : aller en bas si on était déjà en bas, ou maintenir la position
    if (wasAtBottom) {
        scrollToBottom(messagesContainer);
    }
    
    console.log('✅ Messages affichés avec succès');
}

// Créer un élément de message (fonction séparée pour la lisibilité)
function createMessageElement(message, index) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.setAttribute('data-message-id', message.id);
    
    const isOwnMessage = currentUser && message.senderId === currentUser.id;
    messageElement.classList.add(isOwnMessage ? 'own-message' : 'other-message');
    
    // Formatage de l'heure
    const messageDate = new Date(message.timestamp);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    
    let timeFormat;
    if (isToday) {
        timeFormat = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeFormat = messageDate.toLocaleDateString() + ' ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Échapper le HTML pour éviter les injections XSS
    const safeContent = escapeHtml(message.content);
    const safeTimestamp = escapeHtml(timeFormat);
    
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${safeContent}</div>
            <div class="message-timestamp">${safeTimestamp}</div>
            ${message.edited ? '<div class="message-edited">✏️ modifié</div>' : ''}

        `;
    
    return messageElement;
}

// Fonction d'échappement HTML sécurisée
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Fonction pour scroller en bas avec animation fluide
function scrollToBottom(container) {
    if (!container) return;
    
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });
}

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mettre à jour le profil utilisateur en bas de la sidebar
function updateCurrentUserProfile() {
    if (!currentUser) {
        console.log('Pas d\'utilisateur pour mettre à jour le profil');
        return;
    }
    
    const userName = currentUser.username || currentUser.name || 'Utilisateur';
    const userAvatar = currentUser.avatar || currentUser.picture || '/img/default-avatar.png';
    
    console.log('Mise à jour du profil utilisateur:', userName);
    
    const profileSection = document.getElementById('userProfileSection');
    const currentUserAvatar = document.getElementById('currentUserAvatar');
    const currentUserName = document.getElementById('currentUserName');
    
    console.log('Profile section:', profileSection);
    console.log('Avatar élément:', currentUserAvatar);
    console.log('Name élément:', currentUserName);
    
    if (currentUserAvatar) {
        currentUserAvatar.src = userAvatar;
        console.log('Avatar mis à jour');
    }
    
    if (currentUserName) {
        currentUserName.textContent = userName;
        console.log('Nom mis à jour');
    }
    
    if (profileSection) {
        profileSection.style.display = 'flex';
        console.log('Section profil affichée');
    }
}

// Fonction pour éditer un message
async function editMessage(messageId, currentContent) {
    const newContent = prompt('Modifier le message:', currentContent);
    if (!newContent || newContent.trim() === '') return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ content: newContent.trim() })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('✅ Message modifié', 'success');
            loadMessages(selectedUserId);
        } else {
            showNotification('❌ Erreur modification', 'error');
        }
    } catch (error) {
        console.error('Erreur édition message:', error);
        showNotification('❌ Erreur connexion', 'error');
    }
}

// Fonction pour supprimer un message
async function deleteMessage(messageId) {
    if (!confirm('Supprimer ce message ?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('✅ Message supprimé', 'success');
            loadMessages(selectedUserId);
        } else {
            showNotification('❌ Erreur suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression message:', error);
        showNotification('❌ Erreur connexion', 'error');
    }
}

// Système de recherche d'amis
function setupFriendsSystem() {
    console.log('=== SETUP FRIENDS SYSTEM ===');
    
    const searchInput = document.getElementById('friendSearchInput');
    const searchBtn = document.getElementById('searchFriendBtn');
    
    console.log('Éléments trouvés:');
    console.log('- searchInput:', searchInput);
    console.log('- searchBtn:', searchBtn);
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchForFriend);
        console.log('✅ Event listener ajouté au bouton de recherche');
    } else {
        console.log('❌ Bouton de recherche non trouvé');
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('🎯 Touche Entrée pressée dans la recherche');
                searchForFriend();
            }
        });
        console.log('✅ Event listener ajouté au champ de recherche');
    } else {
        console.log('❌ Champ de recherche non trouvé');
    }
}

function searchForFriend() {
    console.log('=== RECHERCHE D\'AMI SÉCURISÉE ===');
    
    const searchInput = document.getElementById('friendSearchInput');
    const friendName = searchInput ? searchInput.value.trim() : '';
    
    if (!friendName) {
        showNotification('❌ Veuillez entrer un nom d\'utilisateur', 'error');
        return;
    }
    
    if (!currentUser || !authToken) {
        showNotification('❌ Vous devez être connecté', 'error');
        return;
    }
    
    // Validation du nom d'utilisateur côté client
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(friendName)) {
        showNotification('❌ Nom d\'utilisateur invalide (3-20 caractères, lettres, chiffres, _ et - uniquement)', 'error');
        return;
    }
    
    if (friendName.toLowerCase() === currentUser.username.toLowerCase()) {
        showNotification('❌ Vous ne pouvez pas vous ajouter vous-même !', 'error');
        return;
    }
    
    console.log('✅ Envoi demande d\'ami pour:', friendName);
    sendFriendRequest(friendName);
}

async function searchUserByUsername(username) {
    console.log('=== VÉRIFICATION EXISTENCE UTILISATEUR ===');
    console.log('Recherche de:', username);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/search/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error('Erreur HTTP:', response.status);
            showNotification(`❌ Erreur serveur: ${response.status}`, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('Résultat recherche:', result);
          if (result.success) {
            // Utilisateur trouvé, procéder à l'ajout d'ami
            console.log('✅ Utilisateur trouvé:', result.user);
            showNotification(`✅ Utilisateur "${result.user.username}" trouvé !`, 'success');
            
            // Attendre un peu puis envoyer la demande d'amitié
            setTimeout(() => {
                sendFriendRequest(result.user.username);
            }, 1000);
            
        } else {
            // Utilisateur non trouvé ou erreur
            if (result.error === 'user_not_found') {
                showNotification(`❌ Utilisateur "${username}" non trouvé`, 'error');
            } else if (result.error === 'self_search') {
                showNotification('❌ Vous ne pouvez pas vous ajouter vous-même !', 'error');
            } else {
                showNotification(`❌ ${result.message || result.error}`, 'error');
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la recherche:', error);
        showNotification('❌ Erreur de connexion au serveur', 'error');
    }
}

async function sendFriendRequest(friendName) {
    console.log('=== ENVOI DEMANDE D\'AMITIÉ ===');
    console.log('Envoi demande pour:', friendName);
    
    // Désactiver le bouton de recherche temporairement
    const searchBtn = document.getElementById('searchFriendBtn');
    const searchInput = document.getElementById('friendSearchInput');
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = '🔄';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                username: friendName
            })
        });
        
        const result = await response.json();
        console.log('Résultat demande d\'ami:', result);
        
        if (result.success) {
            showNotification(`✅ ${result.message}`, 'success');
            if (searchInput) searchInput.value = '';
        } else {
            showNotification(`❌ ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Erreur demande d\'ami:', error);
        showNotification('❌ Erreur lors de l\'envoi de la demande', 'error');
    } finally {
        // Réactiver le bouton
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = '🔎';
        }
    }
}

async function loadFriends() {
    if (!currentUser || !authToken) return;
    
    console.log('=== CHARGEMENT LISTE D\'AMIS ===');
    
    try {
        const response = await fetch(`${API_BASE_URL}/friends`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error('Erreur HTTP:', response.status);
            return;
        }
        
        const result = await response.json();
        console.log('Liste d\'amis:', result);
        
        if (result.success) {
            // Stocker la liste des amis pour usage futur
            window.friendsList = result.friends || [];
            console.log(`✅ ${window.friendsList.length} ami(s) chargé(s)`);
        }
        
    } catch (error) {        console.error('❌ Erreur lors du chargement des amis:', error);
    }
}

function displayFriendRequests(requests) {
    console.log('[DEBUG] displayFriendRequests appelée avec:', requests);
    const container = document.getElementById('friendRequestsSection');
    const list = document.getElementById('friendRequestsList');
    
    console.log('[DEBUG] Container:', container);
    console.log('[DEBUG] List:', list);
    
    if (!container || !list) {
        console.error('[DEBUG] Éléments HTML manquants pour les demandes d\'amis');
        return;
    }
      if (!requests || requests.length === 0) {
        console.log('[DEBUG] Aucune demande, affichage message vide');
        container.style.display = 'block';
        list.innerHTML = '<div style="padding: 10px; color: #888; font-style: italic;">Aucune demande d\'amitié</div>';
        return;
    }
    
    console.log('[DEBUG] Affichage de', requests.length, 'demandes');
    container.style.display = 'block';
    list.innerHTML = '';
    
    requests.forEach(req => {
        const item = document.createElement('div');
        item.className = 'friend-request';
        item.innerHTML = `
            <div class="friend-request-info">
                <img src="${req.fromUserAvatar || '/img/default-avatar.png'}" alt="${req.fromUserName}">
                <span class="friend-request-name">${req.fromUserName}</span>
            </div>
            <div class="friend-request-actions">
                <button class="friend-request-btn accept" title="Accepter" onclick="respondToFriendRequest('${req.id}', 'accept')">✓</button>
                <button class="friend-request-btn decline" title="Refuser" onclick="respondToFriendRequest('${req.id}', 'decline')">✗</button>
            </div>
        `;
        list.appendChild(item);
    });
    
    console.log('[DEBUG] Demandes affichées dans le DOM');
}

async function loadFriendRequests() {
    console.log('[DEBUG] === CHARGEMENT DEMANDES D\'AMITIÉ ===');
    console.log('[DEBUG] currentUser:', currentUser);
    console.log('[DEBUG] authToken:', authToken ? 'Present' : 'Missing');
    
    if (!currentUser || !authToken) {
        console.log('[DEBUG] Pas de currentUser ou authToken, abandon');
        return;
    }
    
    try {
        console.log('[DEBUG] Appel API /friends/requests...');
        const response = await fetch(`${API_BASE_URL}/friends/requests`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[DEBUG] Réponse API status:', response.status);
        
        if (!response.ok) {
            console.error('[DEBUG] Erreur HTTP:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('[DEBUG] Données reçues:', data);
        
        if (data.success) {
            displayFriendRequests(data.requests || []);
        } else {
            console.log('[DEBUG] API success=false');
            displayFriendRequests([]);
        }
    } catch (e) {
        console.error('[DEBUG] Erreur lors du chargement:', e);
        displayFriendRequests([]);
    }
}

async function respondToFriendRequest(requestId, action) {
    if (!currentUser || !authToken) return;
    
    console.log('=== RÉPONSE DEMANDE D\'AMITIÉ ===', requestId, action);
    
    try {
        const response = await fetch(`${API_BASE_URL}/friends/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ requestId, action })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Réponse acceptation/refus:', result);
            
            // Recharger les demandes et les amis
            await loadFriendRequests();
            await loadUsers(); // Recharger la liste des amis dans l'interface
            
            if (action === 'accept') {
                showNotification('✅ Demande d\'ami acceptée', 'success');
            } else {
                showNotification('❌ Demande d\'ami refusée', 'info');
            }
        }
    } catch (error) {
        console.error('Erreur lors de la réponse:', error);
        showNotification('❌ Erreur lors de la réponse', 'error');
    }
}

// === CONNEXION WEBSOCKET POUR TEMPS RÉEL ===

// Connexion WebSocket sécurisée
function connectWebSocket() {
    if (!authToken || !currentUser) {
        console.log('❌ Impossible de connecter WebSocket: pas d\'authentification');
        return;    }
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log('✅ WebSocket déjà connecté');
        return;
    }
    
    console.log('🔌 Connexion WebSocket...');
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}`;
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = function() {
            console.log('✅ WebSocket connecté');
            isWebSocketConnected = true;
            
            // Authentification WebSocket
            websocket.send(JSON.stringify({
                type: 'auth',
                token: authToken,
                userId: currentUser.id
            }));
        };
        
        websocket.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (error) {
                console.error('❌ Erreur parsing message WebSocket:', error);
            }
        };
        
        websocket.onclose = function(event) {
            console.log('🔌 WebSocket fermé:', event.code, event.reason);
            isWebSocketConnected = false;
            websocket = null;
            
            // Reconnexion automatique après 3 secondes
            if (authToken && currentUser) {
                setTimeout(() => {
                    console.log('🔄 Tentative de reconnexion WebSocket...');
                    connectWebSocket();
                }, 3000);
            }
        };
        
        websocket.onerror = function(error) {
            console.error('❌ Erreur WebSocket:', error);
            isWebSocketConnected = false;
        };
        
    } catch (error) {
        console.error('❌ Erreur création WebSocket:', error);
    }
}

// Gestion des messages WebSocket
function handleWebSocketMessage(message) {
    console.log('📨 Message WebSocket reçu:', message);
    
    switch (message.type) {
        case 'auth_success':
            console.log('✅ Authentification WebSocket réussie');
            break;
            
        case 'auth_error':
            console.error('❌ Erreur authentification WebSocket:', message.error);
            break;
            
        case 'friend_request':
            console.log('👥 Nouvelle demande d\'ami reçue:', message.data);
            handleFriendRequest(message.data);
            break;
            
        case 'friend_request_accepted':
            console.log('✅ Demande d\'ami acceptée:', message.data);
            showNotification('Demande d\'ami acceptée!', 'success');
            loadFriendsList();
            break;
            
        case 'friend_request_declined':
            console.log('❌ Demande d\'ami refusée:', message.data);
            showNotification('Demande d\'ami refusée', 'info');
            break;
            
        case 'new_message':
            console.log('💬 Nouveau message reçu:', message.data);
            handleNewMessage(message.data);
            break;
            
        case 'call_offer':
            console.log('📞 Offre d\'appel reçue:', message.data);
            handleCallOffer(message.data);
            break;
            
        case 'call_answer':
            console.log('📞 Réponse d\'appel reçue:', message.data);
            handleCallAnswer(message.data);
            break;
            
        case 'call_ice_candidate':
            console.log('🧊 ICE candidate reçu:', message.data);
            handleIceCandidate(message.data);
            break;
            
        case 'call_ended':
            console.log('📞 Appel terminé:', message.data);
            handleCallEnded(message.data);
            break;
            
        default:
            console.log('❓ Type de message WebSocket non géré:', message.type);
    }
}

// Gestion des nouvelles demandes d'amis
function handleFriendRequest(requestData) {
    console.log('👥 Traitement demande d\'ami:', requestData);
    
    // Afficher une notification
    showNotification(`Nouvelle demande d'ami de ${requestData.username}`, 'info');
    
    // Recharger la liste des demandes d'amis
    loadFriendRequests();
    
    // S'assurer que la section est visible
    initializeFriendRequestsSection();
}

// Gestion des nouveaux messages en temps réel
function handleNewMessage(messageData) {
    console.log('💬 Nouveau message reçu:', messageData);
    
    // Si l'utilisateur est dans la conversation concernée, afficher le message
    if (selectedUserId && 
        (messageData.senderId === selectedUserId || messageData.receiverId === selectedUserId)) {
        
        // Ajouter le message au cache
        const conversationKey = getConversationKey(currentUser.id, selectedUserId);
        if (!messagesCache.has(conversationKey)) {
            messagesCache.set(conversationKey, []);
        }
        messagesCache.get(conversationKey).push(messageData);
        
        // Rafraîchir l'affichage de toute la conversation
        displayMessages(messagesCache.get(conversationKey), conversationKey);
        
        // Faire défiler vers le bas
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    // Mettre à jour les indicateurs de nouveaux messages
    if (typeof updateUnreadIndicators === 'function') {
        updateUnreadIndicators();
    }
}
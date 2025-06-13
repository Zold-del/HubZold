// Configuration
const API_BASE_URL = 'http://localhost:3001/api'; // Changé de 3000 à 3001
let currentUser = null;
let selectedUserId = null;
let messagesInterval = null;
let isDevelopmentMode = true; // Mode développement activé par défaut

// Variable pour suivre le message en cours d'édition
let currentEditingMessage = null;

// Variables pour le système d'amis
let friendRequests = [];
let sentRequests = [];

// Variables pour l'authentification
let authToken = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();    if (isDevelopmentMode) {
        setupDevelopmentMode();
    }
    
    setupContextMenu();
    setupUserProfile();
    setupFriendsSystem();
    setupAuth();
});

// Mode développement
function setupDevelopmentMode() {
    console.log('=== CONFIGURATION MODE DÉVELOPPEMENT ===');
    
    const devLoginBtn = document.getElementById('devLoginBtn');
    const devUsername = document.getElementById('devUsername');
    
    console.log('Bouton trouvé:', devLoginBtn);
    console.log('Input trouvé:', devUsername);
    
    if (devLoginBtn) {
        devLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clic sur le bouton de connexion');
            devLogin();
        });
        console.log('Event listener ajouté au bouton');
    } else {
        console.error('Bouton devLoginBtn non trouvé !');
    }
    
    if (devUsername) {
        devUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('Touche Entrée pressée');
                devLogin();
            }
        });
        console.log('Event listener ajouté à l\'input');
    } else {
        console.error('Input devUsername non trouvé !');
    }
}

// Test simple pour vérifier que le bouton fonctionne
function testButton() {
    console.log('Test du bouton - CLIC DÉTECTÉ !');
    alert('Le bouton fonctionne !');
}

// Ajouter un event listener de test
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== TEST DU BOUTON ===');
    
    // Attendre un peu que la page soit complètement chargée
    setTimeout(() => {
        const btn = document.getElementById('devLoginBtn');
        console.log('Bouton trouvé:', btn);
        
        if (btn) {
            // Ajouter un event listener de test
            btn.addEventListener('click', testButton);
            console.log('Event listener de test ajouté');
            
            // Essayer aussi avec onclick direct
            btn.onclick = function() {
                console.log('Onclick direct déclenché');
                devLogin();
            };
        } else {
            console.error('ERREUR: Bouton devLoginBtn introuvable !');
            // Lister tous les boutons disponibles
            const allButtons = document.querySelectorAll('button');
            console.log('Boutons trouvés:', allButtons);
        }
    }, 100);
});

function devLogin() {
    console.log('=== DÉBUT CONNEXION ===');
    
    const username = document.getElementById('devUsername').value.trim();
    console.log('Nom d\'utilisateur saisi:', username);
    
    if (!username) {
        alert('Veuillez entrer un nom de joueur');
        return;
    }
    
    // Créer un ID unique basé sur le nom d'utilisateur
    const userId = 'dev_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Créer un utilisateur temporaire
    currentUser = {
        id: userId,
        name: username,
        email: username + '@dev.local',
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    };
    
    console.log('Utilisateur créé:', currentUser);
    
    try {
        // Enregistrer l'utilisateur sur le serveur
        registerUser(currentUser);
        
        // Afficher l'interface de chat
        showChatScreen();
        
    // Mettre à jour le profil utilisateur
    updateCurrentUserProfile();
    
    // Charger les demandes d'amitié
    loadFriendRequests();
    
    // Démarrer le pollingimmédiatement
        startMessagesPolling();
        
        console.log('=== CONNEXION RÉUSSIE ===');
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        alert('Erreur lors de la connexion. Vérifiez la console.');
    }
}

// Gestion de l'authentification Google
function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    
    currentUser = {
        id: responsePayload.sub,
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture
    };
    
    // Enregistrer l'utilisateur sur le serveur
    registerUser(currentUser);
    
    // Afficher l'interface de chat
    showChatScreen();
}

function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Gestion des écrans
function showChatScreen() {
    console.log('=== AFFICHAGE ÉCRAN DE CHAT ===');
    
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    console.log('Login screen élément:', loginScreen);
    console.log('Chat screen élément:', chatScreen);
    
    // Vérifier que les éléments existent
    if (!loginScreen) {
        console.error('ERREUR: loginScreen introuvable !');
        return;
    }
    
    if (!chatScreen) {
        console.error('ERREUR: chatScreen introuvable !');
        return;
    }
    
    // Cacher l'écran de connexion
    loginScreen.classList.add('hidden');
    loginScreen.style.display = 'none';
    console.log('Login screen caché');
    
    // Afficher l'écran de chat
    chatScreen.classList.remove('hidden');
    chatScreen.style.display = 'flex';
    console.log('Chat screen affiché');
    
    // Vérifier que le chat container existe
    const chatContainer = document.querySelector('.chat-container');
    console.log('Chat container:', chatContainer);
    
    if (chatContainer) {
        chatContainer.style.display = 'flex';
        console.log('Chat container affiché');
    }
    
    // Charger les utilisateurs
    loadUsers();
    
    console.log('=== ÉCRAN DE CHAT AFFICHÉ ===');
}

function showLoginScreen() {
    document.getElementById('chatScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    
    if (messagesInterval) {
        clearInterval(messagesInterval);
    }
}

// Configuration des événements
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Gestion des utilisateurs
async function registerUser(user) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
        });
        
        const result = await response.json();
        
        // Mettre à jour l'ID utilisateur si le serveur en retourne un différent
        if (result.userId && result.userId !== user.id) {
            currentUser.id = result.userId;
        }
        
        return result;
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const users = await response.json();
        
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
          users.forEach(user => {
            if (user.id !== currentUser.id) {
                const userElement = createUserElement(user);
                usersList.appendChild(userElement);
            }
        });
          // Afficher un message si aucun utilisateur n'est en ligne
        if (users.filter(u => u.id !== currentUser.id).length === 0) {
            usersList.innerHTML = '<div class="no-users-message">Aucun autre joueur en ligne</div>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
}

function createUserElement(user) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.dataset.userId = user.id;
    div.innerHTML = `
        <img src="${user.picture}" alt="${user.name}" class="user-avatar">
        <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-status">En ligne</div>
        </div>
    `;
    
    div.addEventListener('click', () => selectUser(user.id, div, user));
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
    document.getElementById('selectedUserName').textContent = userInfo.name;
    document.getElementById('selectedUserAvatar').src = userInfo.picture;
    
    // Charger les messages
    loadMessages();
}

// Mettre à jour le profil utilisateur en bas de la sidebar
function updateCurrentUserProfile() {
    if (!currentUser) {
        console.log('Pas d\'utilisateur pour mettre à jour le profil');
        return;
    }
    
    console.log('Mise à jour du profil utilisateur:', currentUser.name);
    
    const profileSection = document.getElementById('userProfileSection');
    const currentUserAvatar = document.getElementById('currentUserAvatar');
    const currentUserName = document.getElementById('currentUserName');
    
    console.log('Profile section:', profileSection);
    console.log('Avatar élément:', currentUserAvatar);
    console.log('Name élément:', currentUserName);
    
    if (currentUserAvatar && currentUser.picture) {
        currentUserAvatar.src = currentUser.picture;
        console.log('Avatar mis à jour');
    }
    
    if (currentUserName && currentUser.name) {
        currentUserName.textContent = currentUser.name;
        console.log('Nom mis à jour');
    }
    
    if (profileSection) {
        profileSection.style.display = 'flex';
        console.log('Section profil affichée');
    }
}

// Système de recherche d'amis
function setupFriendsSystem() {
    const searchInput = document.getElementById('friendSearchInput');
    const searchBtn = document.getElementById('searchFriendBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchForFriend);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchForFriend();
            }
        });
    }
}

function searchForFriend() {
    const searchInput = document.getElementById('friendSearchInput');
    const friendName = searchInput.value.trim();
    
    console.log('=== TEST API D\'ABORD ===');
    
    // Test simple de l'API d'abord
    fetch(`${API_BASE_URL}/test`)
        .then(response => {
            console.log('Test API response status:', response.status);
            return response.json();
        })
        .then(result => {
            console.log('Test API result:', result);
            
            // Si l'API fonctionne, procéder à la recherche d'ami
            if (result.success) {
                proceedWithFriendSearch(friendName);
            }
        })
        .catch(error => {
            console.error('Test API failed:', error);
            showNotification('❌ Serveur non accessible', 'error');
        });
}

function proceedWithFriendSearch(friendName) {
    if (!friendName) {
        alert('Veuillez entrer un nom d\'ami à rechercher');
        return;
    }
    
    if (!currentUser) {
        alert('Vous devez être connecté pour rechercher des amis');
        return;
    }
    
    if (friendName.toLowerCase() === currentUser.name.toLowerCase()) {
        alert('Vous ne pouvez pas vous ajouter vous-même !');
        return;
    }
    
    console.log('Recherche d\'ami:', friendName);
    sendFriendRequest(friendName);
}

async function sendFriendRequest(friendName) {
    console.log('=== ENVOI DEMANDE D\'AMITIÉ ===');
    console.log('URL:', `${API_BASE_URL}/friends/request`);
    console.log('Données:', { fromUserId: currentUser.id, fromUserName: currentUser.name, toUserName: friendName });
    
    try {
        const response = await fetch(`${API_BASE_URL}/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fromUserId: currentUser.id,
                fromUserName: currentUser.name,
                toUserName: friendName
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            console.error('Erreur HTTP:', response.status);
            const errorText = await response.text();
            console.error('Erreur texte:', errorText);
            showNotification(`❌ Erreur serveur: ${response.status}`, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('Résultat:', result);
        
        if (result.success) {
            document.getElementById('friendSearchInput').value = '';
            
            if (result.message === 'request_sent') {
                showNotification(`✅ Demande d'amitié envoyée à ${friendName}`, 'success');
            } else if (result.message === 'already_sent') {
                showNotification(`⏳ Demande déjà envoyée à ${friendName}`, 'info');
            } else if (result.message === 'user_not_found') {
                showNotification(`❌ Utilisateur "${friendName}" non trouvé`, 'error');
            }
            
            loadFriendRequests();
        } else {
            showNotification(`❌ Erreur: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la demande:', error);
        showNotification('❌ Erreur de connexion', 'error');
    }
}

async function loadFriendRequests() {
    if (!currentUser) return;
    
    console.log('=== CHARGEMENT DEMANDES D\'AMITIÉ ===');
    console.log('URL:', `${API_BASE_URL}/friends/requests/${currentUser.id}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/friends/requests/${currentUser.id}`);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error('Erreur HTTP:', response.status);
            return;
        }
        
        const result = await response.json();
        console.log('Demandes reçues:', result);
        
        if (result.success) {
            friendRequests = result.received || [];
            sentRequests = result.sent || [];
            displayFriendRequests();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error);
    }
}

function displayFriendRequests() {
    const container = document.getElementById('friendRequestsContainer');
    
    if (friendRequests.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = '';
    
    friendRequests.forEach(request => {
        const requestElement = createFriendRequestElement(request);
        container.appendChild(requestElement);
    });
}

function createFriendRequestElement(request) {
    const div = document.createElement('div');
    div.className = 'friend-request-item';
    
    div.innerHTML = `
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${request.fromUserName}" 
             alt="Avatar" class="friend-request-avatar">
        <div class="friend-request-info">
            <div class="friend-request-name">${request.fromUserName}</div>
            <div class="friend-request-status">Demande d'amitié</div>
        </div>
        <div class="friend-request-actions">
            <button class="friend-action-btn accept" onclick="respondToFriendRequest('${request.id}', 'accept')">
                ✅ Accepter
            </button>
            <button class="friend-action-btn decline" onclick="respondToFriendRequest('${request.id}', 'decline')">
                ❌ Refuser
            </button>
        </div>
    `;
    
    return div;
}

async function respondToFriendRequest(requestId, action) {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestId: requestId,
                action: action,
                userId: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (action === 'accept') {
                showNotification('✅ Demande d\'amitié acceptée !', 'success');
            } else {
                showNotification('❌ Demande d\'amitié refusée', 'info');
            }
            
            loadFriendRequests();
            loadUsers(); // Recharger la liste des utilisateurs
        } else {
            showNotification(`❌ Erreur: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la réponse:', error);
        showNotification('❌ Erreur de connexion', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#3ba55c' : type === 'error' ? '#ed4245' : '#5865f2'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Gestion des messages
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content || !selectedUserId || !currentUser) {
        return;
    }
    
    // Désactiver temporairement le bouton d'envoi
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                senderId: currentUser.id,
                receiverId: selectedUserId,
                content: content
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
          if (result.success) {
            messageInput.value = '';
            // Forcer le rechargement des messages en réinitialisant le hash
            lastMessagesHash = '';
            await loadMessages();
        } else {
            console.error('Erreur lors de l\'envoi:', result.error);
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        alert('Erreur lors de l\'envoi du message. Vérifiez que le serveur fonctionne.');
    } finally {
        // Réactiver le bouton d'envoi
        sendBtn.disabled = false;
    }
}

let lastMessagesHash = '';

async function loadMessages() {
    if (!selectedUserId || !currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${currentUser.id}/${selectedUserId}`);
        
        if (!response.ok) {
            console.error('Erreur lors du chargement des messages:', response.status);
            return;
        }
        
        const messages = await response.json();
        
        // Créer un hash des messages pour détecter les changements
        const messagesHash = JSON.stringify(messages.map(m => ({id: m.id, content: m.content, timestamp: m.timestamp})));
        
        // Ne pas recharger si les messages n'ont pas changé
        if (messagesHash === lastMessagesHash) {
            return;
        }
        
        lastMessagesHash = messagesHash;
        
        const chatMessages = document.getElementById('chatMessages');
        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 5;
        
        chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="no-messages">
                    <p>💬 Commencez la conversation !</p>
                    <p class="no-chat-helper">Envoyez votre premier message ci-dessous</p>
                </div>
            `;
        } else {
            messages.forEach(message => {
                const messageElement = createMessageElement(message);
                chatMessages.appendChild(messageElement);
            });
        }
        
        // Faire défiler vers le bas seulement si l'utilisateur était déjà en bas
        if (isScrolledToBottom) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 50);
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
    }
}

function createMessageElement(message) {
    const div = document.createElement('div');
    const isOwn = message.senderId === currentUser.id;
    div.className = `message ${isOwn ? 'own' : 'other'}`;
    
    // Ajouter un ID unique pour éviter les doublons
    div.dataset.messageId = message.id;
    div.dataset.messageContent = message.content;
    div.dataset.senderId = message.senderId;
    
    const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
      div.innerHTML = `
        <div class="message-header">${isOwn ? 'Vous' : message.senderName} • ${time}${message.edited ? ' • (modifié)' : ''}</div>
        <div class="message-content">${escapeHtml(message.content)}</div>
    `;
      // Ajouter l'événement de clic droit seulement pour les messages de l'utilisateur
    if (isOwn) {
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Passer toutes les données du message, pas seulement l'objet message
            const messageData = {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderName: message.senderName,
                timestamp: message.timestamp
            };
            showContextMenu(e, messageData);
        });
    }
    
    return div;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Polling des messages
function startMessagesPolling() {
    if (messagesInterval) {
        clearInterval(messagesInterval);
    }
    
    messagesInterval = setInterval(() => {
        if (selectedUserId && currentUser) {
            loadMessages();
        }
        loadUsers(); // Actualiser la liste des utilisateurs
    }, 1000); // Réduit à 1 seconde pour une meilleure réactivité
}

// Déconnexion
function logout() {
    console.log('=== DÉCONNEXION ===');
    
    // Arrêter le polling
    if (messagesInterval) {
        clearInterval(messagesInterval);
        messagesInterval = null;
    }
    
    // Réinitialiser les variables
    currentUser = null;
    selectedUserId = null;
    lastMessagesHash = '';
    currentEditingMessage = null;
    
    // Cacher le profil utilisateur
    const profileSection = document.getElementById('userProfileSection');
    if (profileSection) {
        profileSection.style.display = 'none';
    }
    
    // Réinitialiser l'application
    initializeApp();
    
    // Réinitialiser les champs de connexion
    const devUsername = document.getElementById('devUsername');
    if (devUsername) {
        devUsername.value = '';
        devUsername.focus();
    }
    
    // Déconnexion de l'authentification
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    console.log('=== DÉCONNEXION TERMINÉE ===');
}

// Vérification du statut d'authentification
function checkAuthStatus() {
    // Ici vous pouvez ajouter une logique pour maintenir la session
    // Pour cette démo, on affiche toujours l'écran de connexion
}

// Configuration Google Sign-In
window.onload = function () {
    if (!isDevelopmentMode && typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "YOUR_GOOGLE_CLIENT_ID", // Remplacez par votre vrai client ID
            callback: handleCredentialResponse
        });
    }
};

// Fonction pour basculer entre mode dev et production
function toggleGoogleAuth() {
    isDevelopmentMode = false;
    document.querySelector('.dev-login').style.display = 'none';
    document.querySelector('.google-login').classList.add('active');
    document.querySelector('.dev-note').style.display = 'none';
}

// Fonction pour supprimer tous les utilisateurs (mode développement)
async function clearAllUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/clear`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Tous les utilisateurs ont été supprimés');
            
            // Recharger la liste des utilisateurs
            loadUsers();
            
            // Réinitialiser l'interface
            selectedUserId = null;
            const chatHeader = document.getElementById('chatHeaderArea');
            const messageContainer = document.getElementById('messageInputContainer');
            const noChatSelected = document.getElementById('noChatSelected');
            
            chatHeader.classList.add('hidden');
            messageContainer.classList.add('hidden');
            if (noChatSelected) {
                noChatSelected.classList.remove('hidden');
            }
            
            // Vider la zone de messages
            document.getElementById('chatMessages').innerHTML = `
                <div class="no-chat-selected" id="noChatSelected">
                    <div class="icon">💬</div>
                    <p>Sélectionnez un joueur pour commencer une conversation</p>
                    <p class="no-chat-helper">Cliquez sur un profil à gauche pour démarrer le chat</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur lors de la suppression des utilisateurs:', error);
    }
}

// Ajouter la fonction au contexte global pour l'utiliser dans la console
window.clearAllUsers = clearAllUsers;

// Gestion du menu contextuel
function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    const editBtn = document.getElementById('editMessage');
    const deleteBtn = document.getElementById('deleteMessage');
    const editModal = document.getElementById('editModal');
    const editInput = document.getElementById('editInput');
    const saveBtn = document.getElementById('saveEdit');
    const cancelBtn = document.getElementById('cancelEdit');
    
    // Fermer le menu contextuel en cliquant ailleurs
    document.addEventListener('click', () => {
        hideContextMenu();
    });    // Éditer le message
    editBtn.addEventListener('click', () => {
        console.log('=== BOUTON ÉDITER CLIQUÉ ===');
        console.log('currentEditingMessage:', currentEditingMessage);
        
        if (currentEditingMessage && currentEditingMessage.content) {
            console.log('Ouverture du modal avec contenu:', currentEditingMessage.content);
            editInput.value = currentEditingMessage.content;
            showEditModal();
        } else {
            console.error('Message invalide pour édition:', currentEditingMessage);
            alert('Erreur: impossible de charger le contenu du message');
        }
        
        hideContextMenu();
    });
    
    // Supprimer le message
    deleteBtn.addEventListener('click', () => {
        if (currentEditingMessage && confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
            deleteMessage(currentEditingMessage.id);
        }
        hideContextMenu();
    });    // Sauvegarder l'édition
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        console.log('=== DÉBUT SAUVEGARDE ===');
        console.log('currentEditingMessage au moment du clic:', currentEditingMessage);
        
        const newContent = editInput.value.trim();
        console.log('Contenu à sauvegarder:', newContent);
        
        if (!newContent) {
            alert('Le message ne peut pas être vide');
            return;
        }
        
        if (!currentEditingMessage || !currentEditingMessage.id) {
            console.error('Message non valide:', currentEditingMessage);
            alert('Erreur: message non sélectionné ou ID manquant');
            return;
        }
        
        // Désactiver le bouton pendant la sauvegarde
        saveBtn.disabled = true;
        saveBtn.textContent = '💾 Sauvegarde...';
        
        try {
            console.log('Appel de editMessage avec ID:', currentEditingMessage.id);
            await editMessage(currentEditingMessage.id, newContent);
            hideEditModal();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        } finally {
            // Réactiver le bouton
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Sauvegarder';
        }
        
        console.log('=== FIN SAUVEGARDE ===');
    });
    
    // Annuler l'édition
    cancelBtn.addEventListener('click', () => {
        hideEditModal();
    });
    
    // Fermer le modal en cliquant sur l'arrière-plan
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            hideEditModal();
        }
    });
    
    // Envoyer avec Entrée dans le modal (Ctrl+Entrée pour nouvelle ligne)
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            saveBtn.click();
        }
    });
}

function showContextMenu(event, message) {
    const contextMenu = document.getElementById('contextMenu');
    
    // S'assurer que currentEditingMessage est bien défini
    currentEditingMessage = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName || 'Utilisateur',
        timestamp: message.timestamp
    };
    
    console.log('Menu contextuel pour message:', currentEditingMessage); // Debug
    
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.classList.add('show');
    
    // Ajuster la position si le menu dépasse l'écran
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = (event.pageX - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = (event.pageY - rect.height) + 'px';
    }
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.classList.remove('show');
    // Ne pas réinitialiser currentEditingMessage ici pour garder la référence
    console.log('Menu contextuel fermé, message toujours en mémoire:', currentEditingMessage?.id);
}

function showEditModal() {
    const editModal = document.getElementById('editModal');
    const editInput = document.getElementById('editInput');
    
    console.log('Ouverture du modal d\'édition'); // Debug
    
    editModal.classList.add('show');
    
    // Focus sur l'input après un délai pour l'animation
    setTimeout(() => {
        editInput.focus();
        editInput.select(); // Sélectionner tout le texte
    }, 100);
}

function hideEditModal() {
    const editModal = document.getElementById('editModal');
    editModal.classList.remove('show');
    
    console.log('Fermeture du modal d\'édition'); // Debug
    
    // Ne pas réinitialiser currentEditingMessage ici pour garder la référence
    // currentEditingMessage = null;
}

// API pour éditer un message
async function editMessage(messageId, newContent) {
    try {
        console.log('Édition du message:', messageId, newContent); // Debug
        
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: newContent,
                userId: currentUser.id
            })
        });
        
        const result = await response.json();
        console.log('Réponse édition:', result); // Debug
          if (response.ok && result.success) {
            // Forcer le rechargement des messages
            lastMessagesHash = '';
            await loadMessages();
            console.log('Message édité avec succès');
            
            // Réinitialiser currentEditingMessage après succès
            currentEditingMessage = null;
        } else {
            console.error('Erreur serveur:', result.error);
            alert('Erreur lors de la modification du message: ' + (result.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        alert('Erreur lors de la modification du message');
    }
}

// API pour supprimer un message
async function deleteMessage(messageId) {
    try {
        console.log('Suppression du message:', messageId); // Debug
        
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });
        
        const result = await response.json();
        console.log('Réponse suppression:', result); // Debug
        
        if (response.ok && result.success) {
            // Forcer le rechargement des messages
            lastMessagesHash = '';
            await loadMessages();
            console.log('Message supprimé avec succès');
        } else {
            console.error('Erreur serveur:', result.error);
            alert('Erreur lors de la suppression du message: ' + (result.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du message');
    }
}

// Configuration du profil utilisateur
function setupUserProfile() {
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                logout();
            }
        });
    }
}

// Initialisation de l'interface au chargement
function initializeApp() {
    console.log('=== INITIALISATION DE L\'APPLICATION ===');
    
    // S'assurer que l'écran de login est affiché et l'écran de chat caché
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.style.display = 'flex';
        console.log('Écran de login affiché');
    }
    
    if (chatScreen) {
        chatScreen.classList.add('hidden');
        chatScreen.style.display = 'none';
        console.log('Écran de chat caché');
    }
    
    // Réinitialiser les variables
    currentUser = null;
    selectedUserId = null;
    lastMessagesHash = '';
    currentEditingMessage = null;
    
    // Arrêter le polling s'il était en cours
    if (messagesInterval) {
        clearInterval(messagesInterval);
        messagesInterval = null;
    }
    
    // Réinitialiser l'authentification
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    console.log('=== INITIALISATION TERMINÉE - ÉCRAN DE LOGIN AFFICHÉ ===');
}
function debugElements() {
    console.log('=== DEBUG ÉLÉMENTS HTML ===');
    
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    const chatContainer = document.querySelector('.chat-container');
    const usersList = document.querySelector('.users-list');
    
    console.log('loginScreen:', loginScreen);
    console.log('chatScreen:', chatScreen);
    console.log('chatContainer:', chatContainer);
    console.log('usersList:', usersList);
    
    if (chatScreen) {
        console.log('chatScreen classes:', chatScreen.className);
        console.log('chatScreen style.display:', chatScreen.style.display);
        console.log('chatScreen innerHTML length:', chatScreen.innerHTML.length);
    }
}

// Appeler le debug après le chargement
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser l'application avec l'écran de login
    initializeApp();
    
    // Configurer le mode développement
    if (isDevelopmentMode) {
        console.log('Mode développement activé');
        setupDevelopmentMode();
    }
      setupContextMenu();
    setupUserProfile();
    setupFriendsSystem();
    
    // Debug après un délai
    setTimeout(debugElements, 500);
    
    console.log('=== CHARGEMENT TERMINÉ ===');
});
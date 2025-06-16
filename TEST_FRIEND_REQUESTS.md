# Test des Demandes d'Amis - Procédure

## Corrections Apportées

✅ **Fonction `connectWebSocket()` complétée** - Gestion complète des WebSockets
✅ **Fonction `handleWebSocketMessage()` ajoutée** - Traitement des messages temps réel
✅ **Fonction `handleFriendRequest()` ajoutée** - Gestion des nouvelles demandes d'amis
✅ **Fonction `initializeFriendRequestsSection()` ajoutée** - Initialisation de la section
✅ **Correction des erreurs de syntaxe** - Indentation et accolades manquantes

## Procédure de Test

### 1. Créer deux comptes utilisateur
- Ouvrir http://localhost:3001 dans le navigateur
- Créer un compte "User1" avec mot de passe "password123"
- Créer un compte "User2" avec mot de passe "password123"

### 2. Tester l'envoi de demande d'ami
- Se connecter avec "User1"
- Aller dans l'onglet "Amis"
- Chercher "User2" et envoyer une demande d'ami

### 3. Vérifier la réception en temps réel
- Ouvrir un second onglet avec http://localhost:3001
- Se connecter avec "User2"
- Vérifier que la demande d'ami apparaît automatiquement dans la section "Demandes d'amitié"

### 4. Répondre à la demande
- Avec "User2", accepter ou refuser la demande
- Vérifier que "User1" reçoit la notification en temps réel

## Fonctionnalités WebSocket Implémentées

- ✅ Connexion WebSocket automatique après authentification
- ✅ Authentification WebSocket avec JWT
- ✅ Réception des demandes d'amis en temps réel
- ✅ Notifications d'acceptation/refus de demandes
- ✅ Reconnexion automatique en cas de déconnexion
- ✅ Gestion des nouveaux messages en temps réel
- ✅ Support des appels WebRTC

## Debug Console

Les messages de debug sont visibles dans la console du navigateur (F12) :
- `[DEBUG] === CHARGEMENT DEMANDES D'AMITIÉ ===`
- `📨 Message WebSocket reçu:`
- `👥 Nouvelle demande d'ami reçue:`
- `✅ WebSocket connecté`

## Si les demandes ne s'affichent pas

1. Vérifier la console du navigateur pour les erreurs
2. S'assurer que WebSocket est connecté (`✅ WebSocket connecté`)
3. Vérifier que l'authentification WebSocket fonctionne (`✅ Authentification WebSocket réussie`)
4. Relancer le serveur si nécessaire

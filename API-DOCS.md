# 🎮 GamerChat - API Documentation

## Vue d'ensemble

GamerChat est maintenant un système de messagerie complètement autonome avec :
- ✅ **Aucune dépendance à Google** ou services externes
- 🔐 **Système d'authentification JWT** sécurisé  
- 📱 **API REST** complète
- 💾 **Base de données en mémoire** avec structure organisée
- 🎨 **Avatars automatiques** générés via Dicebear

## 🔧 Démarrage rapide

### 1. Lancer le serveur
```bash
node server.js
```

### 2. Créer des comptes de test
Ouvrez la console du navigateur (F12) et tapez :
```javascript
// Créer automatiquement 3 comptes de test
createTestAccounts()

// Se connecter rapidement avec un compte de test
loginAsDemo('joueur1')  // ou 'joueur2' ou 'gm'
```

### 3. Comptes de test disponibles
- **Joueur1** : `joueur1@demo.com` / `123456`
- **Joueur2** : `joueur2@demo.com` / `123456`  
- **GameMaster** : `gm@demo.com` / `123456`

## 📡 API Endpoints

### 🔐 Authentification

#### `POST /api/auth/register`
Créer un nouveau compte.
```json
{
  "username": "MonPseudo",
  "email": "email@example.com", 
  "password": "motdepasse123"
}
```

#### `POST /api/auth/login`
Se connecter à un compte existant.
```json
{
  "email": "email@example.com",
  "password": "motdepasse123"
}
```

#### `POST /api/auth/verify`
Vérifier la validité d'un token JWT.
```
Headers: Authorization: Bearer <token>
```

#### `POST /api/auth/logout`
Se déconnecter (invalide le token).
```
Headers: Authorization: Bearer <token>
```

### 👥 Utilisateurs

#### `GET /api/users`
Obtenir la liste des autres utilisateurs.
```
Headers: Authorization: Bearer <token>
```

### 💬 Messages

#### `POST /api/messages`
Envoyer un message.
```json
{
  "receiverId": "uuid-destinataire",
  "content": "Contenu du message"
}
```

#### `GET /api/messages/:receiverId`
Obtenir la conversation avec un utilisateur.
```
Headers: Authorization: Bearer <token>
```

#### `PUT /api/messages/:messageId`
Modifier un de ses messages.
```json
{
  "content": "Nouveau contenu"
}
```

#### `DELETE /api/messages/:messageId`
Supprimer un de ses messages.
```
Headers: Authorization: Bearer <token>
```

### 📊 Utilitaires

#### `GET /api/stats`
Statistiques du serveur (public).

#### `POST /api/demo/create-accounts`
Créer les comptes de test automatiquement.

## 🏗️ Architecture

### Base de données en mémoire
```javascript
class Database {
  accounts: Map<ID, Account>        // Comptes utilisateurs
  messages: Array<Message>          // Messages
  sessions: Map<Token, Session>     // Sessions actives
  friendships: Map<ID, Set<ID>>     // Relations d'amitié
  friendRequests: Map<ID, Array>    // Demandes d'amitié
}
```

### Sécurité
- 🔒 **Mots de passe hashés** avec bcrypt (12 rounds)
- 🎫 **Tokens JWT** avec expiration 7 jours
- ✅ **Validation des données** côté serveur
- 🛡️ **Authentification obligatoire** pour toutes les actions

### Fonctionnalités
- 📝 **Inscription/Connexion** complète
- 💬 **Messages en temps réel** (polling)
- ✏️ **Édition/Suppression** de messages
- 👤 **Avatars automatiques** basés sur le pseudo
- 📱 **Interface responsive** type Discord

## 🧪 Tests et développement

### Console du navigateur
```javascript
// Créer des comptes de test
createTestAccounts()

// Connexion rapide
loginAsDemo('joueur1')

// Diagnostic de l'application
diagnosticApp()

// Forcer l'affichage du chat
testShowChat()
```

### Logs serveur
Le serveur affiche en temps réel :
- ✅ Créations de comptes
- 🔐 Connexions/déconnexions  
- 💬 Messages envoyés
- ✏️ Modifications de messages
- 🗑️ Suppressions de messages

## 🚀 Prochaines améliorations

- [ ] 🤝 Système d'amis complet
- [ ] 🔔 Notifications en temps réel
- [ ] 📁 Partage de fichiers/images
- [ ] 🌙 Mode sombre
- [ ] 📊 Tableaux de bord admin
- [ ] 💾 Sauvegarde/restauration des données

---

**🎮 GamerChat v2.0** - Système de messagerie autonome pour gamers

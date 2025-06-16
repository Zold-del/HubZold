# 🎮 GamerChat - Messagerie Gaming Moderne

## 📋 Description

GamerChat est une messagerie gaming moderne et autonome avec un système de comptes sécurisé, une interface style Discord, et un système d'appel en temps réel. L'application est entièrement autonome, sans dépendance externe (Google OAuth supprimé).

## ✨ Fonctionnalités

### 🔐 Authentification Sécurisée
- ✅ Inscription/Connexion avec JWT
- ✅ Chiffrement des mots de passe avec bcrypt
- ✅ Sessions sécurisées
- ✅ Déconnexion propre

### 💬 Messagerie en Temps Réel
- ✅ Envoi/réception de messages instantanés
- ✅ WebSocket pour la synchronisation temps réel
- ✅ Édition et suppression de messages
- ✅ Interface style Discord
- ✅ Historique des conversations

### 👥 Gestion des Amis
- ✅ Recherche d'utilisateurs
- ✅ Envoi de demandes d'amitié
- ✅ Acceptation/refus des demandes
- ✅ Suppression d'amis
- ✅ Notifications en temps réel

### 📞 Système d'Appel
- ✅ Appels audio/vidéo simulés
- ✅ Interface d'appel interactive
- ✅ Notifications d'appel entrant
- ✅ Contrôles d'appel (mute, vidéo, raccrocher)
- ✅ Timer d'appel
- ✅ WebSocket pour la signalisation

### 🎨 Interface Moderne
- ✅ Design style Discord
- ✅ Sidebar avec liste d'amis
- ✅ Chat central
- ✅ Profil utilisateur en bas
- ✅ Notifications custom
- ✅ Menu contextuel (clic droit)

## 🚀 Installation et Lancement

### Prérequis
- Node.js (version 14 ou supérieure)
- npm

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd TestSite

# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

Le serveur sera accessible sur http://localhost:3001

## 🛠️ Technologies Utilisées

### Backend
- **Express.js** - Serveur web
- **WebSocket (ws)** - Communication temps réel
- **JWT** - Authentification
- **bcrypt** - Chiffrement des mots de passe
- **uuid** - Génération d'identifiants uniques
- **cors** - Gestion CORS

### Frontend
- **HTML5/CSS3** - Interface utilisateur
- **JavaScript ES6+** - Logique client
- **WebSocket API** - Communication temps réel
- **Fetch API** - Requêtes HTTP

### Base de Données
- **Base de données en mémoire** - Stockage temporaire (production : remplacer par PostgreSQL/MongoDB)

## 📚 API Documentation

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/verify` - Vérification du token

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Profil utilisateur

### Messages
- `POST /api/messages` - Envoyer un message
- `GET /api/messages/:receiverId` - Récupérer conversation
- `PUT /api/messages/:id` - Modifier un message
- `DELETE /api/messages/:id` - Supprimer un message

### Amis
- `POST /api/friends/request` - Envoyer demande d'amitié
- `GET /api/friends/requests` - Demandes reçues
- `POST /api/friends/respond` - Répondre à une demande
- `GET /api/friends` - Liste des amis
- `DELETE /api/friends/:id` - Supprimer un ami

### Appels
- `POST /api/calls/start` - Démarrer un appel
- `POST /api/calls/:id/accept` - Accepter un appel
- `POST /api/calls/:id/end` - Terminer un appel
- `GET /api/calls/history` - Historique des appels

## 🧪 Fonctions de Test

L'application inclut des fonctions de test accessibles via la console du navigateur :

```javascript
// Créer des comptes de test
quickTestAccounts()

// Connexion automatique
autoLogin("TestUser1")  // ou "TestUser2"

// Tester le système d'appel
testCallSystem()

// Test complet de l'application
fullTest()

// Déconnexion forcée
forceLogout()

// Afficher le menu de test
showTestMenu()
```

## 🔧 Configuration

### Variables d'environnement (optionnel)
Créer un fichier `.env` :
```
PORT=3001
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
```

### Mode développement
Dans `script.js`, modifier :
```javascript
let isDevelopmentMode = true; // Active les fonctions de test
```

## 🏗️ Architecture

```
TestSite/
├── server.js          # Serveur Express + WebSocket
├── script.js          # Logique client
├── index.html         # Interface utilisateur
├── style.css          # Styles CSS
├── package.json       # Dépendances
├── API-DOCS.md        # Documentation API détaillée
├── SCRIPTS.md         # Scripts et commandes utiles
└── README.md          # Ce fichier
```

## 📱 Utilisation

1. **Inscription** : Créer un compte avec username, email, mot de passe
2. **Connexion** : Se connecter avec username/mot de passe
3. **Ajouter des amis** : Rechercher et envoyer des demandes d'amitié
4. **Messagerie** : Cliquer sur un ami pour ouvrir la conversation
5. **Appels** : Cliquer sur le bouton "📞 Appeler" dans une conversation

## 🔒 Sécurité

- ✅ Mots de passe chiffrés avec bcrypt
- ✅ Tokens JWT sécurisés
- ✅ Validation des entrées
- ✅ Protection CORS
- ✅ Authentification requise pour toutes les actions

## 🐛 Debug et Logs

L'application génère des logs détaillés :
- 🎮 Démarrage du serveur
- 🔐 Authentification
- 💬 Messages
- 👥 Amis
- 📞 Appels
- 🔌 WebSocket

Utiliser les outils de développement du navigateur pour voir les logs côté client.

## 🚀 Déploiement

### Heroku (recommandé)
Le projet inclut un `Procfile` pour Heroku :
```bash
# Déployer sur Heroku
heroku create your-app-name
git push heroku main
```

### Serveur classique
```bash
# Mode production
NODE_ENV=production npm start
```

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème, ouvrir une issue sur le repository GitHub.

---

**🎮 GamerChat - Messagerie Gaming Moderne - Prête à l'emploi !**

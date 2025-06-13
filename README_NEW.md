# 🎮 GamerChat - Messagerie Gaming Authentifiée

Application de messagerie en temps réel avec système d'authentification complet, conçue pour les gamers avec une interface moderne style Discord.

## ✨ Fonctionnalités

### 🔐 **Système d'authentification sécurisé**
- **Inscription/Connexion** avec email et mot de passe
- **Tokens JWT** pour la sécurité
- **Hashage bcrypt** des mots de passe
- **Sessions persistantes**

### 💬 **Messagerie en temps réel**
- **Chat instantané** entre utilisateurs connectés
- **Modification et suppression** des messages (menu contextuel)
- **Interface Discord-like** avec sidebar des joueurs
- **Messages persistants** (24h de conservation)

### 👥 **Système d'amis**
- **Recherche d'amis** par pseudo
- **Demandes d'amitié** avec acceptation/refus
- **Notifications** en temps réel
- **Liste des joueurs en ligne**

### 🎨 **Interface moderne**
- **Design Discord-like** plein écran
- **Sidebar des joueurs** à gauche
- **Profil utilisateur** en bas de sidebar
- **Animations fluides** et effets gaming
- **Responsive design** pour tous les écrans

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/Zold-del/HubZold.git
cd HubZold

# Installer les dépendances
npm install

# Créer le fichier de configuration (optionnel)
cp .env.example .env

# Démarrer le serveur
npm start
```

### Ouvrir l'application

```
http://localhost:3001
```

## 🔐 Authentification

Le système utilise maintenant une **authentification JWT complète** :

1. **Inscription** - Créez un compte avec email/mot de passe
2. **Connexion** - Utilisez vos identifiants
3. **Session automatique** - Restez connecté entre les sessions
4. **Sécurité renforcée** - Mots de passe hashés, tokens sécurisés

## 🎮 Utilisation

### 1. Créer un compte
- Cliquez sur l'onglet "Inscription"
- Entrez email, nom d'utilisateur et mot de passe
- Cliquez "S'inscrire"

### 2. Se connecter
- Utilisez l'onglet "Connexion"
- Entrez vos identifiants
- Accès automatique au chat

### 3. Chatter
- **Sélectionnez un utilisateur** dans la sidebar
- **Tapez votre message** dans la zone de saisie
- **Envoyez** avec Entrée ou le bouton

### 4. Fonctions avancées
- **Clic droit** sur vos messages → Modifier/Supprimer
- **Recherche d'amis** → Entrez un pseudo et cliquez 🔎
- **Gérer les demandes** → Accepter/Refuser les invitations

## 🛠️ Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Backend** : Node.js, Express.js
- **Authentification** : JWT (jsonwebtoken)
- **Sécurité** : bcrypt pour le hashage des mots de passe
- **API** : RESTful API
- **Design** : CSS3 moderne avec animations

## 📁 Structure du projet

```
TestSite/
├── index.html          # Interface principale
├── style.css          # Styles et animations
├── script.js          # Logique client
├── server.js          # Serveur Node.js et API
├── config.js          # Configuration
├── package.json       # Dépendances
├── README.md          # Documentation
├── .env.example       # Template de configuration
├── .gitignore         # Fichiers à ignorer
├── LICENSE            # Licence MIT
└── Procfile          # Configuration Heroku
```

## 🌐 Déploiement

### Heroku (recommandé)

```bash
# Installer Heroku CLI puis :
heroku create votre-app-name
heroku config:set JWT_SECRET=your-super-secret-key
git push heroku main
```

### Railway

1. Connectez votre repository GitHub sur [railway.app](https://railway.app)
2. Importez le projet
3. Déploiement automatique

### Vercel

```bash
npx vercel
# Suivre les instructions
```

## 🔧 Configuration

Créez un fichier `.env` basé sur `.env.example` :

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3001
NODE_ENV=production
```

## 🚀 Fonctionnalités à venir

- 📊 Dashboard d'administration
- 🎵 Partage de médias
- 🎯 Salles de chat thématiques
- 📝 Historique des messages étendu
- 🌍 Support multilingue
- 📱 Application mobile

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Zold** - [GitHub](https://github.com/Zold-del)

## 🔗 Liens utiles

- [Repository GitHub](https://github.com/Zold-del/HubZold)
- [Issues](https://github.com/Zold-del/HubZold/issues)
- [Releases](https://github.com/Zold-del/HubZold/releases)

---

⭐ **N'oubliez pas de mettre une étoile si le projet vous plaît !**

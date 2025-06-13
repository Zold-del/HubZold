# 🎮 GamerChat - Application de Chat Gaming

Une application de chat en temps réel conçue spécialement pour les gamers, avec un design moderne inspiré de Discord.

## ✨ Fonctionnalités

- 🔐 **Système d'authentification sécurisé** - Inscription/Connexion avec JWT
- 💬 **Messagerie en temps réel** - Chat instantané entre utilisateurs
- 👥 **Système d'amis** - Recherche et ajout d'amis
- ✏️ **Édition de messages** - Modifier ses messages avec clic droit
- 🎨 **Interface moderne** - Design Discord-like responsive
- 🔒 **Sécurité** - Mots de passe hashés avec bcrypt
- 📱 **Responsive** - Compatible mobile et desktop

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm ou yarn

### Installation locale
```bash
# Cloner le repository
git clone https://github.com/Zold-del/HubZold.git
cd HubZold

# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

L'application sera accessible sur `http://localhost:3001`

## 📦 Dépendances

- **express** - Serveur web
- **uuid** - Génération d'identifiants uniques
- **bcrypt** - Hashage des mots de passe
- **jsonwebtoken** - Authentification JWT

## 🛠️ Technologies utilisées

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Authentification**: JWT + bcrypt
- **Style**: CSS moderne avec animations

## 📱 Fonctionnalités détaillées

### Authentification
- Inscription avec email/mot de passe
- Connexion sécurisée avec tokens JWT
- Session persistante
- Validation côté client et serveur

### Chat
- Messages en temps réel
- Affichage des utilisateurs en ligne
- Interface style Discord
- Modification de messages (clic droit)

### Système d'amis
- Recherche d'utilisateurs par pseudo
- Demandes d'amitié avec acceptation/refus
- Notifications en temps réel

## 🎨 Design

Interface moderne avec :
- Couleurs gaming (vert/bleu néon)
- Animations fluides
- Layout responsive
- Style Discord-like

## 🔧 Configuration

### Variables d'environnement
```env
PORT=3001
JWT_SECRET=your-secret-key-here
```

### Sécurité
- Mots de passe hashés avec bcrypt (saltRounds: 10)
- Tokens JWT avec expiration 24h
- Validation stricte des entrées utilisateur

## 📄 Structure du projet

```
HubZold/
├── index.html          # Page principale
├── style.css           # Styles CSS
├── script.js           # Logique client
├── server.js           # Serveur Express
├── package.json        # Configuration npm
└── README.md          # Documentation
```

## 🚀 Déploiement

### Heroku
```bash
# Créer une app Heroku
heroku create your-app-name

# Déployer
git push heroku main
```

### Autres plateformes
- **Vercel**: Déploiement automatique via GitHub
- **Railway**: Simple déploiement Node.js
- **DigitalOcean**: App Platform

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Anthony** - *Développeur* - [Zold-del](https://github.com/Zold-del)

## 🙏 Remerciements

- Design inspiré de Discord
- API Dicebear pour les avatars
- Communauté gaming pour les retours

---

⭐ **N'hésitez pas à mettre une étoile si vous aimez le projet !**
// Configuration pour GamerChat

// 🔧 CONFIGURATION GOOGLE OAUTH
// Pour activer Google OAuth, suivez ces étapes :

// 1. Allez sur https://console.cloud.google.com/
// 2. Créez un projet ou sélectionnez un projet existant
// 3. Dans le menu, allez à "APIs & Services" > "Credentials"
// 4. Cliquez "Create Credentials" > "OAuth client ID"
// 5. Choisissez "Web application"
// 6. Ajoutez ces URI autorisées :
//    - http://localhost:3000
//    - http://127.0.0.1:3000
// 7. Copiez votre Client ID

const GOOGLE_CONFIG = {
    // Remplacez par votre vrai Google Client ID
    CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID_HERE",
    
    // Pour activer Google OAuth, changez cette valeur à true
    ENABLED: false
};

// 🎮 CONFIGURATION DU CHAT
const CHAT_CONFIG = {
    // URL de l'API (ne pas changer sauf si vous déployez ailleurs)
    API_URL: "http://localhost:3000/api",
    
    // Limite de caractères par message
    MESSAGE_LIMIT: 500,
    
    // Intervalle de rafraîchissement des messages (en millisecondes)
    REFRESH_INTERVAL: 2000,
    
    // Durée de conservation des messages (en heures)
    MESSAGE_RETENTION: 24
};

// 🎨 THÈMES DISPONIBLES (pour futures améliorations)
const THEMES = {
    gaming: {
        primary: "#00ff88",
        secondary: "#00d4ff",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)"
    },
    neon: {
        primary: "#ff0080",
        secondary: "#8000ff", 
        background: "linear-gradient(135deg, #000000 0%, #1a0033 50%, #330066 100%)"
    }
};

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GOOGLE_CONFIG, CHAT_CONFIG, THEMES };
}
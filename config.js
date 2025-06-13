// Configuration pour GamerChat

// � SYSTÈME D'AUTHENTIFICATION
// Le site utilise maintenant un système d'authentification JWT complet
// Plus besoin de Google OAuth - système de comptes intégré

const AUTH_CONFIG = {
    // Mode développement désactivé - utilise l'authentification réelle
    DEVELOPMENT_MODE: false,
    
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
    JWT_EXPIRY: "24h",
    
    // Validation des mots de passe
    PASSWORD_MIN_LENGTH: 6,
    REQUIRE_EMAIL_VERIFICATION: false // Pour simplifier les tests
};

// 🎮 CONFIGURATION DU CHAT
const CHAT_CONFIG = {
    // URL de l'API 
    API_URL: process.env.NODE_ENV === 'production' ? "/api" : "http://localhost:3001/api",
    
    // Limite de caractères par message
    MESSAGE_LIMIT: 500,
    
    // Intervalle de rafraîchissement des messages (en millisecondes)
    REFRESH_INTERVAL: 1000,
    
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
    module.exports = { AUTH_CONFIG, CHAT_CONFIG, THEMES };
}
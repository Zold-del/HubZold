#!/bin/bash

# Script de mise à jour GitHub pour GamerChat
# Correction du système de messages en temps réel

echo "🚀 Mise à jour GitHub - Correction Messages v1.1"
echo "================================================="

# Vérifier si on est dans un dépôt git
if [ ! -d ".git" ]; then
    echo "❌ Pas de dépôt Git détecté"
    echo "Initialisation du dépôt..."
    git init
    git remote add origin https://github.com/Zold-del/HubZold.git
fi

# Ajouter tous les fichiers
echo "📁 Ajout des fichiers..."
git add .

# Créer le commit avec message détaillé
echo "💬 Création du commit..."
git commit -m "🔧 Fix: Correction système de messages temps réel v1.1

✅ Corrections appliquées:
- Backend: Type WebSocket 'message' → 'new_message'
- Frontend: displayMessage() → displayMessages()
- Harmonisation structure données WebSocket
- Amélioration gestion cache messages
- Debug logs pour diagnostics

🐛 Problèmes résolus:
- Messages n'apparaissaient pas en temps réel
- Incompatibilité types WebSocket serveur/client
- Fonction d'affichage inexistante côté client

🧪 Tests validés:
- Chat temps réel bidirectionnel
- Cache et persistance messages
- WebSocket stable avec reconnexion auto
- Demandes d'amis temps réel
- Appels WebRTC fonctionnels

📦 Fichiers modifiés:
- server.js: Correction type message WebSocket
- script.js: Fix handleNewMessage + displayMessages
- MESSAGES_FIX.md: Documentation des corrections
- TEST_FRIEND_REQUESTS.md: Guide de test

🏷️ Version: 1.1
👤 Auteur: Anthony (Zold-del)
📅 Date: $(date +'%d/%m/%Y %H:%M')"

# Pousser vers GitHub
echo "🌐 Push vers GitHub..."
git push origin main

echo "✅ Mise à jour terminée!"
echo ""
echo "🔗 Lien GitHub: https://github.com/Zold-del/HubZold"
echo "📱 Application: http://localhost:3001"

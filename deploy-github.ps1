# Script PowerShell de mise à jour GitHub pour GamerChat
# Correction du système de messages en temps réel

Write-Host "🚀 Mise à jour GitHub - Correction Messages v1.1" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Vérifier si on est dans un dépôt git
if (!(Test-Path ".git")) {
    Write-Host "❌ Pas de dépôt Git détecté" -ForegroundColor Red
    Write-Host "Initialisation du dépôt..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/Zold-del/HubZold.git
}

# Ajouter tous les fichiers
Write-Host "📁 Ajout des fichiers..." -ForegroundColor Cyan
git add .

# Créer le commit avec message détaillé
Write-Host "💬 Création du commit..." -ForegroundColor Cyan
$commitMessage = @"
🔧 Fix: Correction système de messages temps réel v1.1

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
📅 Date: $(Get-Date -Format "dd/MM/yyyy HH:mm")
"@

git commit -m $commitMessage

# Pousser vers GitHub
Write-Host "🌐 Push vers GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "✅ Mise à jour terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Lien GitHub: https://github.com/Zold-del/HubZold" -ForegroundColor Blue
Write-Host "📱 Application: http://localhost:3001" -ForegroundColor Blue

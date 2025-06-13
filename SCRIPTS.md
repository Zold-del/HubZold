# Scripts utiles pour GamerChat

## 🔧 Script pour arrêter le serveur sur le port 3000

### Windows (PowerShell)
```powershell
# Trouver le processus qui utilise le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacez PID par l'ID du processus)
taskkill /PID <PID> /F
```

### Windows (cmd)
```cmd
# Trouver et tuer le processus en une commande
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000') do taskkill /PID %a /F
```

### Linux/Mac
```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
sudo kill -9 $(lsof -t -i:3000)
```

## 🚀 Scripts de démarrage alternatifs

### Démarrer sur un port différent
```bash
# Port 3001
PORT=3001 npm start

# Port 8080
PORT=8080 npm start
```

### Arrêt forcé et redémarrage
```bash
# Windows PowerShell
Get-Process -Name "node" | Stop-Process -Force
npm start

# Linux/Mac
pkill node
npm start
```

## 📝 Commandes utiles

```bash
# Vérifier les ports occupés
netstat -tulpn | grep :3000    # Linux/Mac
netstat -ano | findstr :3000   # Windows

# Redémarrer avec nodemon (développement)
npm install -g nodemon
nodemon server.js

# Vérifier si le serveur fonctionne
curl http://localhost:3000
```
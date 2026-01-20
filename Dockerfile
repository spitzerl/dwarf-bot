FROM node:20-alpine

# Créer un répertoire d'application
WORKDIR /app

# Installer des outils de debug
RUN apk add --no-cache bash curl jq

# Copier les fichiers de dépendances package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source de l'application
COPY . .

# Créer un répertoire pour les données persistantes
RUN mkdir -p /app/data

# Configuration des variables d'environnement avec des valeurs par défaut
ENV NODE_ENV=production

# Script de démarrage amélioré
COPY ./docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Commande pour démarrer l'application avec le script d'entrée
ENTRYPOINT ["/docker-entrypoint.sh"]
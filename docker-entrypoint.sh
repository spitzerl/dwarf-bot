#!/bin/bash
set -e

# Rediriger toutes les sorties vers stdout et stderr pour que Dokploy puisse les capturer
exec 1>&1
exec 2>&2

# Afficher les informations de débogage
echo "========================================"
echo "Démarrage du bot Discord - Dokploy"
echo "========================================"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Date: $(date)"
echo "Working directory: $(pwd)"
echo "Files in current directory:"
ls -la
echo "========================================"
echo "Vérification des variables d'environnement..."
echo "TOKEN est défini: $([ ! -z "$TOKEN" ] && echo "OUI" || echo "NON")"
echo "CLIENT_ID est défini: $([ ! -z "$CLIENT_ID" ] && echo "OUI" || echo "NON")"
echo "GUILD_ID est défini: $([ ! -z "$GUILD_ID" ] && echo "OUI (optionnel)" || echo "NON (optionnel)")"
echo "NODE_ENV: ${NODE_ENV:-non défini}"
echo "========================================"

# Vérification des variables d'environnement essentielles
if [ -z "$TOKEN" ]; then
  echo "ERREUR CRITIQUE: La variable TOKEN n'est pas définie !"
  echo "Le bot ne peut pas démarrer sans un token Discord valide."
  echo "Veuillez configurer la variable d'environnement TOKEN dans Dokploy."
  sleep 5
  exit 1
fi

if [ -z "$CLIENT_ID" ]; then
  echo "AVERTISSEMENT: La variable CLIENT_ID n'est pas définie."
  echo "L'enregistrement des commandes slash pourrait ne pas fonctionner."
fi

# Vérifier si le dossier data existe et est accessible
if [ ! -d "/app/data" ]; then
  echo "Création du dossier data..."
  mkdir -p /app/data
  echo "Dossier data créé avec succès."
else
  echo "Dossier data existant: OK"
  # Vérifier si on peut écrire dedans
  if touch /app/data/test_write && rm /app/data/test_write; then
    echo "Permissions d'écriture sur le dossier data: OK"
  else
    echo "ERREUR: Impossible d'écrire dans le dossier data!"
  fi
fi

# Afficher l'état de channels.json s'il existe
if [ -f "/app/data/channels.json" ]; then
  echo "channels.json existe:"
  cat /app/data/channels.json | jq . || echo "Format JSON invalide"
else
  echo "channels.json n'existe pas encore"
  echo "Création d'un fichier channels.json vide..."
  echo "{}" > /app/data/channels.json
  echo "channels.json créé."
fi

echo "========================================"
echo "Démarrage du bot Discord..."
echo "========================================"

# Démarrer le bot avec des logs verbeux
# L'utilisation de exec remplace le processus shell par node, 
# ce qui permet à Docker de capturer correctement les logs
echo "Exécution de: node index.js"
exec node index.js 2>&1
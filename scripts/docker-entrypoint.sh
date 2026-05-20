#!/bin/sh
# Entrypoint del container app: applica le migrazioni Drizzle e poi avvia
# Next.js. `set -e` aborta se la migrazione fallisce, così l'app non parte
# mai contro uno schema rotto. `exec` rende node il PID 1 per ricevere
# SIGTERM da Coolify in modo pulito.
set -e

echo "[entrypoint] Esecuzione migrazioni database…"
node /app/migrate.js

echo "[entrypoint] Avvio Next.js…"
exec node /app/server.js

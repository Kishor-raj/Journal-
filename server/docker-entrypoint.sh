#!/bin/sh
set -e

echo "Running database migrations..."
node src/db/migrate.js

echo "Starting Journal backend..."
exec node src/index.js

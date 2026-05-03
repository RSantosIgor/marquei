#!/bin/sh
echo "🔄 Generating Prisma client..."
npx prisma generate

echo "🔄 Running migrations..."
npx prisma migrate deploy

echo "🚀 Starting server..."
exec npm run start:dev

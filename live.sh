#!/bin/bash

cd frontend
pnpm install
pnpm build
cd ../backend
pnpm install


cd ../

pm2 start ecosystem.config.js
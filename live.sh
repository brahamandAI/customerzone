#!/bin/bash

cd frontend
npm install
npm run build
cd ../backend
npm install

cd ../

pm2 start ecosystem.config.js
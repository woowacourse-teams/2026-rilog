#!/bin/bash
# scripts/start-pm2.sh

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

cd /home/ubuntu/rilog-next
nvm install        # .nvmrc 기준으로 Node 버전 자동 설치/전환

pm2 delete rilog-next --silent || true
pm2 start ecosystem.config.cjs
pm2 save

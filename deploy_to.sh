#!/usr/bin/env bash
HEX_NAME=$1

scp -r ./src/main/* bb@${HEX_NAME}.hex.bigboards.io:/opt/bb/runtimes/bigboards-mmc/
scp -r ./package.json bb@${HEX_NAME}.hex.bigboards.io:/opt/bb/runtimes/bigboards-mmc/
ssh bb@${HEX_NAME}.hex.bigboards.io 'cd /opt/bb/runtimes/bigboards-mmc/ && npm install'
ssh bb@${HEX_NAME}.hex.bigboards.io 'cd /opt/bb/runtimes/bigboards-mmc/client && bower install'
ssh bb@${HEX_NAME}.hex.bigboards.io 'bb mmc restart'
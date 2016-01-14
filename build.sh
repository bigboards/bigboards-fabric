#!/bin/bash
VERSION="3.0"
BUILD=".${1:snapshot}"
PROJECT_NAME="BigBoards Fabric"

echo "Building the ${PROJECT_NAME}"
mkdir -p dist
rm -rf dist/*
cd code

echo "execute npm install"
npm install

echo "execute bower install"
cd ./ui
bower install --config.interactive=false

echo "copying resources"
cd ..
cp -r code dist/bigboards-fabric

echo "generate a version file"
echo "${VERSION}${BUILD}" > ../dist/VERSION

echo "packaging"
cd dist
tar -czf
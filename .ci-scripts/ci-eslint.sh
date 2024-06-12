#!/bin/bash
set -e

## NPM eslint
mkdir node_modules
npm install --save-dev eslint

## NPM test
find ./js -type f -name "*.js" | xargs node_modules/.bin/eslint -c .eslint.config.js

#!/bin/bash
set -e

## NPM eslint
npm install --save-dev eslint

## NPM test
find ./js -type f -name "*.js" | xargs node_modules/.bin/eslint --stats -c ./.eslint.config.js

#!/bin/bash
set -e

## NPM eslint
npm install -s eslint

## NPM test
find ./libdec -type f -name "*.js" | xargs node_modules/.bin/eslint -c ./.eslintrc.json

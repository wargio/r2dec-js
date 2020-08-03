#!/bin/bash
set -e

## NPM eslint
npm install -s eslint

## NPM test
find ./ -type f -name "*.js" | xargs node_modules/.bin/eslint

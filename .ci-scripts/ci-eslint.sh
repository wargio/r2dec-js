#!/bin/bash
set -e

## NPM eslint
npm install -s eslint

## NPM test
find r2dec-js/ -type f -name "*.js" | xargs node_modules/.bin/eslint

#!/bin/sh

find ./js -type f -name "*.js" | xargs node_modules/.bin/eslint -c ./.eslint.config.js

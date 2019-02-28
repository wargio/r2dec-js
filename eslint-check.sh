#!/bin/sh

find . -type f -name "*.js" | xargs eslint 

#!/bin/bash

find . -type f -name "*.js" | xargs eslint 

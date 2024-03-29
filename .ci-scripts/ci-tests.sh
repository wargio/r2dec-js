#!/bin/bash
set -e

sudo apt update > /dev/null
sudo apt -y install meson ninja-build

CI_BRANCH="$1"

## r2dec-regression
cd ..
CI_WORKDIR=$(pwd)

echo "CI_BRANCH: $CI_BRANCH"
echo "CI_WORKDIR:  $CI_WORKDIR"

rm -rf r2dec-regression >/dev/null 2>&1 || echo "no need to clean.."
git clone --branch "$CI_BRANCH" --depth 1 https://github.com/wargio/r2dec-regression || git clone --depth 1 https://github.com/wargio/r2dec-regression
cd r2dec-regression
chmod +x testall.sh
./testall.sh "$CI_WORKDIR/r2dec-js" ci
ERRORED=$?
cd ..

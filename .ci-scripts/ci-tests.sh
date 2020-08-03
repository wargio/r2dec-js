#!/bin/bash
set -e

CI_BRANCH="$1"

echo "Branch: $CI_BRANCH"
make --no-print-directory testbin -C p
ERRORED=$?
if [ "$ERRORED" == "1" ]; then
	exit $ERRORED
fi

## r2dec-regression
cd ..
WORKINGDIR_CI=$(pwd)
ls r2dec-js >/dev/null 2>&1 || git clone --depth 1 https://github.com/radareorg/r2dec-js
rm -rf r2dec-regression >/dev/null 2>&1 || echo "no need to clean.."
git clone --branch "$CI_BRANCH" --depth 1 https://github.com/radareorg/r2dec-regression || git clone --depth 1 https://github.com/radareorg/r2dec-regression
cd r2dec-regression
chmod +x testall.sh
./testall.sh "$WORKINGDIR_CI/r2dec-js" travis
ERRORED=$?
cd ..

#!/usr/bin/bash
# This script is meant to be used exclusively by the
# CI workflow located in `.github/workflows/ci.yml`.
# It is responsible for comparing the versions of feature
# branches with the version of the main branch. It will
# close with a non-zero exit code if the current
# feature branch's package.json version string is not
# greater than that of the main branch.

if [ -n "$(git branch | grep '* main')" ]
then
    # no need to check version increment if this is being run on main branch
    exit 0
fi

get_version() {
    local VERSION=$(grep '"version": "[[:digit:]]\+.[[:digit:]]\+.[[:digit:]]\+"' package.json)
    VERSION=$(echo $VERSION | cut -d'"' -f4)
    echo $VERSION
}

THIS_BRANCH_VERSION=$(get_version)

cd ..
git clone -b main --single-branch https://github.com/chessticulate/shallowpink.git shallowpink_main> /dev/null
cd shallowpink_main

MAIN_BRANCH_VERSION=$(get_version)

# mini node script to compare versions
NODE_COMPARE_VERS='const cv = require("compare-versions");\
const out = cv.compareVersions(process.argv[1], process.argv[2]);\
process.exit(out < 0 ? 0 : 1)'
npm install -g compare-versions
node -e "$NODE_COMPARE_VERS" $MAIN_BRANCH_VERSION $THIS_BRANCH_VERSION

EXIT_CODE=$?

if [ "$EXIT_CODE" != "0" ]
then
    echo "'${THIS_BRANCH_VERSION}' not greater than '${MAIN_BRANCH_VERSION}'"
fi

exit $EXIT_CODE

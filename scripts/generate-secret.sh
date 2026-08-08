#!/usr/bin/env sh
set -eu
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

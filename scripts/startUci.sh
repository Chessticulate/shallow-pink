#!/bin/bash

DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Engine root: $DIR"
node "$DIR/index.js" -uci


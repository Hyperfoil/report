#!/bin/bash

TEMPLATE=${TEMPLATE:-/var/www/index.html}
INPUT=$(mktemp /tmp/input.XXXXXX)
cat > $INPUT
ID=$(jq -r .info.id $INPUT)
BENCHMARK=$(jq -r .info.benchmark $INPUT)
OUTPUT=/var/www/localhost/htdocs/$ID-$BENCHMARK.html
awk '/\*\*DATAKEY\*\*/ { printf "       window.__DATA__ = "; system("cat '$INPUT'"); next; } /.*/ { print; }' < $TEMPLATE > $OUTPUT

echo "Status: 307 Temporary redirect"
echo "Location: /$ID-$BENCHMARK.html"
echo ""
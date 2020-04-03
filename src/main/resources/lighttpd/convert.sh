#!/bin/bash

TEMPLATE=${TEMPLATE:-/var/www/index.html}
INPUT=$(mktemp /tmp/input.XXXXXX)
cat > $INPUT
ID=$(jq -r .info.id $INPUT)
BENCHMARK=$(jq -r .info.benchmark $INPUT)

declare -A QUERY_PARAMS
while IFS='=' read -r -d '&' key value && [[ -n "$key" ]]; do
    QUERY_PARAMS["$key"]=$value
done <<<"${QUERY_STRING}&"
PREFIX=${QUERY_PARAMS["prefix"]:-""}
SUFFIX=${QUERY_PARAMS["suffix"]:-""}

FILE=${PREFIX}${ID}-${BENCHMARK}${SUFFIX}.html
OUTPUT=/var/www/localhost/htdocs/$FILE
awk '/\*\*DATAKEY\*\*/ { printf "       window.__DATA__ = "; system("cat '$INPUT'"); next; } /.*/ { print; }' < $TEMPLATE > $OUTPUT
rm $INPUT

echo "Status: 307 Temporary redirect"
echo "Location: /$FILE"
echo ""
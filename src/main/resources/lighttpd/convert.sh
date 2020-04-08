#!/bin/bash

declare -A QUERY_PARAMS
while IFS='=' read -r -d '&' key value && [[ -n "$key" ]]; do
    QUERY_PARAMS["$key"]=$value
done <<<"${QUERY_STRING}&"
PREFIX=${QUERY_PARAMS["prefix"]:-""}
SUFFIX=${QUERY_PARAMS["suffix"]:-""}
SUBPATH=${QUERY_PARAMS["subpath"]:-"."}

TEMPLATE=${TEMPLATE:-/var/www/index.html}
INPUT=$(mktemp /tmp/input.XXXXXX)
cat | jq $SUBPATH > $INPUT
ID=$(jq -r .info.id $INPUT)
BENCHMARK=$(jq -r .info.benchmark $INPUT)

FILE=${PREFIX}${ID}-${BENCHMARK}${SUFFIX}.html
OUTPUT=/var/www/localhost/htdocs/$FILE

if [ -e $OUTPUT ]; then
   echo "Status: 409 Conflict"
   echo ""
   echo $OUTPUT" already exists"
   exit 1
fi

awk '/\*\*DATAKEY\*\*/ { printf "       window.__DATA__ = "; system("cat '$INPUT'"); next; } /.*/ { print; }' < $TEMPLATE > $OUTPUT
rm $INPUT

echo "Status: 307 Temporary redirect"
echo "Location: /$FILE"
echo ""

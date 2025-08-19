#!/bin/bash

# record start time in seconds with nanoseconds
start=$(date +%s.%N)

if [ $# -gt 1 ]; then
    echo "too many args"
    exit 1
fi

# run your node script, capture its output
if [ $# -lt 1 ]; then
    output=$(node ./depth.js 3)
else 
    output=$(node ./depth.js $1)
fi

# record end time
end=$(date +%s.%N)

# elapsed time
elapsed=$(echo "$end - $start" | bc)

# extract nodes visited from node’s output
nodes=$(echo "$output" | grep "nodes visited" | awk '{print $3}')

# calculate NPS
nps=$(echo "$nodes / $elapsed" | bc -l)

# print everything nicely
echo "$output"
echo "elapsed: ${elapsed}s"
echo "NPS: $nps"


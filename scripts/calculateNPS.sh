#!/bin/bash

# record start time in seconds with nanoseconds
start=$(date +%s.%N)

# run your node script, capture its output
output=$(node ./depth.js 3)

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


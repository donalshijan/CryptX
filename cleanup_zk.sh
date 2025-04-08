#!/bin/bash

ZK_HOST="zookeeper"
ZK_PORT="2181"
TIMEOUT=60
WAITED=0

echo "$(date) Attempting ZooKeeper cleanup before startup..."
echo "$(date) Waiting for ZooKeeper to be ready at ${ZK_HOST}:${ZK_PORT}..."
until zookeeper-shell "${ZK_HOST}:${ZK_PORT}" <<< "ls /" > /dev/null 2>&1; do
  echo "Waiting for ZooKeeper to respond via zookeeper-shell..."
  sleep 2
done
echo "ZooKeeper is ready!"

# Try connecting to ZooKeeper shell — this assumes embedded shell logic
echo "Fetching znodes..."
ZK_NODES=$(echo "ls /" | zookeeper-shell "${ZK_HOST}:${ZK_PORT}" 2>/dev/null | grep -oP '\[\K[^\]]+')

IFS=',' read -ra NODES <<< "$ZK_NODES"

for NODE in "${NODES[@]}"; do
  shopt -s extglob
  CLEAN_NODE="${NODE##*( )}"
  CLEAN_NODE="${CLEAN_NODE%%*( )}"
  if [[ "$CLEAN_NODE" != "zookeeper" && "$CLEAN_NODE" != "" ]]; then
    echo "Deleting node: /$CLEAN_NODE"
    echo "deleteall /$CLEAN_NODE" | zookeeper-shell "${ZK_HOST}:${ZK_PORT}"
  else
    echo "Skipping system node or empty entry: $CLEAN_NODE"
  fi
done

echo "ZooKeeper cleanup complete."

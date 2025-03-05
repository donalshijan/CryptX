#!/bin/bash

# Start Kafka
exec /etc/confluent/docker/run &

# Function to handle cleanup and exit
cleanup() {
    echo "Stopping Kafka container..."
    # Add any cleanup tasks here if needed
    exit 0
}



# Function to check if a topic exists and create it if not
check_and_create_topic() {
    local topic_name=$1
    local exists=$(kafka-topics --bootstrap-server localhost:9092 --list | grep -w $topic_name)

    if [ -z "$exists" ]; then
        echo "Topic $topic_name does not exist. Creating..."
        kafka-topics --bootstrap-server localhost:9092 --create --topic $topic_name --partitions 1 --replication-factor 1
    else
        echo "Topic $topic_name already exists."
    fi
}

# Wait for Kafka to start by checking the status of the broker

until kafka-topics --bootstrap-server localhost:9092 --list &>/dev/null; do
    echo "Waiting for Kafka to start..."
    sleep 5
done

echo "Kafka started successfully."

# Check and create topics if they do not exist
check_and_create_topic "orders-topic"
check_and_create_topic "transactions-topic"

# Keep the script running
# while true; do
#     sleep 1  # Adjust sleep time as needed
# done

# Use `tail -f /dev/null` to keep the script running without a busy loop
tail -f /dev/null
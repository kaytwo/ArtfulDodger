#!/bin/bash

NUM_URLS=${1:-100}
python clear_queues.py

echo "Inserting URLs in crawlqueue"
python test_source.py $NUM_URLS

# launch 25 instances by default; first arg can be diff number of instances
# ./launch.sh NUMPROCS SCRIPT_PATH WEBDIS_HOST WEBDIS_PORT
SCRIPT_PATH=${3:-"/home/ec2-user/ArtfulDodger/"}
#WEBDIS_HOST=${3:-"localhost"}
#WEBDIS_PORT=${4:-"7379"}
NUM_INSTANCES=${2:-10}
# PROXY="--proxy=127.0.0.1:3128"
# IMAGES="--load-images=false"

echo "DA CRAWL..."
cd $SCRIPT_PATH
for i in `seq 1 $NUM_INSTANCES` ; do
  #while true ; do phantomjs url_worker.js  > /dev/null 2>> /tmp/phantom_errors ; done) &
  phantomjs --web-security=no url_worker.js &
done

#Loop until all phantom processes are killed.
until [ $(ps aux | grep phantomjs | wc -l) -eq 1 ]
do
    sleep 5; 
done

python result_sink.py

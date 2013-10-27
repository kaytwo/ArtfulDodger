#!/bin/bash

# launch 25 instances by default; first arg can be diff number of instances
# ./launch.sh NUMPROCS SCRIPT_PATH WEBDIS_HOST WEBDIS_PORT
NUM_INSTANCES=${1:-25}
SCRIPT_PATH=${2:-"/home/ec2-user/ArtfulDodger/"}
WEBDIS_HOST=${3:-"localhost"}
WEBDIS_PORT=${4:-"7379"}
# PROXY="--proxy=127.0.0.1:3128"
# IMAGES="--load-images=false"

cd $SCRIPT_PATH
for i in `seq 1 $NUM_INSTANCES` ; do 
  (while true ; do /usr/local/bin/phantomjs $PROXY $IMAGES url_worker.js $WEBDIS_HOST $WEBDIS_PORT > /dev/null 2>> /tmp/phantom_errors ; done) &
done

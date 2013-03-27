#!/bin/bash
# launch 25 instances by default; first arg can be diff number of instances
# ex: ./launch.sh NUMPROCS SCRIPT_PATH
SCRIPT_PATH=${2:-"/home/ckanich/workspace/ArtfulDodger/"}
cd $SCRIPT_PATH
for i in `seq 1 ${1:-25}` ; do 
  (while true ; do phantomjs url_worker.js > /dev/null 2>> /tmp/phantom_errors ; done) &
done

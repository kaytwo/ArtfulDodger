#!/bin/bash
# launch 25 instances by default; first arg can be diff number of instances
for i in `seq 1 ${1:-25}` ; do 
  (while true ; do phantomjs url_worker.js > /dev/null 2>> /tmp/phantom_errors ; done) &
done

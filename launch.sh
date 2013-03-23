#!/bin/bash
for i in `seq 1 25` ; do 
  (while true ; do phantomjs url_worker.js 2>> /tmp/phantom_errors ; done) &
done

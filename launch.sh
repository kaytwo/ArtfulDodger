#!/bin/bash
for i in `seq 1 25` ; do 
  (while true ; do phantomjs url_worker.js 2>&1 >> /tmp/phantom_out ; done) &
done

#!/bin/bash
for i in `seq 1 10` ; do 
  (while true ; do phantomjs render_multi_url.js &> /dev/null ; done) &
done

#!/bin/bash
for i in `seq 1 50` ; do 
  (while true ; do phantomjs render_multi_url.js &> /dev/null ; done) &
done

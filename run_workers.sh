#!/bin/bash

# ./run_workers.sh NUM_URLS NUM_INSTANCES BROWSER_ID WEBDIS_HOST WEBDIS_PORT SCRIPT_PATH
python clear_queues.py

NUM_URLS=${1:-100}
python test_source.py $NUM_URLS

NUM_INSTANCES=${2:-10}
BROWSER_ID=$3
WEBDIS_HOST=${4:-"localhost"}
WEBDIS_PORT=${5:-"7379"}
SCRIPT_PATH=${6:-"/home/ec2-user/ArtfulDodger/"}

echo "Crawling..."
cd $SCRIPT_PATH
if [ ! -d "crawlresults" ] 
then 
    mkdir "crawlresults"
fi
if [ ! -d "crawlresults/sshots" ]
then
    mkdir "crawlresults/sshots"
fi

if [ $BROWSER_ID ]
then
    for i in `seq 1 $NUM_INSTANCES` ; do
      phantomjs --web-security=no url_worker.js $BROWSER_ID $WEBDIS_HOST $WEBDIS_PORT > /dev/null &
    done
else
    for i in `seq 1 $NUM_INSTANCES` ; do
      phantomjs --web-security=no url_worker.js > /dev/null &
    done
fi

#Loop until all phantom processes are killed.
START=$(date +"%s")
until [ $(ps aux | grep phantomjs | wc -l) -eq 1 ]
do
    sleep 5; 
done
END=$(date +"%s")
CRAWLED=$(python get_len.py)
echo $NUM_URLS " " $NUM_INSTANCES " " $BROWSER_ID " time: " $(($END - $START)) " crawled: " $CRAWLED >> results.txt
python result_sink.py 

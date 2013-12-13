#!/bin/bash

# ./run_workers.sh NUM_URLS NUM_INSTANCES BROWSER_ID WEBDIS_HOST WEBDIS_PORT SCRIPT_PATH
killall phantomjs 2> /dev/null
python clear_queues.py

NUM_URLS=${1:-100}
python test_source.py $NUM_URLS > /dev/null

NUM_INSTANCES=${2:-10}
BROWSER_ID=$3
WEBDIS_HOST=${4:-"localhost"}
WEBDIS_PORT=${5:-"7379"}
SCRIPT_PATH=${6:-"/home/ec2-user/ArtfulDodger/"}

echo "Crawling..."

if [ ! -d "/tmp/crawlresults" ] 
then 
    mkdir "/tmp/crawlresults"
fi
if [ ! -d "/tmp/crawlresults/sshots" ]
then
    mkdir "/tmp/crawlresults/sshots"
fi

cd $SCRIPT_PATH
if [ $BROWSER_ID ]
then
    for i in `seq 1 $NUM_INSTANCES` ; do
      (phantomjs --web-security=no url_worker.js $BROWSER_ID $WEBDIS_HOST $WEBDIS_PORT >& /dev/null) &
    done
else
    for i in `seq 1 $NUM_INSTANCES` ; do
      (phantomjs --web-security=no url_worker.js >& /dev/null) &
    done
fi

#Loop until all phantom processes are killed.
START=$(date +"%s")
until [ $(ps aux | grep phantomjs | wc -l) -eq 1 ]
do
    sleep 5; 
done
END=$(date +"%s")

CRAWLED=$(python /home/ec2-user/crawler_extra/get_len.py)
echo $NUM_URLS " " $NUM_INSTANCES " " $BROWSER_ID " time: " $(($END - $START)) " crawled: " $CRAWLED >> /tmp/crawl_analytics.txt

python result_sink.py

rm dump.rdb 2> /dev/null 

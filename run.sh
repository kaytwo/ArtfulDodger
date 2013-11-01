#!/bin/sh

#Testing crawler. (Change to include launching multiple workers later)

python clear_queues.py

echo "Inserting URLs in crawlqueue"
if [ $1 ]
then
    python test_source.py $1
else
    python test_source.py
fi
echo

echo "DA CRAWL..."
if [ $2 ]
then
    phantomjs --web-security=no url_worker.js $2
else
    phantomjs --web-security=no url_worker.js
fi
echo

echo "Saving results"
python result_sink.py

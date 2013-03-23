import bz2
import json
from hashlib import md5
import redis
import sys
import time

'''add urls to the queue, four per second, from the alexa top 1M'''

infile = 'top-1m.csv.bz2'
numurls = int(sys.argv[1]) if len(sys.argv) > 1 else 0
r = redis.StrictRedis(host='localhost',port=6379,db=0)
urls_added = 0
with bz2.BZ2File(infile) as f:
  for line in f.readlines():
    if len(line.strip()) > 0:
      url = 'http://' + line.split(',')[1].strip()
      insertme = json.dumps({'url':url})
      res = r.lpush('resque:crawlqueue',insertme)
    urls_added += 1
    if numurls > 0 and numurls < urls_added:
      print "inserted %d urls" % urls_added
      sys.exit()

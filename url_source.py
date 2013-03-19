import bz2
import json
from hashlib import md5
import redis
import sys
import time

'''add urls to the queue, four per second, from the alexa top 1M'''

infile = sys.argv[1] if len(sys.argv) == 2 else 'top-1m.csv.bz2'

r = redis.StrictRedis(host='localhost',port=6379,db=0)
with bz2.BZ2File(infile) as f:
  for line in f.readlines():
    if len(line.strip()) > 0:
      url = 'http://' + line.split(',')[1].strip()
      insertme = json.dumps({'url':url})
      res = r.lpush('resque:crawlqueue',insertme)
      print "inserted",url
      time.sleep(.25)

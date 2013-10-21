import bz2
import json
from hashlib import md5
import redis
import sys
import time

'''add urls to the queue, four per second, from the alexa top 1M'''

infile = 'top-1m.csv.bz2'
numurls = int(sys.argv[1]) if len(sys.argv) > 1 else 100
r = redis.StrictRedis(host='localhost',port=6379,db=0)
r.lpush('resque:crawlqueue', json.dumps({'url':'http://www.youtube.com'}))
'''urls_added = 0
try:
  f = bz2.BZ2File(infile)
  for line in f.readlines():
    if len(line.strip()) > 0:
      url = 'http://' + line.split(',')[1].strip()
      insertme = json.dumps({'url':url})
      res = r.lpush('resque:crawlqueue',insertme)
      urls_added += 1
      if numurls > 0 and urls_added == numurls:
        print "inserted %d urls" % urls_added
        sys.exit()
except:
  pass'''

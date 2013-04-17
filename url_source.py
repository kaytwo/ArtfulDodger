import bz2
import json
from hashlib import md5
import redis
import sys
import time
import urlparse

'''add urls to the queue from a file of newline separated URLs'''

if len(sys.argv) != 2:
  print "first arg is list of newline-separated URLs to crawl"
  sys.exit()
infile = sys.argv[1]
r = redis.StrictRedis(host='10.105.1.41',port=6379,db=0)
urls_added = 0
try:
  f = open(infile)
  for line in f.readlines():
    
    if len(line.strip()) > 0:
      url = line.strip()
      insertme = json.dumps({'tag':infile,'url':url})
      res = r.lpush('resque:crawlqueue',insertme)
      urls_added += 1
except:
  print "error with the file"
  pass
print "inserted %d urls" % urls_added

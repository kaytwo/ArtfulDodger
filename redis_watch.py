import json
from hashlib import md5
import redis
import sys
import time

'''super simple web crawl result consumer'''

numsecs = float(3)
r = redis.StrictRedis(host='localhost',port=6379,db=0)
nownum =  r.get('resque:outputs')
while True:
  time.sleep(numsecs)
  newnum = r.get('resque:outputs')
  newreqs = (int(newnum) - int(nownum)) / numsecs
  print "%.2f requests/sec" % newreqs
  print "inqlen:",r.llen('resque:crawlqueue')
  print "outqlen:",r.llen('resque:resultqueue')
  nownum = newnum

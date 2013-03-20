import json
from hashlib import md5
import redis
import sys

'''super simple web crawl result consumer'''

outpath = sys.argv[1] if len(sys.argv) == 2 else '/tmp/'

r = redis.StrictRedis(host='localhost',port=6379,db=0)
while True:
  res = r.brpop('resque:resultqueue',1)
  if res:
    r.incr('resque:outputs',1)
    val = json.loads(res[1])
    filekey = md5(val['url']).hexdigest()
    with open(outpath + '/' + filekey,'w') as f:
      f.write(res[1])
  else:
    print "queue empty, blocking pop again"
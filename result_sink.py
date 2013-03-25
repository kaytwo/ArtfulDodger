import json
from base64 import b64decode
from hashlib import md5
import redis
import sys

'''super simple web crawl result consumer'''

outpath = sys.argv[1] if len(sys.argv) == 2 else '/tmp/'

r = redis.StrictRedis(host='localhost',port=6379,db=0)
while True:
  print "brpop"
  res = r.brpop('resque:resultqueue',5)
  if res:
    r.incr('resque:outputs',1)
    try:
        val = json.loads(res[1])
    except:
        continue
    filekey = md5(val['url']).hexdigest()
    if 'sshot' in val:
      with open(outpath + '/domout-' + filekey + '.png','w') as f:
        f.write(b64decode(val['sshot']))
        del val['sshot']
    # this is just example code, don't spam out the entire DOM
    val['dom'] = val['dom'][:100]
    with open(outpath + '/domout-' + filekey,'w') as f:
      f.write(json.dumps(val))

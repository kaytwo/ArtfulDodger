import json
from base64 import b64decode
from hashlib import md5
import os
from os import system
import redis
import sys
import time
from shutil import move

'''super simple web crawl result consumer'''

outpath = sys.argv[1] if len(sys.argv) == 2 else '/tmp/'
tmppath = '/tmp/'
r = redis.StrictRedis(host='localhost',port=6379,db=0)
waits = 0
outputs = 0
while True:
  today = time.strftime('%Y%m%d%H')
  todayfn = '/doms.' + today + '.json'
  todayfile = tmppath + todayfn
  permfile = outpath + todayfn
  with open(todayfile,'a') as f:
    while today == time.strftime('%Y%m%d%H'):
      res = r.brpop('resque:resultqueue',5)
      if res:
        outputs += 1
        r.incr('resque:outputs',1)
        try:
            val = json.loads(res[1])
        except:
            continue
        filekey = md5(val['url']).hexdigest()
        if 'sshot' in val:
          pngout_dir = outpath + '/sshots/' + filekey[:2] + '/'
          system('mkdir -p %s' % pngout_dir)
          now = val.get('ts',time.time() * 1000)
          with open('%s/%s-%s.png' % (pngout_dir,filekey,now),'w') as pngfd:
            pngfd.write(b64decode(val['sshot']))
            del val['sshot']
        # ck: i have NO IDEA why this line is here.
        val['dom'] = val['dom']
        f.write(json.dumps(val)+'\n')
        f.flush()
      else:
        waits += 1
      sys.stdout.write('\rwaits: %d\tresults: %d'%(waits,outputs))
      sys.stdout.flush()
  move(todayfile,permfile)

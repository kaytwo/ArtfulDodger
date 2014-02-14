import json
import BeautifulSoup
from base64 import b64decode
from hashlib import md5
import os
from os import system
import redis
import sys
import time
from shutil import move
from BeautifulSoup import BeautifulSoup as bs
from boto.s3.connection import S3Connection
from boto.s3.key import Key

'''super simple web crawl result consumer'''

r = redis.StrictRedis(host='localhost', port=6379,db=0)

conn = S3Connection('AKIAIEL2KOC7UHJGBRBQ', 'OZWKtALKGWwtTTeZYtG0R7Aqm89NeZGtN5IuFrGx')
bucket = conn.get_bucket('adblocker')

today = time.strftime('%Y%m%d%H')

key_metadata = Key(bucket)
key_metadata.key = today + '/doms.json'

key_domtree = Key(bucket)
key_domtree.key = today + '/trees.json'

waits = 0
outputs = 0
r_in_queue = r.llen('resque:crawlqueue')
ex = 0

while today == time.strftime('%Y%m%d%H'):
    res = r.brpop('resque:resultqueue',5)
    if res:
        now = val.get('ts',time.time() * 1000)
        outputs += 1
        r.incr('resque:outputs', 1)
        try:
            val = json.loads(res[1])
        except:
            continue
        filekey = md5(val['url']).hexdigest()
        if 'sshot' in val:
            sshot = b64decode(val['sshot'])
            #upload to s3: today/sshots/filekey_now.png
            del val['sshot']
        val['dom'] = val['dom']
        
        soup = bs(val['dom'])
        domtree = soup.prettify()
        #append domtree and it's URL's md5 and timestamp (now) to today/domtrees.json
        
        #append json.dumps(val) to string to write to today/doms.json

    else:
        waits += 1
    sys.stdout.write('\rwaits: %d\tresults: %d'%(waits,outputs))
    sys.stdout.flush()
    if (ex == 1) : sys.exit()

'''outpath = sys.argv[1] if len(sys.argv) >= 2 else '/tmp/crawlresults/'
sample_sshot = True if len(sys.argv) >= 3 else False
tmppath = '/tmp/crawlresults/'
r = redis.StrictRedis(host='localhost',port=6379,db=0)
waits = 0
outputs = 0
r_in_queue = r.llen('resque:resultqueue')
ex = 0
while True:
  today = time.strftime('%Y%m%d%H')
  todayfn = '/doms.' + today + ',json'
  todayfile = tmppath + todayfn
  permfile = outpath + todayfn
  print todayfile
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
          if (not sample_sshot) or (sample_sshot and filekey.find('00') == 0):
            pngout_dir = outpath + '/sshots'
            now = val.get('ts',time.time() * 1000)
            with open('%s/%s-%s.png' % (pngout_dir,filekey,now),'w') as pngfd:
              pngfd.write(b64decode(val['sshot']))
          del val['sshot']
        # ck: i have NO IDEA why this line is here.
        val['dom'] = val['dom']
        soup=bs(val['dom'])
        print val['domtree']
        f.write(json.dumps(val)+'\n')
        f.flush()
        if (outputs == r_in_queue) : ex = 1
      else:
        waits += 1
      sys.stdout.write('\rwaits: %d\tresults: %d'%(waits,outputs))
      sys.stdout.flush()
      if (ex == 1) : sys.exit()
  move(todayfile,permfile)
'''

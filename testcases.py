import bz2
import json
from hashlib import md5
import redis
import sys
import time

'''add urls to the queue, four per second, from the alexa top 1M'''

infile = sys.argv[1] if len(sys.argv) == 2 else 'top-1m.csv.bz2'
testcases = [
    # 'http://fre3ecreditreport.com'
    # 'http://sphider.eu',
    # 'http://qq.com',
    # 'http://taobao.com',
    # 'http://googleusercontent.com',
    # 'http://mail.ru',
    # 'http://tumblr.com',
    'http://pinterest.com'
    # 'http://google.com.br',
    # 'http://fc2.com',
    # 'http://google.ru',
    # 'http://conduit.com',
    # 'http://paypal.com',
    # 'http://xvideos.com',
    # 'http://amazon.co.jp',
    # 'http://ask.com',
    # 'http://babylon.com',
    # 'http://craigslist.org'
    
    # 'http://localhost:9999',
    # 'http://ckanich.uicbits.net/jsredir-start',
    # 'http://www.searchtools.com/test/redirect/meta-refresh-1.html',
    # 'http://www.searchtools.com/test/redirect/meta-refresh-10.html'
    ]

r = redis.StrictRedis(host='localhost',port=6379,db=0)
r.delete('resque:crawlqueue')
for url in testcases:
    insertme = json.dumps({'url':url})
    res = r.lpush('resque:crawlqueue',insertme)
    print "inserted",url

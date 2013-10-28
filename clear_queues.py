import json
import redis
import sys

r = redis.StrictRedis(host='localhost',port=6379,db=0)
r.delete('resque:crawlqueue')
r.delete('resque:resultqueue')
r.delete('resque:retriestable') 
sys.exit()

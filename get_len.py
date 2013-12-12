import redis
import sys

r = redis.StrictRedis(host='localhost',port=6379,db=0)
print r.llen('resque:resultqueue')

#! /usr/bin/python

import httplib2

resp, content = httplib2.Http().request("http://ec2-54-211-182-91.compute-1.amazonaws.com:8080/fetchProfiles")

try:
    f = open(".browserProfiles.json", "w")
    try:
        f.write(content)
    finally:
        f.close()
except IOError:
    pass

print 'Updated'

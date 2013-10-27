#! /usr/bin/python

import httplib2

resp, content = httplib2.Http().request("http://localhost:8080/fetchProfiles")

try:
    f = open(".browserProfiles.json", "w")
    try:
        f.write(content)
    finally:
        f.close()
except IOError:
    pass

print 'Updated'

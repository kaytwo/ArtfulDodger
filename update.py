#! /usr/bin/python

import httplib2

resp, content = httplib2.Http().request("http://54.196.96.70:8080/fetchProfiles")

try:
    f = open(".browser_profiles.json", "w")
    try:
        f.write(content)
    finally:
        f.close()
except IOError:
    pass

print 'Updated'

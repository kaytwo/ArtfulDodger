#! /usr/bin/python

import httplib2

resp, content = httplib2.Http().request("http://ec2-54-234-255-218.compute-1.amazonaws.com:8080/fetchProfiles")

try:
    f = open(".browser_profiles.json", "w")
    try:
        f.write(content)
    finally:
        f.close()
except IOError:
    pass

print 'Updated'

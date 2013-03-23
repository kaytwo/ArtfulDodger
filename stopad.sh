#!/bin/bash
ps -ef | grep launch.sh  | grep -v grep | awk '{print $2}' |  xargs kill ; killall phantomjs

#!/bin/bash

mkdir /mnt/squid
chown proxy:proxy /mnt/squid
service squid3 restart
cd /home/ubuntu/ArtfulDodger
sudo -u ubuntu git pull
sudo -u ubuntu /home/ubuntu/ArtfulDodger/launch.sh 10 /home/ubuntu/ArtfulDodger/ tsq.aws.uicbits.net

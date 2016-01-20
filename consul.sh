#!/bin/bash

IFACE=wlp2s0
IP=$(ifconfig $IFACE |grep "inet addr:" | awk '{ print $3}' |cut -d ':' -f2)

#TAGS="-tag hex-name=dev -tag hex-id=dev -tag arch=x86_64 -tag role=master"

./binaries/$(uname -m)/consul agent -dev -dc lab -node n1 -advertise $IP
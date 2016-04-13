#!/bin/bash

IFACE=$1
IP=$(ifconfig $IFACE |grep "inet addr:" | awk '{ print $3}' |cut -d ':' -f2)
ID=$(ifconfig $IFACE |grep "HWaddr " | awk '{ print tolower($5)}' | tr -d ':')

#TAGS="-tag hex-name=dev -tag hex-id=dev -tag arch=x86_64 -tag role=master"

./lib/consul/consul-$(uname -m) agent -dev -dc lab -node $ID -advertise $IP -ui
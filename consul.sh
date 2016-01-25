#!/bin/bash

IFACE=wlp2s0
IP=$(ifconfig $IFACE |grep "inet addr:" | awk '{ print $3}' |cut -d ':' -f2)
ID=$(ifconfig $IFACE |grep "HWaddr " | awk '{ print tolower($5)}' | tr -d ':')

#TAGS="-tag hex-name=dev -tag hex-id=dev -tag arch=x86_64 -tag role=master"

./binaries/$(uname -m)/consul agent -dev -dc lab -node $ID -advertise $IP -ui -ui-dir ./binaries/consul/consul-ui-0.6.0
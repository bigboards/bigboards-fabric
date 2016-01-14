#!/bin/bash

INT_IFACE="eth0"
EXT_IFACE="eth0"

TAGS="-tag hex-name=dev -tag hex-id=dev -tag arch=x86_64 -tag role=master"

INT_IFCFG="ifconfig $INT_IFACE"
INT_IP=$($INT_IFCFG | grep 'inet ' | awk '{ print $2}')
INT_BCAST=$($INT_IFCFG | grep 'inet ' | awk '{ print $6}')
INT_MASK=$($INT_IFCFG | grep 'inet ' | awk '{ print $4}')
INT_MAC=$($INT_IFCFG | grep 'ether ' |  awk '{ print $2}')
TAGS="${TAGS} -tag network.internal=${INT_IFACE}"
TAGS="${TAGS} -tag network.${INT_IFACE}.ip=${INT_IP}"
TAGS="${TAGS} -tag network.${INT_IFACE}.netmask=${INT_BCAST}"
TAGS="${TAGS} -tag network.${INT_IFACE}.broadcast=${INT_MASK}"
TAGS="${TAGS} -tag network.${INT_IFACE}.mac=${INT_MAC}"

EXT_IFCFG="ifconfig $EXT_IFACE"
EXT_IP=$($EXT_IFCFG | grep 'inet ' | awk '{ print $2}')
EXT_BCAST=$($EXT_IFCFG | grep 'inet ' | awk '{ print $6}')
EXT_MASK=$($EXT_IFCFG | grep 'inet ' | awk '{ print $4}')
EXT_MAC=$($EXT_IFCFG | grep 'ether ' |  awk '{ print $2}')
TAGS="${TAGS} -tag network.external=${EXT_IFACE}"
TAGS="${TAGS} -tag network.${EXT_IFACE}.ip=${EXT_IP}"
TAGS="${TAGS} -tag network.${EXT_IFACE}.netmask=${EXT_BCAST}"
TAGS="${TAGS} -tag network.${EXT_IFACE}.broadcast=${EXT_MASK}"
TAGS="${TAGS} -tag network.${EXT_IFACE}.mac=${EXT_MAC}"

serf agent -node dev-n1 ${TAGS}
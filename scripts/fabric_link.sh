#!/bin/bash

HIVE_URL="http://localhost:8001"

CONF_DIR="../etc/"
BIN_DIR="../binaries/"

CONSUL_VERSION="0.6.4"

[ -e "${CONF_DIR}/consul.conf" ] && source "${CONF_DIR}/consul.conf"

KEY=$1
if [ -z $1 ]; then
    KEY=$(${BIN_DIR}/consul/consul-${CONSUL_VERSION}-$(uname -m) keygen)
fi

echo "using key ${KEY}"
# Fabric

Fabric makes it easy to manage clusters across multiple devices. Deploying your
application is as easy as making a simple ReST call to one of the nodes. The fabric
will take care of installing the application on all the nodes that are part of a 
cluster.

## Running Fabric
A _fabric.sh_ shell script is available to easily start the fabric on a host. There 
are however a few requirements that have to be met first.

### Requirements
 - Docker - Docker should be installed together with support for AUFS
 - Passwordless sudo - The user running the fabric needs to be able to become sudo without entering a password.
 - data directory rights - The data directory has to be writable for the user running the fabric
 
### Configuration
The fabric.sh script requires a configuration file to be passed to it. The following code
snippet shows an example of the configuration values:

```
port: 7000
nic: wlp2s0
data_dir: /tmp/data
hive_host: hive.bigboards.io
hive_port: 80
```

 - **port** - The port on which the ReST API is made available
 - **nic** - The name of the network interface to be used
 - **data_dir** - The location to store the data
 - **hive_host** - The hostname of the host running the hive server
 - **hive_port** - The port of the hive server 
 
### Run
```
# >  cd <fabric-home>
# > ./fabric.sh <your-config-file>
```

## Current Status
Currently we are able to set up clusters in our lab environment running all intel 
nodes using ubuntu 14.04 LTS. 

ARM nodes have not been tested yet, neither have other Operating Systems.

## Roadmap
 - Test on Intel
 - Test on ARM
 - Implement events to give feedback to a user when a tint is installing.
 - Do a descent cleanup if a node is removed from a cluster
 - Create API documentation
 - Gather feedback and see how we can improve

## API
Decent API documentation is on the todo list, For now a list of the endpoints can be found here.

### Node Status
#### GET /v1/status
Get information about the node you are currently connected to

### Node Cluster Membership
#### POST /v1/membership
Make this node a member of a cluster. For this a specific payload has to be provided:

```
{
  "name": "",       // the name of your cluster ([a-Z,0-9,-,_]
  "key": "",        // the encryption token used for the cluster
  "role": "",       // the role this node would take in this cluster (server or client)
  "nodes": [ ],     // a list of other nodes that are part of the cluster (min. 1)
  "servers": 2      // the number of quorum members (max. 5) in the cluster; must be identical for all members!
}
```

#### DELETE /v1/membership
Remove this node from the cluster. Make sure you first uninstall the tint 
before doing this, since there is no cleanup operation yet.

### Node Cluster Membership Status
Information about the link between this node and the cluster

#### GET /v1/membership/status
Get information on the status of the node-to-cluster link

#### POST /v1/membership/status
Start the node-to-cluster-link. No request body is required

#### DELETE /v1/membership/status
Disable the node-to-cluster link without permanently leaving the cluster.

### Cluster Status
#### GET /v1/cluster

### Cluster Services
#### GET /v1/cluster/services
Get a list of the services provided by the cluster. When you install a tint,
it will most likely add a collection of services to the cluster. 

### Cluster Settings
#### GET /v1/cluster/settings
Read the cluster settings. 

#### POST /v1/cluster/settings
Overwrite the cluster settings.

### Cluster Nodes
#### GET /v1/cluster/nodes
#### GET /v1/cluster/nodes/:id

### Cluster Tints
Tints are the application stacks you install on top of your cluster. This part of the api 
allows you to install, uninstall and list the tints of your choice.

A tint is always linked to a profile and has a unique name within the profile 
namespace ( slug ). The combination of the profile and the slug provides a
unique way of identifying tints.

#### GET /v1/cluster/tints
Get a list of the tints currently installed on the cluster

#### POST /v1/cluster/tints
Install a tint onto the cluster.

Below is an example of the request body for installing an elasticsearch tint.
```
{
  "profile": {
    "id": "google-oauth2-103728492012393057640",
    "name": "Daan Gerits",
    "email": "daan.gerits@bigboards.io"
  },
  "slug": "elasticsearch",
  "name":"ElasticSearch",
  "logo": "https://www.elastic.co/static/img/elastic-logo-200.png",
  "description": "Search and analyze data in real-time",
  "version": "2.2.0",
  "services": [
    {
      "name": "ElasticSearch",
      "description": "The ElasticSearch Engine",
      "id": "elasticsearch",
      "daemons": [
        {
          "name": "engine",
          "instances": "all",
          "id": "engine",
          "driver": "docker",
          "configuration": {
            "Image": "bigboards/elasticsearch-x86_64",
            "PortBindings": {
              "9200/tcp": [{ "HostPort": "9200" }],
              "9300/tcp": [{ "HostPort": "9300" }]
            },
            "Cmd": "/elasticsearch/bin/elasticsearch",
            "Mounts": [
              {
                "Source": "resource:config/config/elasticsearch",
                "Destination": "/elasticsearch/config",
                "RW": true
              }
            ]
          }
        }
      ]
    }
  ],
  "resources": [
    {
      "provider": "git",
      "settings": {
        "url": "https://github.com/bigboards/bb-stack-elasticsearch.git"
      },
      "id": "config"
    }
  ],
  "views": [
    {
      "type": "web",
      "name": "Kopf",
      "description": "A simple ui to manage elasticsearch",
      "service": "elasticsearch",
      "daemon": "engine",
      "port": "9200",
      "protocol": "http",
      "path": "/_plugins/kopf"
    }
  ]
}
```
#### GET /v1/cluster/tints/:profile/:slug
Get details about the tint with profile _:profile_ and slug _:slug_

#### DELETE /v1/cluster/tints/:profile/:slug
Uninstall the tint with profile _:profile_ and slug _:slug_

## License
The fabric is licensed under the Apache License v2.0

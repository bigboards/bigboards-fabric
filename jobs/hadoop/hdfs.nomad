# Define a job called my-service
job "hdfs" {
  # Spread tasks between us-west-1 and us-east-1
  datacenters = ["jill"]

  # run this with service scheduler
  type = "service"

  # Rolling updates should be sequential
  update {
    stagger = "30s"
    max_parallel = 1
  }

  group "namenode" {
    count = 1

    task "namenode" {
      driver = "docker"
      config {
        image = "bigboards/hadoop-x86_64"
        command = "/opt/hadoop/bin/hdfs-namenode-wrapper.sh"
        port_map = {
          webui = 50070
          webui-https = 50470
          meta = 8020
        }
      }
      service {
        port = "webui-http"
        check {
          type = "http"
          path = "/"
          interval = "10s"
          timeout = "2s"
        }
      }
      resources {
        cpu = 1000
        memory = 2048
        network {
          mbits = 100

          port "webui" { static = 50070 }
          port "webui-https" { static = 50470 }
          port "meta" { static = 8020 }
        }
      }
    }
  }

  group "datanodes" {
    count = 3

    task "elasticsearch" {
      driver = "docker"
      config {
        image = "bigboards/hadoop-x86_64"
        command = "/opt/hadoop/bin/hdfs --config /opt/hadoop/etc/hadoop datanode"
        port_map = {
          webui-http = 50075
          webui-https = 50475
          data = 50010
          ipc = 50020
        }
      }
      service {
        port = "webui-http"
        check {
          type = "http"
          path = "/"
          interval = "10s"
          timeout = "2s"
        }
      }
      resources {
        cpu = 1000
        memory = 2048
        network {
          mbits = 100

          port "webui-http" { static = 50075 }
          port "webui-https" { static = 50475 }
          port "data" { static = 50010 }
          port "ipc" { static = 50020 }
        }
      }
    }
  }
}
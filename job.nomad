# Define a job called my-service
job "elasticsearch" {
    # Spread tasks between us-west-1 and us-east-1
    datacenters = ["test-cluster"]

    # run this with service scheduler
    type = "service"

    # Rolling updates should be sequential
    update {
        stagger = "30s"
        max_parallel = 1
    }

    group "elasticsearch" {
        # We want 5 web servers
        count = 1

        # Create a web front end using a docker image
        task "elasticsearch" {
            driver = "docker"
            config {
                image = "elasticsearch:2.3"
                port_map = {
                    rest = 9200
                    native = 9300
                }
            }
            service {
                port = "rest"
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

                    port "rest" { }

                    port "native" { }
                }
            }
        }
    }
}
## Run container

docker run --name=prometheus-unifi-sd --restart unless-stopped -d -p 3005:3000 -e NODE_TLS_REJECT_UNAUTHORIZED=0 lspiehler/prometheus-unifi-sd:latest
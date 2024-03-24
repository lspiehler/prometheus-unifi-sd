# prometheus-unifi-sd

Provides Prometheus a list of Unifi APs and Switches as targets via HTTP service discovery to be scraped via SNMP with the snmp_exporter. Basic authentication is used to pass the credentials along to the unifi controller. The controller IP is passed in the URL as the "target" query parameter. The "type" parameter is passed to get the desired device type from the API. "usw" for switches and "uap" for APs. The "label" parameter is a comma separated list of labels to be returned with each target. Valid labels can be any device attribute returned by the unifi API api/s/{site}/stat/device endpoint. https://ubntwiki.com/products/software/unifi-controller/api

This has only been tested using the API on a Unifi Dream Machine and may require the use of a different path for the API on other controllers

## Run container
```
docker run --name=prometheus-unifi-sd --restart unless-stopped -d -p 3005:3000 -e NODE_TLS_REJECT_UNAUTHORIZED=0 lspiehler/prometheus-unifi-sd:latest
```

## Configure Prometheus
Example to scrape Unifi switches via SNMP
```
- job_name: interfaces
    scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
    scrape_timeout: 15s
    metrics_path: /snmp
    params:
      module: [interfaces]
      auth: [unifi_v3]
    http_sd_configs:
      - url: "http://prometheus-unifi-sd:3000/unifi?target=https://10.2.0.1&type=usw&labels=type,model,name,mac"
        basic_auth:
          username: <unifi_user>
          password: <unifi password>
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: snmp_exporter:9116
```
Example to scrape Unifi APs via SNMP
```
  - job_name: wifi
    metrics_path: /snmp
    params:
      module: [ubiquiti_unifi]
      auth: [unifi_v3]
    http_sd_configs:
      - url: "http://prometheus-unifi-sd:3000/unifi?target=https://10.2.0.1&type=uap&labels=type,model,name,mac"
        basic_auth:
          username: <unifi_user>
          password: <unifi password>
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: snmp_exporter:9116
```

## Output
Example HTTP response from the service
```
[
  {
    "targets": [
      "192.168.0.249"
    ],
    "labels": {
      "type": "uap",
      "model": "U7MSH",
      "name": "AP1",
      "mac": "f0:9f:c2:d6:a5:b4"
    }
  },
  {
    "targets": [
      "192.168.0.175"
    ],
    "labels": {
      "type": "uap",
      "model": "U6M",
      "name": "AP2",
      "mac": "ac:8b:a9:da:51:60"
    }
  },
  {
    "targets": [
      "192.168.0.11"
    ],
    "labels": {
      "type": "uap",
      "model": "U7PG2",
      "name": "AP3",
      "mac": "fc:ec:da:f3:0e:31"
    }
  }...
```
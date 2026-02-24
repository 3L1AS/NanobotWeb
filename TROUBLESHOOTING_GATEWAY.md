# Gateway Connection Troubleshooting

## Current State
The Dashboard UI is accessible from the internet over port `3000`, but the internal API proxy ping from the Next.js Dashboard container to the Nanobot Gateway container is failing with `ECONNREFUSED`.

## Why this is happening
We moved both containers into a shared Docker bridge network to communicate via internal DNS (`http://nanobot-gateway:18790`). An `ECONNREFUSED` error exactly at this stage means that the Dashboard container *successfully* resolved the DNS and reached the Gateway container, but the Gateway container actively slapped the connection away.

The #1 reason for this in Docker: **The Nanobot Gateway Python server is binding to `127.0.0.1` or `localhost` internally instead of `0.0.0.0`.**

When a server inside a container binds to `127.0.0.1`, it only accepts requests generated *from inside its own container*. It will explicitly reject requests from *other* containers (like our Dashboard), even if they share the same Docker network.

## Next Steps When You Return

### 1. Change Gateway Server Binding to `0.0.0.0` (The Fix!)
We need to ensure the main Nanobot Gateway listens on all network interfaces. 
You will need to check the source code/config of your main `nanobot` gateway. Where it boots up the Python web server on port `18790`, make sure the host is set to `0.0.0.0` instead of `127.0.0.1` or `localhost`.
- *Example in python/FastAPI/uvicorn:* `uvicorn.run(app, host="0.0.0.0", port=18790)`
- *Example in Flask:* `app.run(host="0.0.0.0", port=18790)`

After applying this change, restart the Gateway container.

### 2. Verify Exact Container & Network Names
Just to be completely sure Docker can resolve the DNS, confirm these two values via the terminal:

**Container Name:**
Run `docker ps` and find the Gateway container name. Update your `docker-compose.yml`:
```yaml
environment:
  - GATEWAY_URL=http://<ACTUAL_CONTAINER_NAME>:18790
```

**Network Name:**
Run `docker network ls` and find the network name (usually ends in `_default`). Update your `docker-compose.yml`:
```yaml
networks:
  shared_nanobot_net:
    external: true
    name: <ACTUAL_NETWORK_NAME>
```

Once the gateway binds to `0.0.0.0` and the names match, the Dashboard will instantly light up green. Have a great time away, and we can pick this right back up when you're ready!

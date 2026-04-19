FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y icecast2 && rm -rf /var/lib/apt/lists/*
COPY icecast.xml /etc/icecast2/icecast.xml
EXPOSE 8000
CMD ["icecast2", "-c", "/etc/icecast2/icecast.xml"]

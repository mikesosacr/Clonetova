FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y icecast2 && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/icecast2 /var/log/icecast2 \
    && chown -R icecast2:icecast /run/icecast2 /var/log/icecast2
COPY icecast.xml /etc/icecast2/icecast.xml
RUN chown icecast2:icecast /etc/icecast2/icecast.xml
EXPOSE 8000
USER icecast2
CMD ["icecast2", "-c", "/etc/icecast2/icecast.xml"]

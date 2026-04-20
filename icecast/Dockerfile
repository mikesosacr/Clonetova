FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    libvorbis-dev \
    libogg-dev \
    libtheora-dev \
    libspeex-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*
RUN curl -L https://github.com/karlheyes/icecast-kh/archive/refs/tags/icecast-2.4.0-kh22.tar.gz | tar xz \
    && cd icecast-kh-icecast-2.4.0-kh22 \
    && ./configure --prefix=/usr/local \
    && make -j$(nproc) \
    && make install \
    && cd .. && rm -rf icecast-kh-icecast-2.4.0-kh22
RUN useradd -r -s /bin/false icecast \
    && mkdir -p /var/log/icecast /var/run/icecast \
    && chown icecast:icecast /var/log/icecast /var/run/icecast
COPY icecast.xml /usr/local/etc/icecast.xml
RUN chown icecast:icecast /usr/local/etc/icecast.xml
EXPOSE 8000
USER icecast
CMD ["icecast", "-c", "/usr/local/etc/icecast.xml"]

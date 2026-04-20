FROM savonet/liquidsoap:v2.2.5

USER root

WORKDIR /app
COPY radio.liq /app/radio.liq
VOLUME ["/app/media"]

CMD ["liquidsoap", "/app/radio.liq"]

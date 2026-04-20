#!/usr/bin/liquidsoap
# radio.liq — Liquidsoap 2.2.5
# Lee configuración desde variables de entorno.
# El backend crea un contenedor por stream con sus propias variables.

# ─── Configuración desde entorno ─────────────────────────────────────────────
let backend_url  = environment.get("BACKEND_URL")   # http://centovacast-backend:8001
let icecast_host = environment.get("ICECAST_HOST")  # centovacast-icecast
let icecast_port = int_of_string(environment.get("ICECAST_PORT"))   # 8000
let icecast_pass = environment.get("ICECAST_PASSWORD")              # fuente123
let mount_point  = environment.get("MOUNT_POINT")   # /osaradio
let stream_id    = environment.get("STREAM_ID")     # UUID del stream
let api_token    = environment.get("API_TOKEN")     # JWT permanente

# ─── Logging ──────────────────────────────────────────────────────────────────
log.level := 3

# ─── Función: pedir siguiente track al backend (AutoDJ) ─────────────────────
# Retorna la ruta del archivo de audio o "" si falla.
def get_next_track() =
  let url = "#{backend_url}/api/autodj/next-track?stream_id=#{stream_id}"
  let headers = [
    ("Authorization", "Bearer #{api_token}"),
    ("Content-Type", "application/json")
  ]
  let body = http.get(headers=headers, url)
  log("AutoDJ response: #{body}")

  # Parsear JSON: {"file_path": "/app/media/track.mp3", "title": "..."}
  let json.parse ({file_path}: {file_path: string}) = body
  file_path
end

# ─── Función: actualizar metadata en IceCast via backend ────────────────────
def update_metadata(~title, ~artist) =
  let url = "#{backend_url}/api/streams/#{stream_id}/metadata"
  let payload = '{"title":"#{title}","artist":"#{artist}"}'
  let headers = [
    ("Authorization", "Bearer #{api_token}"),
    ("Content-Type", "application/json")
  ]
  ignore(http.put(headers=headers, data=payload, url))
end

# ─── Source: playlist dinámica desde AutoDJ ──────────────────────────────────
# request.dynamic genera una request nueva cada vez que Liquidsoap
# necesita el siguiente track, llamando a nuestra función.
autodj =
  request.dynamic(
    id="autodj",
    # Creamos una request de tipo URI con el path devuelto por el backend
    fun () ->
      begin
        let path = get_next_track()
        if path != "" then
          [request.create(path)]
        else
          # Sin tracks: silencio de 5 segundos y reintento
          log("AutoDJ: sin tracks disponibles, esperando...")
          [request.create("silence:5.")]
        end
      end
  )

# ─── Fallback: silencio si el AutoDJ falla ───────────────────────────────────
radio = fallback(
  id="radio",
  track_sensitive=false,
  [autodj, blank(duration=5.)]
)

# ─── Hook: actualizar metadata al cambiar de canción ─────────────────────────
radio = on_metadata(
  fun (meta) ->
    begin
      let title  = meta["title"]
      let artist = meta["artist"]
      log("Reproduciendo: #{artist} — #{title}")
      update_metadata(~title=title, ~artist=artist)
    end,
  radio
)

# ─── Output: enviar a IceCast KH ─────────────────────────────────────────────
output.icecast(
  %mp3(bitrate=128),           # formato de salida (MP3 128kbps)
  id="icecast_out",
  host=icecast_host,
  port=icecast_port,
  password=icecast_pass,
  mount=mount_point,
  name="Clonetova Radio",
  description="Stream gestionado por Clonetova",
  public=true,
  on_connect=(fun () -> log("Conectado a IceCast: #{icecast_host}:#{icecast_port}#{mount_point}")),
  on_disconnect=(fun () -> log("Desconectado de IceCast")),
  radio
)

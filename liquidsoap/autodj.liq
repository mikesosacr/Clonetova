settings.log.level.set(3)

backend_url = environment.get("BACKEND_URL")
icecast_host = environment.get("ICECAST_HOST")
icecast_port = int_of_string(environment.get("ICECAST_PORT"))
icecast_password = environment.get("ICECAST_PASSWORD")
mount_point = environment.get("MOUNT_POINT")
stream_id = environment.get("STREAM_ID")
api_token = environment.get("API_TOKEN")

log.important("AutoDJ iniciando → #{mount_point}")

def get_next_track() =
  body = http.get(
    headers=[("Authorization", "Bearer #{api_token}")],
    "#{backend_url}/api/autodj/next-track?stream_id=#{stream_id}"
  )
  let json.parse ({file_path, title, artist} :
    {file_path: string, title: string, artist: string}) = body
  log.important("Siguiente: #{artist} - #{title}")
  request.create(file_path)
end

source = request.dynamic(get_next_track)
source = mksafe(source)

output.icecast(
  %fdkaac(bitrate=128),
  host=icecast_host,
  port=icecast_port,
  password=icecast_password,
  mount=mount_point,
  name="osa radio",
  description="Powered by Clonetova AutoDJ",
  source
)

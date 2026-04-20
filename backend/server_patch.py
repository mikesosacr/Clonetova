"""
PATCH para backend/server.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reemplaza los endpoints /api/streams/{id}/start y /api/streams/{id}/stop
para crear/destruir contenedores Liquidsoap via Docker SDK.

INSTRUCCIONES DE INTEGRACIÓN:
1. Copia liquidsoap_manager.py al directorio backend/
2. En server.py agrega el import al principio del archivo:
       from liquidsoap_manager import start_liquidsoap, stop_liquidsoap, get_liquidsoap_status
3. Reemplaza las funciones start_stream y stop_stream con las de este archivo.
4. Agrega el endpoint GET /api/streams/{id}/logs al final de la sección de streams.
"""

# ══════════════════════════════════════════════════════════════
# IMPORTS ADICIONALES — agregar en la sección de imports de server.py
# ══════════════════════════════════════════════════════════════
#
# from liquidsoap_manager import start_liquidsoap, stop_liquidsoap, get_liquidsoap_status
# import asyncio
#

# ══════════════════════════════════════════════════════════════
# ENDPOINT: POST /api/streams/{stream_id}/start
# ══════════════════════════════════════════════════════════════

PATCH_START = '''
@api_router.post("/streams/{stream_id}/start")
async def start_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """
    Arranca un stream:
    1. Verifica que el stream existe en MongoDB.
    2. Marca status = "online" en MongoDB.
    3. Crea un contenedor Liquidsoap via Docker SDK.
    """
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream no encontrado")

    if stream.get("status") == "online":
        raise HTTPException(status_code=400, detail="El stream ya está online")

    # Actualizar estado en MongoDB
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"status": "starting", "updated_at": datetime.utcnow()}}
    )

    # Arrancar contenedor Liquidsoap en background
    try:
        loop = asyncio.get_event_loop()
        container_info = await loop.run_in_executor(
            None,
            lambda: start_liquidsoap(
                stream_id=stream_id,
                mount_point=stream.get("mount_point", f"/{stream_id}"),
                icecast_password=stream.get("password", "fuente123"),
            )
        )
        # Marcar como online una vez el contenedor está corriendo
        await db.streams.update_one(
            {"id": stream_id},
            {"$set": {
                "status": "online",
                "liquidsoap_container": container_info["name"],
                "updated_at": datetime.utcnow()
            }}
        )
        logger.info(f"Stream {stream_id} iniciado: {container_info}")
        return {"status": "online", "container": container_info["name"]}

    except Exception as e:
        # Revertir estado si Docker falla
        await db.streams.update_one(
            {"id": stream_id},
            {"$set": {"status": "offline", "updated_at": datetime.utcnow()}}
        )
        logger.error(f"Error iniciando Liquidsoap para stream {stream_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error iniciando Liquidsoap: {str(e)}")
'''

# ══════════════════════════════════════════════════════════════
# ENDPOINT: POST /api/streams/{stream_id}/stop
# ══════════════════════════════════════════════════════════════

PATCH_STOP = '''
@api_router.post("/streams/{stream_id}/stop")
async def stop_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """
    Detiene un stream:
    1. Para y elimina el contenedor Liquidsoap.
    2. Marca status = "offline" en MongoDB.
    IceCast detecta la desconexión automáticamente.
    """
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream no encontrado")

    # Detener contenedor en background
    try:
        loop = asyncio.get_event_loop()
        removed = await loop.run_in_executor(
            None,
            lambda: stop_liquidsoap(stream_id)
        )
        logger.info(f"Stream {stream_id} detenido. Contenedor eliminado: {removed}")
    except Exception as e:
        logger.warning(f"Error deteniendo contenedor de stream {stream_id}: {e}")
        # Continuamos igual para limpiar MongoDB

    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {
            "status": "offline",
            "current_listeners": 0,
            "liquidsoap_container": None,
            "updated_at": datetime.utcnow()
        }}
    )

    return {"status": "offline"}
'''

# ══════════════════════════════════════════════════════════════
# ENDPOINT NUEVO: GET /api/streams/{stream_id}/logs
# ══════════════════════════════════════════════════════════════

PATCH_LOGS = '''
@api_router.get("/streams/{stream_id}/logs")
async def stream_logs(
    stream_id: str,
    tail: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Retorna los últimos logs del contenedor Liquidsoap del stream."""
    from liquidsoap_manager import get_liquidsoap_logs, get_liquidsoap_status
    status = get_liquidsoap_status(stream_id)
    if status is None:
        return {"logs": "Contenedor no encontrado (stream offline o nunca iniciado).", "container_status": None}
    logs = get_liquidsoap_logs(stream_id, tail=tail)
    return {"logs": logs, "container_status": status}
'''

if __name__ == "__main__":
    print("Este archivo es documentación de patch, no se ejecuta directamente.")
    print("Lee las instrucciones en el docstring al inicio.")

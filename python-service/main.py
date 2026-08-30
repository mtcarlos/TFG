"""
main.py — Punto de entrada del microservicio Python (FastAPI).

Expone los endpoints REST que Node.js consumirá como proxy:
  - POST /api/python/clone-and-analyze  → Clonar repo + analizar + generar layout
  - POST /api/python/oracle/ask         → Consultar al Oráculo (LLM)
  - GET  /api/python/commits/{roomId}   → Historial de commits
  - POST /api/python/checkout           → Checkout de commit + re-análisis
  - DELETE /api/python/rooms/{roomId}   → Garbage collection de carpeta temporal
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import re

from config import PYTHON_PORT, GEMINI_API_KEY
from analyzer import (
    clone_repo,
    analyze_file_tree,
    cleanup_repo,
    get_commit_history,
    checkout_commit,
)
from city_layout import generate_city_layout
from oracle import ask_oracle

# ── App FastAPI ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="VR Code City — Python Microservice",
    description="Microservicio de procesamiento pesado: clonación, análisis y Oráculo LLM.",
    version="1.0.0",
)

# CORS (solo para desarrollo local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Estado en memoria ───────────────────────────────────────────────────────
# Mapea roomId → ruta absoluta del clon
clone_paths: dict[str, str] = {}


# ── Modelos de Request ───────────────────────────────────────────────────────

class CloneRequest(BaseModel):
    """Cuerpo de la petición de clonación y análisis."""
    repoUrl: str
    roomId: str

    @field_validator("repoUrl")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        """Valida que la URL sea un repositorio de GitHub válido."""
        pattern = r"^https?://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+(\.git)?/?$"
        if not re.match(pattern, v):
            raise ValueError("Invalid GitHub repository URL")
        return v


class OracleRequest(BaseModel):
    """Cuerpo de la petición al Oráculo."""
    question: str
    roomId: str
    filePath: str | None = None


class CheckoutRequest(BaseModel):
    """Cuerpo de la petición de checkout de commit."""
    roomId: str
    commitSha: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/python/clone-and-analyze")
async def clone_and_analyze(request: CloneRequest) -> dict:
    """
    Clona un repositorio de GitHub, analiza su árbol de archivos
    y genera el layout de Code City.

    Args:
        request: CloneRequest con repoUrl y roomId.

    Returns:
        JSON con { layout: { buildings, districts, stats }, clonePath }.
    """
    try:
        print(f"[main] Cloning {request.repoUrl} for room {request.roomId}...")

        # 1. Clonar repositorio
        clone_path = await clone_repo(request.repoUrl, request.roomId)
        clone_paths[request.roomId] = clone_path

        # 2. Analizar árbol de archivos
        print(f"[main] Analyzing file tree...")
        file_tree = await analyze_file_tree(clone_path)

        # 3. Generar layout de Code City
        print(f"[main] Generating city layout...")
        layout = generate_city_layout(file_tree)

        print(
            f"[main] Room {request.roomId} -> city ready "
            f"({layout['stats']['totalFiles']} files, "
            f"{layout['stats']['totalLOC']} LOC)"
        )

        return {"layout": layout, "clonePath": clone_path}

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"[main] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post("/api/python/oracle/ask")
async def oracle_ask(request: OracleRequest) -> dict:
    """
    Consulta al Oráculo (LLM) sobre un archivo o el repositorio en general.

    Args:
        request: OracleRequest con question, roomId y filePath opcional.

    Returns:
        JSON con { answer: "..." }.
    """
    clone_path = clone_paths.get(request.roomId)
    if not clone_path:
        raise HTTPException(
            status_code=400,
            detail="Repository is not cloned yet. Wait for the city to be built.",
        )

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY not configured on the Python service.",
        )

    print(
        f"[main] Oracle query: \"{request.question}\" "
        f"about {request.filePath or 'Global'} (Room: {request.roomId})"
    )

    try:
        answer = await ask_oracle(
            question=request.question,
            file_path=request.filePath,
            clone_path=clone_path,
            api_key=GEMINI_API_KEY,
        )
        return {"answer": answer}

    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"[main] Oracle error: {e}")
        raise HTTPException(status_code=500, detail=f"Oracle error: {e}")


@app.get("/api/python/commits/{room_id}")
async def commits(room_id: str) -> dict:
    """
    Devuelve el historial de commits del repositorio clonado.

    Args:
        room_id: Identificador de la sala.

    Returns:
        JSON con { commits: [...] }.
    """
    try:
        commit_list = await get_commit_history(room_id)
        return {"commits": commit_list}
    except Exception as e:
        print(f"[main] Commits error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch commits: {e}")


@app.post("/api/python/checkout")
async def checkout(request: CheckoutRequest) -> dict:
    """
    Hace checkout de un commit específico y regenera el layout.

    Args:
        request: CheckoutRequest con roomId y commitSha.

    Returns:
        JSON con { success: true, layout: {...} }.
    """
    try:
        # 1. Checkout commit
        clone_path = await checkout_commit(request.roomId, request.commitSha)

        # 2. Re-analizar árbol
        print(f"[main] Re-analyzing file tree for commit {request.commitSha}...")
        file_tree = await analyze_file_tree(clone_path)

        # 3. Regenerar layout
        print(f"[main] Generating new city layout...")
        layout = generate_city_layout(file_tree)

        return {"success": True, "layout": layout}

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"[main] Checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Checkout error: {e}")


@app.delete("/api/python/rooms/{room_id}")
async def delete_room(room_id: str) -> dict:
    """
    Garbage collection: elimina la carpeta temporal del repositorio clonado.

    Args:
        room_id: Identificador de la sala.

    Returns:
        JSON con { success: true }.
    """
    try:
        cleanup_repo(room_id)
        clone_paths.pop(room_id, None)
        print(f"[main] Room {room_id} cleaned up.")
        return {"success": True}
    except Exception as e:
        print(f"[main] Cleanup error: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup error: {e}")


# ── Arranque ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print(f"[main] Starting Python microservice on port {PYTHON_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PYTHON_PORT)

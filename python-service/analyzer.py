"""
analyzer.py — Módulo de análisis de repositorios.

Replica la lógica de repoAnalyzer.js:
  - Clonación eficiente con git clone --filter=blob:none
  - Conteo de líneas de código (LOC)
  - Timestamps de última modificación por fichero
  - Recorrido recursivo del árbol de directorios
  - Historial de commits y checkout de commits específicos
  - Limpieza (garbage collection) de carpetas temporales

Todas las operaciones de git usan asyncio.create_subprocess_exec
para no bloquear el event loop de FastAPI.
"""

import asyncio
import os
import shutil
from pathlib import Path
from typing import Any

from config import TMP_DIR

# ── Directorios a ignorar en el recorrido ────────────────────────────────────
IGNORED_DIRS: set[str] = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "__pycache__",
    "vendor",
    ".venv",
    "target",
}

# ── Extensiones binarias (no contamos como código) ───────────────────────────
BINARY_EXTENSIONS: set[str] = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot",
    ".mp3", ".mp4",
    ".zip", ".tar", ".gz",
    ".pdf",
    ".exe", ".dll", ".so", ".dylib",
}


def _get_tmp_dir(room_id: str) -> Path:
    """
    Devuelve la ruta absoluta al directorio temporal de un room.

    Args:
        room_id: Identificador único de la sala.

    Returns:
        Path al directorio: <python-service>/tmp/<roomId>
    """
    return TMP_DIR / room_id


async def clone_repo(repo_url: str, room_id: str) -> str:
    """
    Clona un repositorio de GitHub en una carpeta temporal.

    Utiliza ``git clone --filter=blob:none`` para una clonación rápida
    (blobless) que mantiene el historial completo de commits pero
    descarga los blobs bajo demanda.

    Si la carpeta ya existe, se elimina primero.

    Args:
        repo_url: URL HTTPS del repositorio (ej. https://github.com/user/repo.git).
        room_id:  Identificador único de la sala (usado como nombre de subcarpeta).

    Returns:
        Ruta absoluta al directorio clonado.

    Raises:
        RuntimeError: Si el proceso git falla.
    """
    target_dir = _get_tmp_dir(room_id)

    # Limpiar clonación anterior si existe
    if target_dir.exists():
        shutil.rmtree(target_dir, ignore_errors=True)

    # Asegurar que la carpeta padre (tmp/) existe
    target_dir.parent.mkdir(parents=True, exist_ok=True)

    # Ejecutar git clone de forma asíncrona
    process = await asyncio.create_subprocess_exec(
        "git", "clone", "--filter=blob:none", repo_url, str(target_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode().strip() if stderr else "Unknown git error"
        raise RuntimeError(f"git clone failed: {error_msg}")

    print(f"[analyzer] Cloned {repo_url} -> {target_dir}")
    return str(target_dir)


def count_lines_of_code(file_path: str) -> int:
    """
    Cuenta las líneas no vacías de un archivo de texto.

    Args:
        file_path: Ruta absoluta al archivo.

    Returns:
        Número de líneas no vacías. Retorna 0 si el archivo no se puede leer.
    """
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for line in f if line.strip())
    except (OSError, UnicodeDecodeError):
        return 0


async def get_file_timestamps(repo_path: str) -> dict[str, int]:
    """
    Obtiene la fecha de última modificación (timestamp UNIX en ms)
    de cada archivo del repositorio usando ``git log``.

    Args:
        repo_path: Ruta absoluta al repositorio clonado.

    Returns:
        Diccionario { ruta_relativa: timestamp_ms }.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "git", "log", "--name-only", "--pretty=format:commit:%ct",
            cwd=repo_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await process.communicate()

        if process.returncode != 0:
            return {}

        lines = stdout.decode("utf-8", errors="ignore").split("\n")
        timestamps: dict[str, int] = {}
        current_timestamp: int = 0

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue
            if trimmed.startswith("commit:"):
                current_timestamp = int(trimmed.replace("commit:", "")) * 1000
            else:
                # Primera aparición = fecha más reciente (git log va de nuevo a viejo)
                if trimmed not in timestamps:
                    timestamps[trimmed] = current_timestamp

        return timestamps
    except Exception as e:
        print(f"[analyzer] Error getting timestamps: {e}")
        return {}


def walk_directory(
    dir_path: str,
    relative_to: str | None = None,
    timestamps_map: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    """
    Recorre recursivamente un directorio y construye un árbol jerárquico.

    Ignora directorios en IGNORED_DIRS, archivos ocultos (empiezan por '.')
    y archivos binarios (por extensión).

    Args:
        dir_path:       Ruta absoluta al directorio a recorrer.
        relative_to:    Ruta base para calcular rutas relativas.
                        En la primera llamada se usa dir_path.
        timestamps_map: Diccionario de timestamps por ruta relativa.

    Returns:
        Lista de nodos del árbol. Cada nodo es un dict con:
        - Directorios: { name, type: "directory", children: [...] }
        - Archivos:    { name, type: "file", loc, extension, fullPath, lastModified }
    """
    if relative_to is None:
        relative_to = dir_path
    if timestamps_map is None:
        timestamps_map = {}

    children: list[dict[str, Any]] = []

    try:
        entries = sorted(os.listdir(dir_path))
    except OSError:
        return children

    for entry_name in entries:
        # Saltar archivos/carpetas ocultos
        if entry_name.startswith("."):
            continue

        full_abs_path = os.path.join(dir_path, entry_name)

        if os.path.isdir(full_abs_path):
            # Saltar directorios ignorados
            if entry_name in IGNORED_DIRS:
                continue

            sub_children = walk_directory(full_abs_path, relative_to, timestamps_map)
            children.append({
                "name": entry_name,
                "type": "directory",
                "children": sub_children,
            })

        elif os.path.isfile(full_abs_path):
            ext = os.path.splitext(entry_name)[1].lower()

            # Saltar archivos binarios
            if ext in BINARY_EXTENSIONS:
                continue

            # Calcular ruta relativa con barras forward
            relative_path = os.path.relpath(full_abs_path, relative_to).replace("\\", "/")
            last_modified = timestamps_map.get(relative_path, 0)

            children.append({
                "name": entry_name,
                "type": "file",
                "loc": count_lines_of_code(full_abs_path),
                "extension": ext or "",
                "fullPath": relative_path,
                "lastModified": last_modified,
            })

    return children


async def analyze_file_tree(repo_path: str) -> dict[str, Any]:
    """
    Analiza el árbol de archivos de un repositorio clonado.

    Combina timestamps de git con el recorrido del directorio para
    producir un árbol jerárquico completo.

    Args:
        repo_path: Ruta absoluta al repositorio clonado.

    Returns:
        Nodo raíz del árbol: { name: "root", type: "directory", children: [...] }

    Raises:
        Exception: Si el directorio no se puede leer.
    """
    try:
        timestamps_map = await get_file_timestamps(repo_path)
        children = walk_directory(repo_path, None, timestamps_map)
        return {
            "name": "root",
            "type": "directory",
            "children": children,
        }
    except Exception as e:
        print(f"[analyzer] Error analyzing file tree: {e}")
        raise


def cleanup_repo(room_id: str) -> None:
    """
    Elimina la carpeta temporal de un room (garbage collection).
    Maneja archivos de solo lectura creados por git en Windows.

    Args:
        room_id: Identificador de la sala cuya carpeta temporal se elimina.
    """
    target_dir = _get_tmp_dir(room_id)
    try:
        if target_dir.exists():
            import stat

            def on_rm_error(func, path, exc_info):
                # Cambiar permisos a escritura y reintentar
                os.chmod(path, stat.S_IWRITE)
                try:
                    func(path)
                except Exception:
                    pass

            shutil.rmtree(target_dir, onerror=on_rm_error)
            print(f"[analyzer] Cleaned up {target_dir}")
    except Exception as e:
        print(f"[analyzer] Error cleaning up repo: {e}")
        # Intentar forzar borrado como último recurso
        shutil.rmtree(target_dir, ignore_errors=True)


async def get_commit_history(room_id: str) -> list[dict[str, str]]:
    """
    Obtiene los últimos 50 commits del repositorio clonado.

    Args:
        room_id: Identificador de la sala.

    Returns:
        Lista de dicts con { hash, author, date, message }.
    """
    target_dir = _get_tmp_dir(room_id)
    if not target_dir.exists():
        return []

    try:
        process = await asyncio.create_subprocess_exec(
            "git", "log", "-n", "50",
            "--pretty=format:%h|%an|%ad|%s",
            "--date=short",
            cwd=str(target_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await process.communicate()

        if process.returncode != 0 or not stdout:
            return []

        commits: list[dict[str, str]] = []
        for line in stdout.decode("utf-8", errors="ignore").split("\n"):
            line = line.strip()
            if not line:
                continue
            parts = line.split("|", 3)
            if len(parts) >= 4:
                commits.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "message": parts[3],
                })

        return commits
    except Exception as e:
        print(f"[analyzer] Error fetching commit history: {e}")
        return []


async def checkout_commit(room_id: str, commit_sha: str) -> str:
    """
    Hace checkout de un commit específico en el repositorio clonado.

    Args:
        room_id:    Identificador de la sala.
        commit_sha: Hash del commit a checkoutear.

    Returns:
        Ruta absoluta al directorio del repo.

    Raises:
        RuntimeError: Si el checkout falla.
    """
    target_dir = _get_tmp_dir(room_id)

    process = await asyncio.create_subprocess_exec(
        "git", "checkout", commit_sha,
        cwd=str(target_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode().strip() if stderr else "Unknown git error"
        raise RuntimeError(f"git checkout failed: {error_msg}")

    print(f"[analyzer] Checked out commit {commit_sha} in room {room_id}")
    return str(target_dir)

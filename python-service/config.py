"""
config.py — Configuración centralizada del microservicio Python.

Carga variables de entorno desde .env y define constantes globales.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Cargar variables de entorno ──────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# ── Constantes ───────────────────────────────────────────────────────────────

# Puerto del microservicio
PYTHON_PORT: int = int(os.getenv("PYTHON_PORT", "8000"))

# Carpeta temporal para clonar repositorios
TMP_DIR: Path = Path(__file__).parent / "tmp"

# API Key de OpenRouter para el Oráculo
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

# Modelo LLM a usar
LLM_MODEL: str = os.getenv("LLM_MODEL", "google/gemma-4-31b-it:free")

# Máximo de caracteres de un fichero antes de truncar
MAX_FILE_CHARS: int = 8000

# Máximo de tokens en la respuesta del LLM
MAX_LLM_TOKENS: int = 1024

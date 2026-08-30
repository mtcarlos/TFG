"""
oracle.py — Módulo del Oráculo (asistente LLM).

Gestiona la construcción de prompts con contexto de código
y la comunicación asíncrona con la API de Google Gemini.

Incluye reintentos automáticos con backoff exponencial para
manejar rate limits del tier gratuito.
"""

import asyncio
import os

from google import genai
from google.genai import types

from config import MAX_FILE_CHARS, MAX_LLM_TOKENS, LLM_MODEL

# ── Configuración de reintentos ──────────────────────────────────────────────
MAX_RETRIES: int = 3
BASE_DELAY_SECONDS: float = 2.0  # 2s, 4s, 8s con backoff exponencial


async def ask_oracle(
    question: str,
    file_path: str | None,
    clone_path: str,
    api_key: str,
) -> str:
    """
    Consulta al Oráculo (LLM vía Google Gemini) sobre un archivo o el repo en general.

    Si se proporciona un ``file_path``, se lee el archivo desde el clon temporal,
    se trunca si es muy largo, y se incluye como contexto en el prompt.

    Implementa reintentos automáticos con backoff exponencial para
    manejar errores de rate limit del tier gratuito de Gemini.

    Args:
        question:   Pregunta del usuario.
        file_path:  Ruta relativa al archivo dentro del repo (opcional).
        clone_path: Ruta absoluta al directorio del repo clonado.
        api_key:    API key de Google Gemini.

    Returns:
        Respuesta en texto del modelo LLM.

    Raises:
        RuntimeError: Si la API devuelve un error tras agotar los reintentos.
    """
    system_prompt = (
        "Eres un asistente experto en código. Responde de forma concisa y clara "
        "en español. No uses markdown excesivo, mantén la respuesta breve "
        "(máximo 300 palabras)."
    )
    user_prompt = question

    # Si se especifica un archivo, adjuntar su contenido como contexto
    if file_path:
        try:
            absolute_file_path = os.path.join(clone_path, file_path)
            with open(absolute_file_path, "r", encoding="utf-8", errors="ignore") as f:
                file_content = f.read()

            # Truncar si es muy largo
            if len(file_content) > MAX_FILE_CHARS:
                file_content = file_content[:MAX_FILE_CHARS] + "\n... (fichero truncado)"

            user_prompt = (
                f"Fichero: {file_path}\n\n"
                f"```\n{file_content}\n```\n\n"
                f"Pregunta: {question}"
            )
            print(f"[oracle] Fichero adjuntado: {file_path} ({len(file_content)} chars)")

        except (OSError, UnicodeDecodeError) as e:
            print(f"[oracle] No se pudo leer el fichero {file_path}: {e}")
            user_prompt = f"Sobre el fichero {file_path}: {question}"

    # Configurar cliente de Gemini
    client = genai.Client(api_key=api_key)

    # Llamada asíncrona a Gemini con reintentos
    last_error: str = ""

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = await client.aio.models.generate_content(
                model=LLM_MODEL,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=MAX_LLM_TOKENS,
                ),
            )

            answer = response.text or "Sin respuesta del modelo."
            print(f"[oracle] Respuesta recibida ({len(answer)} chars)")
            return answer

        except Exception as e:
            last_error = str(e)
            error_lower = last_error.lower()

            # Si es rate limit y quedan reintentos, esperar con backoff
            if ("429" in last_error or "rate" in error_lower or "quota" in error_lower) and attempt < MAX_RETRIES:
                delay = BASE_DELAY_SECONDS * (2 ** (attempt - 1))  # 2s, 4s, 8s
                print(
                    f"[oracle] Rate limit en intento {attempt}/{MAX_RETRIES}. "
                    f"Reintentando en {delay}s..."
                )
                await asyncio.sleep(delay)
                continue

            # Error no recuperable o reintentos agotados
            print(f"[oracle] API error: {last_error} [intento {attempt}/{MAX_RETRIES}]")
            break

    raise RuntimeError(
        f"Rate limit de Gemini alcanzado tras {MAX_RETRIES} intentos. "
        f"Intenta de nuevo en unos segundos."
        if "429" in str(last_error) or "rate" in last_error.lower() or "quota" in last_error.lower()
        else f"Error de la API de Gemini: {last_error}"
    )

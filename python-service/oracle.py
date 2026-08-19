"""
oracle.py — Módulo del Oráculo (asistente LLM).

Gestiona la construcción de prompts con contexto de código
y la comunicación asíncrona con la API de OpenRouter.

Incluye reintentos automáticos con backoff exponencial para
manejar rate limits (HTTP 429) del tier gratuito.
"""

import asyncio
import httpx

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
    Consulta al Oráculo (LLM vía OpenRouter) sobre un archivo o el repo en general.

    Si se proporciona un ``file_path``, se lee el archivo desde el clon temporal,
    se trunca si es muy largo, y se incluye como contexto en el prompt.

    Implementa reintentos automáticos con backoff exponencial para
    manejar errores 429 (rate limit) del tier gratuito de OpenRouter.

    Args:
        question:   Pregunta del usuario.
        file_path:  Ruta relativa al archivo dentro del repo (opcional).
        clone_path: Ruta absoluta al directorio del repo clonado.
        api_key:    API key de OpenRouter.

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
            import os
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

    # Llamada asíncrona a OpenRouter con reintentos
    last_error: str = ""

    for attempt in range(1, MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8080",
                    "X-Title": "VR Code City Oracle",
                },
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": MAX_LLM_TOKENS,
                },
            )

        data = response.json()

        if response.is_success:
            # Respuesta exitosa
            answer = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "Sin respuesta del modelo.")
            )
            print(f"[oracle] Respuesta recibida ({len(answer)} chars)")
            return answer

        # Error — extraer mensaje
        error_obj = data.get("error", {})
        last_error = error_obj.get("message", "Error de la API de OpenRouter")
        status_code = response.status_code

        # Si es 429 (rate limit) y quedan reintentos, esperar con backoff
        if status_code == 429 and attempt < MAX_RETRIES:
            delay = BASE_DELAY_SECONDS * (2 ** (attempt - 1))  # 2s, 4s, 8s
            print(
                f"[oracle] Rate limit (429) en intento {attempt}/{MAX_RETRIES}. "
                f"Reintentando en {delay}s..."
            )
            await asyncio.sleep(delay)
            continue

        # Error no recuperable o reintentos agotados
        print(f"[oracle] API error ({status_code}): {last_error} [intento {attempt}/{MAX_RETRIES}]")
        break

    raise RuntimeError(
        f"Rate limit de OpenRouter alcanzado tras {MAX_RETRIES} intentos. "
        f"El modelo gratuito tiene limites estrictos. Intenta de nuevo en unos segundos."
        if "429" in str(last_error) or "rate" in last_error.lower()
        else last_error
    )

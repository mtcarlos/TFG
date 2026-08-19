"""
city_layout.py — Generador de layout de Code City (Squarified Treemap).

Port directo de cityLayoutGenerator.js.
Transforma un árbol jerárquico de archivos en un array plano de
'buildings' (archivos) y 'districts' (directorios) posicionados
mediante un algoritmo Squarified Treemap, listo para renderizar en A-Frame.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field
from typing import Any, TypedDict

# ── Paleta de colores por extensión ──────────────────────────────────────────

EXT_COLORS: dict[str, str] = {
    ".js":   "#f1e05a",
    ".ts":   "#3178c6",
    ".jsx":  "#f1e05a",
    ".tsx":  "#3178c6",
    ".py":   "#3572A5",
    ".java": "#b07219",
    ".cs":   "#178600",
    ".cpp":  "#f34b7d",
    ".c":    "#555555",
    ".go":   "#00ADD8",
    ".rs":   "#dea584",
    ".rb":   "#701516",
    ".php":  "#4F5D95",
    ".swift": "#F05138",
    ".kt":   "#A97BFF",
    ".html": "#e34c26",
    ".css":  "#563d7c",
    ".scss": "#c6538c",
    ".json": "#94a3b8",
    ".md":   "#083fa1",
    ".yaml": "#cb171e",
    ".yml":  "#cb171e",
    ".sh":   "#89e051",
    ".sql":  "#e38c00",
}

DEFAULT_COLOR: str = "#64748b"
DISTRICT_COLOR: str = "rgba(30, 30, 46, 0.35)"


# ── Tipos ────────────────────────────────────────────────────────────────────

@dataclass
class Rect:
    """Rectángulo de layout."""
    x: float
    z: float
    w: float
    h: float


class CityLayoutOptions(TypedDict, total=False):
    """Opciones de configuración del layout."""
    maxHeight: float
    minHeight: float
    padding: float
    totalSize: float


DEFAULT_OPTIONS: CityLayoutOptions = {
    "maxHeight": 8.0,
    "minHeight": 0.3,
    "padding": 0.3,
    "totalSize": 40.0,
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def compute_loc(node: dict[str, Any]) -> int:
    """
    Calcula recursivamente el total de LOC de un nodo.

    Los directorios agregan el LOC de todos sus descendientes.

    Args:
        node: Nodo del árbol (file o directory).

    Returns:
        Total de líneas de código.
    """
    if node.get("type") == "file":
        return node.get("loc", 0)
    children = node.get("children", [])
    if not children:
        return 0
    return sum(compute_loc(child) for child in children)


def compute_stats(root: dict[str, Any]) -> dict[str, int]:
    """
    Recorre el árbol y cuenta archivos, directorios y LOC total.

    Args:
        root: Nodo raíz del árbol.

    Returns:
        Dict con { totalFiles, totalLOC, totalDirs }.
    """
    stats = {"totalFiles": 0, "totalLOC": 0, "totalDirs": 0}

    def walk(node: dict[str, Any]) -> None:
        if node.get("type") == "file":
            stats["totalFiles"] += 1
            stats["totalLOC"] += node.get("loc", 0)
        else:
            stats["totalDirs"] += 1
            for child in node.get("children", []):
                walk(child)

    # Recorrer hijos del root
    for child in root.get("children", []):
        walk(child)

    # Contar el root como directorio
    if root.get("type") == "directory":
        stats["totalDirs"] += 1

    return stats


def color_for_extension(ext: str) -> str:
    """Devuelve el color hex para una extensión de archivo."""
    return EXT_COLORS.get(ext, DEFAULT_COLOR)


def loc_to_height(loc: int, max_loc: int, min_height: float, max_height: float) -> float:
    """
    Mapea un valor de LOC a una altura de edificio usando escala sqrt.

    La escala raíz cuadrada evita que archivos muy grandes dominen visualmente.

    Args:
        loc:        Líneas de código del archivo.
        max_loc:    LOC máximo en todo el repositorio.
        min_height: Altura mínima de un edificio.
        max_height: Altura máxima de un edificio.

    Returns:
        Altura del edificio en unidades de A-Frame.
    """
    if max_loc <= 0:
        return min_height
    normalized = math.sqrt(loc) / math.sqrt(max_loc)
    return min_height + normalized * (max_height - min_height)


# ── Squarified Treemap Algorithm ─────────────────────────────────────────────

def _short_side(rect: Rect) -> float:
    """Devuelve el lado más corto de un rectángulo."""
    return min(rect.w, rect.h)


def _worst_ratio(row: list[float], side_len: float) -> float:
    """
    Calcula el peor aspect ratio de una fila de áreas.

    Implementa la fórmula de Bruls, Huizing & van Wijk (2000).

    Args:
        row:      Lista de valores de área en la fila actual.
        side_len: Longitud del lado por el que se está llenando.

    Returns:
        Peor aspect ratio (≥ 1). Infinito si la fila está vacía.
    """
    if not row or side_len <= 0:
        return float("inf")

    row_sum = sum(row)
    row_max = max(row)
    row_min = min(row)

    s2 = side_len * side_len
    worst = max(
        (s2 * row_max) / (row_sum * row_sum),
        (row_sum * row_sum) / (s2 * row_min),
    )
    return worst


def _layout_row(rect: Rect, row_areas: list[float]) -> Rect:
    """
    Coloca una fila de items a lo largo del lado más corto del rectángulo.

    Args:
        rect:      Área disponible.
        row_areas: Valores de área que llenarán una franja.

    Returns:
        Rectángulo restante tras colocar la franja.
    """
    s = _short_side(rect)
    row_sum = sum(row_areas)
    strip_thickness = row_sum / s if s > 0 else 0

    if rect.w <= rect.h:
        # Franja horizontal en la parte superior
        return Rect(
            x=rect.x,
            z=rect.z + strip_thickness,
            w=rect.w,
            h=rect.h - strip_thickness,
        )
    else:
        # Franja vertical en el lado izquierdo
        return Rect(
            x=rect.x + strip_thickness,
            z=rect.z,
            w=rect.w - strip_thickness,
            h=rect.h,
        )


def _positions_for_row(rect: Rect, row_areas: list[float]) -> list[Rect]:
    """
    Calcula las coordenadas de cada item en una fila.

    Args:
        rect:      Área del rectángulo.
        row_areas: Valores de área.

    Returns:
        Lista de Rect posicionados, uno por item.
    """
    s = _short_side(rect)
    row_sum = sum(row_areas)
    strip_thickness = row_sum / s if s > 0 else 0

    rects: list[Rect] = []
    offset = 0.0

    for area in row_areas:
        item_len = area / strip_thickness if strip_thickness > 0 else 0

        if rect.w <= rect.h:
            rects.append(Rect(
                x=rect.x + offset,
                z=rect.z,
                w=item_len,
                h=strip_thickness,
            ))
        else:
            rects.append(Rect(
                x=rect.x,
                z=rect.z + offset,
                w=strip_thickness,
                h=item_len,
            ))

        offset += item_len

    return rects


@dataclass
class _TreemapItem:
    """Item interno para el algoritmo squarify."""
    area: float
    node: dict[str, Any]


def _squarify(items: list[_TreemapItem], rect: Rect) -> list[tuple[dict[str, Any], Rect]]:
    """
    Algoritmo Squarified Treemap.

    Distribuye los items dentro del rectángulo dado,
    minimizando el aspect ratio de cada celda.

    Args:
        items: Lista de items con área y nodo.
        rect:  Rectángulo disponible.

    Returns:
        Lista de (nodo, rectángulo posicionado).
    """
    # Filtrar items con área 0 y ordenar descendente
    sorted_items = sorted(
        [it for it in items if it.area > 0],
        key=lambda it: it.area,
        reverse=True,
    )

    if not sorted_items:
        return []

    result: list[tuple[dict[str, Any], Rect]] = []
    remaining = Rect(x=rect.x, z=rect.z, w=rect.w, h=rect.h)
    current_row: list[float] = []
    current_nodes: list[_TreemapItem] = []
    idx = 0

    while idx < len(sorted_items):
        side = _short_side(remaining)

        # Si el área restante es esencialmente cero, salir
        if remaining.w <= 0.001 or remaining.h <= 0.001:
            break

        candidate = sorted_items[idx].area
        extended = current_row + [candidate]

        if (
            len(current_row) == 0
            or _worst_ratio(extended, side) <= _worst_ratio(current_row, side)
        ):
            # Añadir mejora o mantiene el aspect ratio
            current_row.append(candidate)
            current_nodes.append(sorted_items[idx])
            idx += 1
        else:
            # Finalizar la fila actual
            positions = _positions_for_row(remaining, current_row)
            for i, node_item in enumerate(current_nodes):
                result.append((node_item.node, positions[i]))
            remaining = _layout_row(remaining, current_row)
            current_row = []
            current_nodes = []

    # Flush última fila
    if current_row:
        positions = _positions_for_row(remaining, current_row)
        for i, node_item in enumerate(current_nodes):
            result.append((node_item.node, positions[i]))

    return result


def _apply_padding(rect: Rect, pad: float) -> Rect:
    """Encoge un rectángulo aplicando padding en cada lado."""
    return Rect(
        x=rect.x + pad,
        z=rect.z + pad,
        w=max(rect.w - pad * 2, 0),
        h=max(rect.h - pad * 2, 0),
    )


# ── API Pública ──────────────────────────────────────────────────────────────

def generate_city_layout(
    file_tree: dict[str, Any],
    opts: CityLayoutOptions | None = None,
) -> dict[str, Any]:
    """
    Genera un layout de Code City a partir de un árbol jerárquico de archivos.

    Utiliza el algoritmo Squarified Treemap para posicionar los archivos
    como edificios 3D y los directorios como distritos (planos de suelo).

    Args:
        file_tree: Nodo raíz del árbol de archivos del repositorio.
        opts:      Opciones de layout opcionales.

    Returns:
        Dict con { buildings: [...], districts: [...], stats: {...} }.
    """
    options: CityLayoutOptions = {**DEFAULT_OPTIONS, **(opts or {})}
    max_height: float = options["maxHeight"]
    min_height: float = options["minHeight"]
    padding: float = options["padding"]
    total_size: float = options["totalSize"]

    buildings: list[dict[str, Any]] = []
    districts: list[dict[str, Any]] = []

    # 1. Estadísticas
    stats = compute_stats(file_tree)
    max_loc = _find_max_loc(file_tree)

    # 2. Layout recursivo
    root_rect = Rect(x=0, z=0, w=total_size, h=total_size)
    _layout_node(file_tree, root_rect, buildings, districts, max_loc, max_height, min_height, padding)

    return {"buildings": buildings, "districts": districts, "stats": stats}


def _find_max_loc(node: dict[str, Any]) -> int:
    """Encuentra el LOC máximo de cualquier archivo individual en el árbol."""
    if node.get("type") == "file":
        return node.get("loc", 0)
    if not node.get("children"):
        return 0
    return max(_find_max_loc(child) for child in node["children"])


def _layout_node(
    node: dict[str, Any],
    rect: Rect,
    buildings: list[dict[str, Any]],
    districts: list[dict[str, Any]],
    max_loc: int,
    max_height: float,
    min_height: float,
    padding: float,
) -> None:
    """Distribuye recursivamente un nodo y sus hijos dentro del rectángulo dado."""
    if node.get("type") == "file":
        _add_building(node, rect, buildings, max_loc, max_height, min_height, padding)
        return

    # Nodo directorio → emitir distrito
    _add_district(node, rect, districts)

    children = node.get("children", [])
    if not children:
        return

    # Aplicar padding interno
    inner = _apply_padding(rect, padding)
    if inner.w <= 0 or inner.h <= 0:
        return

    # LOC total de los hijos para asignación proporcional de área
    total_child_loc = sum(compute_loc(child) for child in children)

    if total_child_loc <= 0:
        # Todos los hijos tienen 0 LOC → dividir espacio equitativamente
        equal_area = (inner.w * inner.h) / len(children)
        items = [_TreemapItem(area=equal_area, node=child) for child in children]
    else:
        # Caso normal: área proporcional al LOC
        total_area = inner.w * inner.h
        items = []
        for child in children:
            child_loc = compute_loc(child)
            area = (
                (child_loc / total_child_loc) * total_area
                if child_loc > 0
                else (0.5 / total_child_loc) * total_area
            )
            items.append(_TreemapItem(area=area, node=child))

    positioned = _squarify(items, inner)
    for child_node, child_rect in positioned:
        _layout_node(child_node, child_rect, buildings, districts, max_loc, max_height, min_height, padding)


def _add_building(
    node: dict[str, Any],
    rect: Rect,
    buildings: list[dict[str, Any]],
    max_loc: int,
    max_height: float,
    min_height: float,
    padding: float,
) -> None:
    """Registra un edificio (archivo) en la lista de buildings."""
    inner = _apply_padding(rect, padding * 0.25)
    loc = node.get("loc", 0)
    ext = node.get("extension") or os.path.splitext(node.get("name", ""))[1] or ""
    height = loc_to_height(loc, max_loc, min_height, max_height)

    # Limitar ancho y profundidad
    building_width = max(min(inner.w, 2.0), 0.05)
    building_depth = max(min(inner.h, 2.0), 0.05)

    full_path = node.get("fullPath") or node.get("path") or ""
    directory = os.path.dirname(full_path) if full_path else ""

    buildings.append({
        "type": "building",
        "fileName": node.get("name", ""),
        "filePath": full_path,
        "directory": directory,
        "extension": ext,
        "loc": loc,
        "x": inner.x + inner.w / 2,
        "y": height / 2,
        "z": inner.z + inner.h / 2,
        "width": building_width,
        "depth": building_depth,
        "height": height,
        "color": color_for_extension(ext),
        "lastModified": node.get("lastModified", 0),
    })


def _add_district(
    node: dict[str, Any],
    rect: Rect,
    districts: list[dict[str, Any]],
) -> None:
    """Registra un distrito (directorio) en la lista de districts."""
    districts.append({
        "type": "district",
        "name": node.get("name", ""),
        "x": rect.x + rect.w / 2,
        "z": rect.z + rect.h / 2,
        "width": rect.w,
        "depth": rect.h,
        "color": DISTRICT_COLOR,
    })

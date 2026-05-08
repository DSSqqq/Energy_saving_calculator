"""
Одноразовый скрипт: из исходного .docx-шаблона аудита делает «голую» базу,
сохранив стили, тему и шрифты, но удалив тело документа, картинки и графики.

Использование (из директории backend/):
    python scripts/strip_base.py "c:/path/to/source.docx"

Результат: ../measures/windows/template/base.docx (~30 КБ).

Идея: python-docx при `Document(base.docx)` подхватывает styles.xml/theme1.xml
и гарантирует, что любые добавляемые программно абзацы и таблицы получают тот же
шрифт, размеры и оформление, что в исходнике клиента.

Чтобы перегенерировать базу из обновлённого исходника — запустить скрипт ещё раз.
"""
from __future__ import annotations

import re
import shutil
import sys
import zipfile
from pathlib import Path


SRC_DEFAULT = (
    r"c:\Users\Админ\Desktop\Баян-Сулу Улучшение теплозащитных свойств "
    r"оконных блоков (Автосохраненный).docx"
)


# Минимальный набор частей docx, который нужен для работающего шаблона
# с сохранёнными стилями. Всё остальное (media/charts/headers/footers и т.п.)
# вырезаем — они тянут картинки и встроенные данные клиента.
KEEP = {
    "[Content_Types].xml",
    "_rels/.rels",
    "word/_rels/document.xml.rels",
    "word/document.xml",
    "word/styles.xml",
    "word/theme/theme1.xml",
    "word/settings.xml",
    "word/webSettings.xml",
    "word/fontTable.xml",
    "word/numbering.xml",
    "docProps/core.xml",
    "docProps/app.xml",
}


def _clean_document_xml(xml: bytes) -> bytes:
    """Оставляем в <w:body> только финальный <w:sectPr> (свойства страницы)."""
    text = xml.decode("utf-8")
    body_match = re.search(r"<w:body>(.*?)</w:body>", text, re.S)
    if not body_match:
        return xml
    body = body_match.group(1)
    sect_match = re.search(r"<w:sectPr.*?</w:sectPr>", body, re.S)
    new_body = sect_match.group(0) if sect_match else ""
    text = text[: body_match.start(1)] + new_body + text[body_match.end(1) :]
    return text.encode("utf-8")


def _clean_rels(xml: bytes) -> bytes:
    """В document.xml.rels оставляем только связи на стили/тему/настройки/нумерацию.

    Удаляем ссылки на media/charts/headers/footers, которые отсутствуют в новой базе.
    """
    keep_targets = (
        "styles.xml",
        "theme/theme1.xml",
        "settings.xml",
        "webSettings.xml",
        "fontTable.xml",
        "numbering.xml",
    )
    text = xml.decode("utf-8")
    pattern = re.compile(r"<Relationship[^>]*?Target=\"([^\"]+)\"[^>]*?/>")
    kept: list[str] = []
    for m in pattern.finditer(text):
        if any(m.group(1).endswith(t) for t in keep_targets):
            kept.append(m.group(0))
    new_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(kept)
        + "</Relationships>"
    )
    return new_rels.encode("utf-8")


def _clean_content_types(xml: bytes) -> bytes:
    """Чистим [Content_Types].xml: убираем Override-записи на удалённые части."""
    text = xml.decode("utf-8")

    def keep(part_name: str) -> bool:
        norm = part_name.lstrip("/")
        if norm in KEEP:
            return True
        # Override на default xml/jpeg/png — оставляем по дефолту, не Override.
        return False

    text = re.sub(
        r"<Override[^>]*?PartName=\"([^\"]+)\"[^>]*?/>",
        lambda m: m.group(0) if keep(m.group(1)) else "",
        text,
    )
    return text.encode("utf-8")


def strip_base(source_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source_path, "r") as src, zipfile.ZipFile(
        output_path, "w", zipfile.ZIP_DEFLATED
    ) as dst:
        for name in src.namelist():
            if name not in KEEP:
                continue
            data = src.read(name)
            if name == "word/document.xml":
                data = _clean_document_xml(data)
            elif name == "word/_rels/document.xml.rels":
                data = _clean_rels(data)
            elif name == "[Content_Types].xml":
                data = _clean_content_types(data)
            dst.writestr(name, data)


def main(argv: list[str]) -> int:
    src = Path(argv[1]) if len(argv) > 1 else Path(SRC_DEFAULT)
    if not src.exists():
        print(f"ERROR: source not found: {src}", file=sys.stderr)
        return 2
    out = (
        Path(__file__).resolve().parent.parent
        / "measures"
        / "windows"
        / "template"
        / "base.docx"
    )
    strip_base(src, out)
    size_kb = out.stat().st_size / 1024
    print(f"OK: {out}  ({size_kb:.1f} KB)")
    # На всякий случай скопируем оригинал как референс рядом с базой,
    # чтобы при необходимости можно было пересобрать без лишних поисков.
    ref = out.with_name("source_reference.txt")
    ref.write_text(f"source: {src}\n", encoding="utf-8")
    shutil.copystat(src, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

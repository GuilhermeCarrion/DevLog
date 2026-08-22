#!/usr/bin/env python
"""Gera o relatório semanal (.docx) a partir do template docxtpl da instituição.

Uso (como o NestJS chama via subprocesso):
    python gerar_relatorio.py \
        --template templates/RAP-TDS-2026_013-template-docxtpl.docx \
        --input   contexto.json \
        --output  saida.docx

O JSON de --input é o `context` que o template espera (mesmas chaves das tags
Jinja no .docx). O script só injeta os dados — o layout (logo, bordas, células
mescladas) vem do próprio Word, nunca é recriado por código.

Saída: 0 = ok. Qualquer erro vai pro stderr e retorna código != 0, para o Nest
capturar e transformar numa resposta de erro legível.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from docxtpl import DocxTemplate


def eprint(*args: object) -> None:
    """Escreve no stderr (o stdout fica reservado, se um dia quisermos usá-lo)."""
    print(*args, file=sys.stderr)


def carregar_contexto(caminho: Path) -> dict:
    if not caminho.is_file():
        raise FileNotFoundError(f"Input não encontrado: {caminho}")
    with caminho.open(encoding="utf-8") as f:
        contexto = json.load(f)
    if not isinstance(contexto, dict):
        raise ValueError("O input JSON precisa ser um objeto (dict) de contexto.")
    # `realizadas`/`proximas` são as tabelas repetíveis; se vierem ausentes,
    # normaliza pra lista vazia para o loop {%tr for%} não quebrar.
    contexto.setdefault("realizadas", [])
    contexto.setdefault("proximas", [])
    return contexto


def gerar(template: Path, contexto: dict, saida: Path) -> None:
    if not template.is_file():
        raise FileNotFoundError(f"Template não encontrado: {template}")
    doc = DocxTemplate(str(template))
    doc.render(contexto)
    saida.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(saida))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Gera o relatório semanal .docx")
    parser.add_argument("--template", required=True, help="Caminho do .docx template (docxtpl)")
    parser.add_argument("--input", required=True, help="Caminho do JSON de contexto")
    parser.add_argument("--output", required=True, help="Caminho do .docx de saída")
    args = parser.parse_args(argv)

    try:
        contexto = carregar_contexto(Path(args.input))
        gerar(Path(args.template), contexto, Path(args.output))
    except Exception as exc:  # noqa: BLE001 — queremos qualquer erro no stderr
        eprint(f"[gerar_relatorio] ERRO: {exc}")
        return 1

    eprint(f"[gerar_relatorio] OK -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

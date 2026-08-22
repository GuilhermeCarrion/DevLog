# Geração do relatório semanal (.docx)

Script Python isolado que preenche o template do Word da instituição via
[`docxtpl`](https://docxtpl.readthedocs.io). O NestJS o chama por subprocesso
(ver `src/reports/reports.service.ts`).

## Estrutura

```
report/
  gerar_relatorio.py     # script: context JSON -> .docx
  requirements.txt       # docxtpl (traz python-docx + jinja2)
  exemplo-input.json     # contexto de exemplo (para testar sem o Nest)
  templates/
    RAP-TDS-2026_013-template-docxtpl.docx   # template tagueado — NÃO remarcar
  .venv/                 # ambiente isolado (git-ignored)
```

## Setup do venv (uma vez)

Windows (PowerShell/Git Bash):

```bash
python -m venv apps/api/report/.venv
apps/api/report/.venv/Scripts/python.exe -m pip install -r apps/api/report/requirements.txt
```

Linux/macOS (e no deploy):

```bash
python3 -m venv apps/api/report/.venv
apps/api/report/.venv/bin/python -m pip install -r apps/api/report/requirements.txt
```

## Testar o script isolado

```bash
cd apps/api/report
./.venv/Scripts/python.exe gerar_relatorio.py \
  --template templates/RAP-TDS-2026_013-template-docxtpl.docx \
  --input exemplo-input.json \
  --output out/teste.docx
```

## Variáveis de ambiente lidas pelo Nest (todas com default)

| Var | Default | Para quê |
|-----|---------|----------|
| `REPORT_PYTHON` | `report/.venv/Scripts/python.exe` (Win) ou `bin/python` | Binário Python do venv |
| `REPORT_SCRIPT` | `report/gerar_relatorio.py` | Script de geração |
| `REPORT_TEMPLATE_PATH` | `report/templates/RAP-TDS-2026_013-template-docxtpl.docx` | Template docxtpl |

Os caminhos default são resolvidos a partir de `process.cwd()` (a API roda em `apps/api`).

## Atenção ao editar o template

As linhas repetíveis das tabelas usam `{%tr for item in realizadas %}` /
`{%tr endfor %}` em **linhas próprias**, separadas da linha de conteúdo. Colocar
o `for`/`endfor` na mesma linha do conteúdo quebra o parser do docxtpl.

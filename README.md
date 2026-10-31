# NevisSanj 2.5.0

A Persian/English writing analysis tool with **fully restored v2.3 public UI** and a **separate local training studio**. React + TypeScript performs browser-only analysis; Python handles dataset discovery, supervised training, evaluation and candidate-model registration.

## Install / upgrade

On macOS, extract the archive and run `bash install-update.command`. Existing `admin_data`, Python venv, approved training sets, and published models are preserved. The installed project lives in `~/Library/Application Support/NevisSanj`.

- Public frontend: `http://127.0.0.1:4173`
- Private training studio: `http://127.0.0.1:8765`

The public experience retains the former evidence cards, highlighted passages, statistics, style comparison, downloads and light/dark theme. **Only training controls are removed** from this interface.

## Source discovery and continual retraining

The private studio searches the Hugging Face dataset catalog by thematic terms, discovers recently updated repositories, checks license metadata, and offers a sample/column preview. Discovery is automatic and dynamic (not a fixed list of corpus URLs), but **new datasets require human approval of license and authorship provenance** before their labels are trusted.

The studio supports datasets with an explicit text + label column and single-origin datasets when the operator independently verifies the origin. Only exact approved label values are imported. Ingestion is incremental, bounded, deduplicated, and rate controlled. Approved-source updates are collected approximately hourly while the Mac is running; newly discovered sources are scanned daily. The existing supervised training routine creates candidate models only when approved labeled data change.

Never train from the detector's own predictions. Candidate models **never automatically replace** the published browser model. Model releases remain explicit and need independent evaluation.

The browser performs public inference from the published JSON linear model in TypeScript; no backend or vendor API is required for visiting users. The server-side private studio and dataset registry do not deploy to GitHub Pages. ONNX exports remain optional for future deployments.

Data retained in `admin_data`, `training/approved`, `.venv` and `dist/models` are excluded from Git commits/build artifacts where appropriate. Any use of third-party corpora remains subject to their applicable license, provenance, privacy and redistribution terms.

## Tests

```
npm run build
npm test
PYTHONPATH=python python -m unittest discover -s python -p 'test*.py'
```

See `README_FA.md` for Persian instructions and explicit limitations.

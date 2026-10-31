# Detection Engine V3 — experimental, not deployed

- Use `OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python python/engine_v3.py --lang en --limit-per-class 2000` (or `fa`).
- Models train on SQLite approved corpus, deterministically group-split into 70% train / 15% validation / 15% internal test.
- Compare sparse word (1-2 gram) and character (3-4 gram) TF-IDF features with logistic regression and linear SVM. No GPU or extra models required.
- Choose algorithm and AI-score threshold on validation, targeting <=5% human false-positive rate. Test is not used to select threshold. Target can fail on unseen data.
- Files in `admin_data/experiments/v3/` are candidates only, not compatible with published schema 2 and must NOT be copied to `dist/models` or `models/published`.
- External test files live under `admin_data/benchmark-en` and `admin_data/benchmark-fa` and have substantial domain overlap risk; Persian external holdout is human-only. No reliable universal authorship accuracy is established.
- Strong Persian internal results likely reflect dataset-source confounding (historical Wikipedia vs Gemini); not readiness for publication. English external benchmark has nontrivial human false positives.
- Sparse training removes dense memory overhead. Browser inference schema 3, deployment and feature-attribution UI are not yet wired. Rewriting or paraphrasing is separate, with AI origin retained.

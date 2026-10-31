# Persian corpus attribution and restrictions

- Historical human-written Persian Wikipedia pages (snapshot fawiki-20181001), as redistributed through codersan/Persian-Wikipedia-Corpus; content CC BY-SA 4.0. Each sample stores article title, page identifier and attribution URL. Respect the share-alike and attribution conditions for redistribution/adaptations.
- Historical pre-2020 human Persian Wikipedia texts curated by Asrin Vakili, Persian AI-Text Corpus; content CC BY-SA 4.0, original revision URLs retained. AI records from that project are academic-research-only and were excluded.
- Persian machine-generated texts: ibnsina-llm/synthetic-persian-v1; Apache-2.0 according to source license information. Generator and topic metadata retained. This source represents the Gemini model family.

No claim is made that all texts are individually verified human-created; wiki archival provenance and pre-generative-AI capture dates are the evidence. All training inputs are kept local/private and excluded from git and public Pages builds. Preserve upstream license notices and verify license terms before redistributing corpora or shipping an integrated model commercially.


## English expansion
- acmc/multi_domain_ai_human_text, Hugging Face aggregate dataset, declared license CC BY 4.0. Source ID, domain, and generator family retained on each new record. Underlying sub-datasets may have different terms and need manual rights verification before redistribution or commercial training deployment.
- R-obi/ai-text-detection-pile-cleaned, 545 additional AI-labelled rows with cross-checked source field. Declared MIT on dataset card; underlying data licensing requires independent review.
- Reserved 2,000 rows from acmc test split as separate private holdout, never imported for training. Adversarially modified samples from acmc small_train were excluded.
- English text rewrites remain AI-labelled, with parent text and split linked.

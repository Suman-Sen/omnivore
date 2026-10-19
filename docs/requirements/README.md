# Requirements traceability

source-inventory.json captures every heading section and its complete text from all seven specifications plus the delivery contract. It preserves detail; it does not replace the specifications.

Run npm run requirements after source edits, then npm run verify:docs. Unchanged section mappings are retained; changed sections reset to pending review. IDs include source line numbers, so moving sections intentionally forces review.

Each section has implementation paths, test IDs, evidence, status, source hash, and mappingReview. Initially mappings are pending. This is a source inventory, not a claim that every requirement is already decomposed or mapped. Before implementing each section, split compound requirements into tracked acceptance items and assign tests. A phase gate cannot pass on inventory generation alone.

Cross-cutting requirements in rules/architecture/schema/testing apply in addition to PRD feature rows. Future/optional sections remain recorded; no deadline automatically removes them.

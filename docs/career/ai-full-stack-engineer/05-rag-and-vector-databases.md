# 05: RAG and Vector Databases

> **JD lines covered:** "RAG pipelines" · "vector databases" · "Advanced RAG Engineering … vector
> database mechanics, sophisticated ranking/re-ranking strategies, and citation accuracy" ·
> "Design and manage … vector databases".
>
> You have the strongest evidence here (repo-intelligence: hybrid BM25 + embeddings + RRF, citation
> validation, a labelled eval set). The gaps are a **cross-encoder re-ranker** and **RAG in
> Python** on a real vector DB. Interview-depth Q&A: [genai/03](../genai/03-rag.md).

---

## 🟢 Level 1: Basics

### 1.1 Why RAG exists

LLMs don't know your private data, their knowledge has a cutoff date, and they hallucinate when
unsure. **Retrieval-Augmented Generation**: at question time, *find* the relevant pieces of your
data and *paste them into the prompt* with an instruction to answer from them and cite them.

```
INDEX TIME (offline):  load docs → clean → chunk → embed → store (vector + text + metadata)
QUERY TIME (online):   question → (rewrite) → embed → search top-k → (re-rank) → prompt → LLM → answer + citations
```

RAG vs fine-tuning: RAG for **knowledge** (facts change, need citations, need access control).
Fine-tuning for **behaviour/format/style** that's hard to prompt. Most products need RAG.

### 1.2 Embeddings

An **embedding model** turns text into a vector of numbers (e.g. 384, 768, 1536 or 3072
dimensions) so that texts with similar *meaning* end up close together. "How do I reset my
password?" and "forgot login credentials" are near each other even though they share no words.

**Cosine similarity** = the angle between two vectors. 1 = same direction, 0 = unrelated.
For normalized vectors, cosine = dot product.

```python
import numpy as np
def cosine(a, b): return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

Rules:
- **Embed queries and documents with the same model.** Changing the model means re-embedding
  everything, because vectors from different models aren't comparable.
- Some models want a prefix (`"query: "` / `"passage: "`). Read the model card.
- Options: OpenAI `text-embedding-3-small/large`, Cohere, Voyage, Gemini, or open models
  (`bge`, `e5`, `gte`, `nomic`, MiniLM) via `sentence-transformers`. Pick from MTEB scores
  *on your own data*.

### 1.3 Chunking

You embed **chunks**, not whole documents: a 50-page PDF is one vague vector, while 200 chunks are
200 precise ones.

| Strategy | How | Good for |
|---|---|---|
| Fixed size + overlap | ~500–1000 tokens, 10–20% overlap | Baseline, plain text |
| Recursive | Split on `\n\n` → `\n` → `.` → space until under size | Most prose (LangChain `RecursiveCharacterTextSplitter`) |
| Structure-aware | By headings, sections, table rows, slides | Docs, markdown, HTML, PDFs with layout |
| **Semantic / symbol** | By meaning boundaries, or AST symbols for code | Code (your repo-intelligence chunks on symbol boundaries) |
| Parent-document | Embed small chunks, return the larger parent section | Precise matching + enough context |

**Always store metadata** with every chunk: `doc_id, source, page, section, tenant_id, acl,
created_at, chunk_index`. You need it for filters, citations and deletes.

### 1.4 Vector search

Exact search compares the query with every vector, which is O(n) and fine up to ~100k vectors.
Beyond that you use **ANN (approximate nearest neighbour)** indexes:

| Index | Idea | Trade-off |
|---|---|---|
| **HNSW** | Multi-layer graph you "walk" towards the query | Fast, high recall, more memory. Default choice |
| **IVF** (IVFFlat) | Cluster vectors, search only nearby clusters | Less memory, needs training, recall depends on `probes` |
| PQ / quantization | Compress vectors | Huge scale, some accuracy loss |

---

## 🟡 Level 2: Intermediate (build it on a real vector DB)

### 2.1 Choosing a vector DB

| Option | Pick when |
|---|---|
| **pgvector** (Postgres) | You already have Postgres. Vectors live next to relational data, with transactions, joins and SQL filters. **Default for most apps** up to ~10M vectors |
| **Qdrant** | Dedicated, fast filtering, payload indexes, hybrid. Open source |
| **Pinecone** | Fully managed, serverless, little ops |
| Weaviate / Milvus | Large scale, built-in hybrid/modules |
| Chroma / FAISS / sqlite-vec | Local, prototypes, embedded/desktop (your UACE uses sqlite-vec) |
| Elasticsearch / OpenSearch | You already run them. Strong BM25 + kNN hybrid |

### 2.2 pgvector: schema and queries

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  title       text NOT NULL,
  source_uri  text NOT NULL,
  checksum    text NOT NULL,              -- skip re-ingest when unchanged
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,              -- denormalized for fast filtering
  chunk_index int  NOT NULL,
  page        int,
  content     text NOT NULL,
  embedding   vector(1536) NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED  -- keyword search
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);   -- ANN index
CREATE INDEX ON chunks USING gin (tsv);                             -- full-text index
CREATE INDEX ON chunks (tenant_id);
```

```sql
-- top-5 semantic matches for a tenant. <=> is cosine DISTANCE (0 = identical)
SELECT id, document_id, page, content, 1 - (embedding <=> $1) AS score
FROM chunks
WHERE tenant_id = $2
ORDER BY embedding <=> $1
LIMIT 5;
```

Operators: `<=>` cosine distance, `<->` L2, `<#>` negative inner product. Tune recall with
`SET hnsw.ef_search = 100;`.

### 2.3 Ingestion pipeline in Python

```python
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import AsyncOpenAI
import hashlib

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
emb = AsyncOpenAI()

async def ingest_pdf(db, tenant_id: str, path: str):
    raw = open(path, "rb").read()
    checksum = hashlib.sha256(raw).hexdigest()
    if await doc_exists(db, tenant_id, checksum):            # idempotent
        return
    reader = PdfReader(path)
    rows = []
    for page_no, page in enumerate(reader.pages, start=1):
        for i, text in enumerate(splitter.split_text(page.extract_text() or "")):
            rows.append({"page": page_no, "chunk_index": i, "content": text})
    for batch in batched(rows, 96):                          # batch the embedding calls
        r = await emb.embeddings.create(model="text-embedding-3-small",
                                        input=[x["content"] for x in batch])
        for x, d in zip(batch, r.data):
            x["embedding"] = d.embedding
    await insert_document_and_chunks(db, tenant_id, path, checksum, rows)   # one transaction
```

Real-world parsing is the hard part: scanned PDFs need OCR, tables need layout-aware parsers
(`unstructured`, `docling`, LlamaParse, Azure Document Intelligence), and HTML needs boilerplate removal.

### 2.4 Qdrant equivalent

```python
from qdrant_client import AsyncQdrantClient, models
q = AsyncQdrantClient(url="http://localhost:6333")
await q.create_collection("chunks", vectors_config=models.VectorParams(size=1536,
                          distance=models.Distance.COSINE))
await q.create_payload_index("chunks", "tenant_id", models.PayloadSchemaType.KEYWORD)
hits = await q.query_points("chunks", query=qvec, limit=5,
        query_filter=models.Filter(must=[models.FieldCondition(key="tenant_id",
                                   match=models.MatchValue(value=tenant))]))
```

### 2.5 The generation step with citations

```python
def build_prompt(question: str, hits: list[dict]) -> str:
    sources = "\n".join(f"[{i}] ({h['title']} p.{h['page']}) {h['content']}"
                        for i, h in enumerate(hits, start=1))
    return (f"Answer using ONLY the sources. Cite every claim with [n]. "
            f"If the sources don't answer it, reply INSUFFICIENT_CONTEXT.\n\n"
            f"<sources>\n{sources}\n</sources>\n\n<question>{question}</question>")
```

---

## 🔴 Level 3: Advanced (what JD-2 means by "Advanced RAG")

### 3.1 Why naive RAG fails: diagnose by stage

| Symptom | Likely stage | Fix |
|---|---|---|
| Right doc exists, never retrieved | Retrieval | Hybrid search, query rewriting, better chunking, a better embedding model |
| Retrieved, but ranked 15th | Ranking | **Re-ranker** |
| Exact terms (IDs, error codes, names) missed | Embeddings are weak on exact tokens | **Hybrid with BM25** |
| Retrieved and in the prompt, answer still wrong | Generation | Prompt, fewer/better chunks ("lost in the middle"), stronger model |
| Confident answer, no support | Faithfulness | "INSUFFICIENT_CONTEXT" rule, citation validation, LLM-judge |
| Leaks another customer's data | Access control | Filter **inside** the search, never after |

**Always measure retrieval separately from generation.** Otherwise you can't tell which stage broke.

### 3.2 Hybrid search + Reciprocal Rank Fusion (RRF)

Run **keyword (BM25)** and **vector** search, then merge the two ranked lists. RRF only uses
*ranks*, so you don't have to calibrate scores across systems:

```
RRF(doc) = Σ over lists  1 / (k + rank_in_list)        k ≈ 60
```

Worked example: doc A is #1 in BM25 and #3 in vector → 1/61 + 1/63 = 0.0323. Doc B is #2 in
vector only → 1/62 = 0.0161. A wins, because both systems agree on it.

```sql
-- hybrid in pure Postgres
WITH sem AS (
  SELECT id, row_number() OVER (ORDER BY embedding <=> $1) AS r
  FROM chunks WHERE tenant_id = $3 ORDER BY embedding <=> $1 LIMIT 50
), kw AS (
  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS r
  FROM chunks, plainto_tsquery('english', $2) q
  WHERE tenant_id = $3 AND tsv @@ q ORDER BY ts_rank_cd(tsv, q) DESC LIMIT 50
)
SELECT id, SUM(1.0 / (60 + r)) AS rrf
FROM (SELECT * FROM sem UNION ALL SELECT * FROM kw) u
GROUP BY id ORDER BY rrf DESC LIMIT 20;
```

That's the same algorithm your repo-intelligence `fuse.ts` implements
([projects/03](projects/03-repo-intelligence.md)).

### 3.3 Re-ranking (your gap, and quick to close)

A **bi-encoder** (an embedding model) encodes the query and the doc *separately*, which is fast and
pre-computable but approximate. A **cross-encoder** reads *(query, doc) together* and outputs a
relevance score. That's much more accurate, too slow for millions of docs, and perfect for re-ordering
the top 20–50.

```
retrieve top 50 (hybrid, cheap, high recall)  →  cross-encoder re-rank  →  keep top 5 (high precision)
```

```python
from sentence_transformers import CrossEncoder
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")      # local, CPU-friendly

def rerank(query: str, hits: list[dict], top_n: int = 5) -> list[dict]:
    scores = reranker.predict([(query, h["content"]) for h in hits])
    for h, s in zip(hits, scores):
        h["rerank_score"] = float(s)
    return sorted(hits, key=lambda h: h["rerank_score"], reverse=True)[:top_n]
```

Hosted alternatives: Cohere Rerank, Voyage rerank, Jina. You can also use an LLM as the re-ranker
(score 0–10 per chunk): it's flexible, but slower and pricier. Run the CPU-bound cross-encoder in a
process pool or a separate service so it doesn't block your async API ([01 §3.6](01-python-for-ai-backends.md)).

Other ranking signals: **MMR** (maximal marginal relevance) for diversity, so you don't get 5
near-identical chunks; recency boosts; source authority; and metadata boosts.

### 3.4 Query-side techniques

| Technique | What |
|---|---|
| **Query rewriting** | LLM rewrites a chatty follow-up ("what about Q3?") into a standalone query using the chat history |
| **Multi-query** | Generate 3–5 phrasings, retrieve for each, fuse with RRF |
| **HyDE** | Generate a hypothetical answer, embed *that*, then search |
| **Decomposition** | Split a compound question into sub-questions (this is agentic RAG) |
| **Routing** | Choose which index/tool to use (docs vs SQL vs web) |
| **Metadata extraction** | "contracts signed in 2024" → filter `year=2024` + semantic "contracts" |

### 3.5 Citation accuracy (named in JD-2)

A citation is only valuable if it's **right**. Layers, cheapest first:

1. **Constrain format**: the model may only cite `[n]` for sources you supplied. Use structured
   output: `{"answer": str, "claims": [{"text": str, "source_ids": [int]}]}`.
2. **Validate IDs**: drop or flag any citation to a non-existent source.
3. **Verify quotes**: ask for a short supporting quote per claim and check it *actually appears* in the
   cited chunk (exact or fuzzy match). This is what your repo-intelligence `validate.ts` does
   for `path:line` citations: re-read from disk and reject fabricated ones.
4. **Entailment check**: an LLM-judge or NLI model checks "does source n support this claim?"
5. **UI**: clicking `[n]` opens the exact chunk and page, highlighted.

Principle (from your own repo-intelligence rules): **a fabricated citation is worse than no
answer, because it looks verified.**

### 3.6 Access control and multi-tenancy

- Filter by `tenant_id` / ACL **in the vector query** (pre-filter). Filtering after you take top-k
  can return 0 results and still leak scores.
- Row-Level Security in Postgres as defence in depth.
- Deleting a document must delete its chunks and vectors (GDPR/DPDP "right to erasure").

### 3.7 Advanced patterns to name

- **Contextual retrieval**: prepend an LLM-generated 1–2 sentence context ("This chunk is from
  Acme's 2024 refund policy, section 3") to each chunk before embedding and BM25. It's a large recall gain
  for ambiguous chunks.
- **Agentic RAG**: retrieval as a *tool* the agent calls repeatedly, reformulating as it goes ([06](06-agents-langchain-langgraph.md)).
- **GraphRAG / knowledge graphs**: entities and relations for "how are X and Y connected"
  questions. Your repo-intelligence code graph is a domain-specific version.
- **Text-to-SQL**: for numeric/aggregate questions, generate SQL against a read-only replica
  instead of retrieving text. That's essential for JD-2's "insight platform".
- **Freshness**: incremental re-indexing by checksum, and tombstones for deleted docs.

### 3.8 Evaluating RAG (preview of [10](10-observability-and-evals.md))

| Stage | Metric | Needs |
|---|---|---|
| Retrieval | **Recall@k** (did the right chunk appear in top-k?), **MRR** (how high?), nDCG | Labelled question → relevant chunk IDs |
| Generation | **Faithfulness** (claims supported by context), **answer relevance**, **correctness** vs reference | LLM-judge or human labels |
| Citations | Citation precision (cited source supports the claim), citation recall | Judge + labels |
| System | Latency p50/p95, cost per answer, % INSUFFICIENT_CONTEXT | Traces |

Tools: **Ragas**, DeepEval, LangSmith evaluators, Phoenix evals. The habit that impresses
interviewers is the one you already have from repo-intelligence: **no ranking change lands without a
before/after eval delta.**

---

## 🔧 Integration recipe: RAG as a FastAPI service + LangChain retriever

```python
# app/rag/service.py
class RagService:
    def __init__(self, db, embedder, reranker, llm):
        self.db, self.embedder, self.reranker, self.llm = db, embedder, reranker, llm

    async def retrieve(self, tenant_id: str, query: str, k: int = 5) -> list[dict]:
        qvec = await self.embedder.embed_query(query)
        candidates = await hybrid_search(self.db, tenant_id, query, qvec, limit=40)   # SQL above
        return await asyncio.to_thread(self.reranker, query, candidates, k)          # CPU → thread

    async def answer(self, tenant_id: str, question: str) -> CitedAnswer:
        hits = await self.retrieve(tenant_id, question)
        if not hits:
            return CitedAnswer(answer="INSUFFICIENT_CONTEXT", claims=[])
        result: CitedAnswer = await self.llm.structured(build_prompt(question, hits), CitedAnswer)
        return validate_citations(result, hits)          # drop claims citing unknown/unsupported ids
```

Expose `retrieve` to an agent as a tool:

```python
from langchain_core.tools import tool

@tool
async def search_knowledge_base(query: str) -> str:
    """Search internal documents. Use for questions about company policies, reports or products.
    Returns numbered passages with source and page; cite them as [n]."""
    hits = await rag.retrieve(current_tenant.get(), query)
    return "\n".join(f"[{i}] ({h['title']} p.{h['page']}) {h['content']}" for i, h in enumerate(hits, 1))
```

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| Hybrid BM25 + embeddings, RRF fusion, labelled eval, citation validator | repo-intelligence | [projects/03](projects/03-repo-intelligence.md) |
| Symbol-boundary chunking (code) | repo-intelligence | [projects/03](projects/03-repo-intelligence.md) |
| pgvector embeddings, near-duplicate detection at cosine ≥ 0.92 | pSEO Engine | [projects/07](projects/07-pseo-engine.md) |
| Qdrant long-term memory with payload filters and score threshold | AgentSystem | [projects/04](projects/04-agent-system.md) |
| sqlite-vec + FTS5 hybrid, graceful fallback to keyword search | UACE | [projects/06](projects/06-uace-mcp-server.md) |
| Document parsing (PDF/DOCX → structured) | Resite intake | [projects/08](projects/08-resite.md) |

## ✅ Self-check

1. Draw the index-time and query-time pipelines.
2. Why chunk? Pick a chunking strategy for: a contract PDF, a codebase, a FAQ page.
3. HNSW vs IVF in two sentences each.
4. Compute RRF for a doc ranked #2 in BM25 and #4 in vector (k=60).
5. Bi-encoder vs cross-encoder. Where does each go in the pipeline and why?
6. Users report wrong answers. How do you find out whether retrieval or generation is at fault?
7. Four layers of citation validation.
8. Why must tenant filtering happen inside the vector query?
9. You switch embedding models. What has to happen?

## ⚠️ Traps

- "Just increase k". More chunks bring more noise, cost and "lost in the middle".
- Mixing embedding models between index and query.
- Evaluating RAG only end to end.
- Post-filtering ACLs after top-k.
- No metadata on chunks, so you can't cite, filter or delete.

from app.services.retrieval_service import retrieve_similar_chunks

query = "What are the legal consequences of breach of contract?"

results = retrieve_similar_chunks(query)

for idx, result in enumerate(results):
    print(f"\nRESULT {idx + 1}")
    print(result["document"][:500])
import chromadb

from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)


def retrieve_similar_chunks(
    query,
    source_file,
    top_k=3
):

    collection = chroma_client.get_or_create_collection(
        name="legal_documents"
    )

    query_embedding = model.encode(
        query
    ).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],

        n_results=top_k,

        where={
            "source_file": source_file
        }
    )

    retrieved_chunks = []

    documents = results.get(
        "documents",
        [[]]
    )[0]

    metadatas = results.get(
        "metadatas",
        [[]]
    )[0]

    ids = results.get(
        "ids",
        [[]]
    )[0]

    for i in range(len(documents)):

        retrieved_chunks.append({
            "id": ids[i],
            "text": documents[i],
            "metadata": metadatas[i]
        })

    return retrieved_chunks

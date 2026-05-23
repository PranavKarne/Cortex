import os
import json
import chromadb

from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
    )
)

CHUNKS_DATA_PATH = os.path.join(BASE_DIR, "data", "chunks")

model = SentenceTransformer("all-MiniLM-L6-v2")

try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")

    collection = chroma_client.get_or_create_collection(
        name="legal_documents"
    )

except Exception as e:

    print(f"Warning: embeddings store unavailable: {e}")
    collection = None


def clear_embeddings():

    global collection

    if collection is None:
        return

    try:

        chroma_client.delete_collection(
            "legal_documents"
        )

        print("Old embeddings deleted")

    except Exception as e:

        print(f"Warning while deleting collection: {e}")

    collection = chroma_client.get_or_create_collection(
        name="legal_documents"
    )

    print("Fresh collection created")


def generate_embeddings(json_file_name):

    if collection is None:

        print(
            "Skipping embedding generation because ChromaDB is unavailable"
        )

        return

    json_path = os.path.join(
        CHUNKS_DATA_PATH,
        json_file_name
    )

    with open(
        json_path,
        "r",
        encoding="utf-8"
    ) as f:

        chunks = json.load(f)

    for chunk in chunks:

        embedding = model.encode(
            chunk["text"]
        ).tolist()

        collection.upsert(
            ids=[chunk["chunk_id"]],
            embeddings=[embedding],
            documents=[chunk["text"]],
            metadatas=[chunk["metadata"]]
        )

    print(f"Embeddings stored for: {json_file_name}")


def store_embeddings(chunks):

    if collection is None:

        print(
            "Skipping embedding storage because ChromaDB is unavailable"
        )

        return

    for chunk in chunks:

        embedding = model.encode(
            chunk["text"]
        ).tolist()

        collection.upsert(
            ids=[chunk["chunk_id"]],
            embeddings=[embedding],
            documents=[chunk["text"]],
            metadatas=[chunk["metadata"]]
        )

    print("Embeddings stored successfully")
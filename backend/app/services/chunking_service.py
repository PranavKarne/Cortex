import os
import json

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
    )
)

PROCESSED_DATA_PATH = os.path.join(BASE_DIR, "data", "processed")
CHUNKS_DATA_PATH = os.path.join(BASE_DIR, "data", "chunks")

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100


def split_text_into_chunks(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size

        chunk = text[start:end]

        chunks.append(chunk)

        start += chunk_size - overlap

    return chunks


def process_chunks(json_file_name):
    json_path = os.path.join(PROCESSED_DATA_PATH, json_file_name)

    with open(json_path, "r", encoding="utf-8") as f:
        document_data = json.load(f)

    text = document_data["content"]

    text_chunks = split_text_into_chunks(text)

    structured_chunks = []

    for index, chunk in enumerate(text_chunks):
        chunk_id = f"{json_file_name}:{index + 1}"

        structured_chunks.append({
            "chunk_id": chunk_id,
            "text": chunk,
            "metadata": {
                "source_file": json_file_name,
                "chunk_number": index + 1
            }
        })

    output_file = json_file_name.replace(".json", "_chunks.json")

    output_path = os.path.join(CHUNKS_DATA_PATH, output_file)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(structured_chunks, f, indent=4, ensure_ascii=False)

    print(f"Chunked: {json_file_name}")

def chunk_text(text, source_file):
    raw_chunks = split_text_into_chunks(text)

    structured_chunks = []

    for index, chunk in enumerate(raw_chunks):
        chunk_id = f"{source_file}:{index + 1}"

        structured_chunks.append({
            "chunk_id": chunk_id,
            "text": chunk,
            "metadata": {
                "source_file": source_file,
                "chunk_number": index + 1
            }
        })

    return structured_chunks
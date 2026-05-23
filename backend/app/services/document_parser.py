import fitz
import os
import json

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
    )
)

RAW_DATA_PATH = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_PATH = os.path.join(BASE_DIR, "data", "processed")

os.makedirs(RAW_DATA_PATH, exist_ok=True)
os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)


def extract_text_from_pdf(pdf_path):
    document = fitz.open(pdf_path)

    full_text = ""

    for page in document:
        full_text += page.get_text()

    return full_text


def process_pdf(file_name):
    pdf_path = file_name

    extracted_text = extract_text_from_pdf(pdf_path)

    structured_output = {
        "file_name": os.path.basename(file_name),
        "content": extracted_text
    }

    output_file = os.path.basename(file_name).replace(".pdf", ".json")

    output_path = os.path.join(PROCESSED_DATA_PATH, output_file)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(structured_output, f, indent=4, ensure_ascii=False)

    print(f"Processed: {file_name}")

    return extracted_text
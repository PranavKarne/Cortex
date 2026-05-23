"""
Initialize ChromaDB with legal documents for the courtroom feature.
"""
import os
import fitz  # PyMuPDF
import chromadb
from sentence_transformers import SentenceTransformer
import glob

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="legal_documents")

# Initialize embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Sample legal context if no PDFs are found
SAMPLE_LEGAL_CONTENT = [
    {
        "title": "Indian Evidence Act, 1872 - Section 45",
        "content": """When the court has to form an opinion upon a point of foreign law, or of science, or 
        an art, or as to identity of hand-writing or finger impressions, the opinions upon that 
        point of persons specially skilled in such foreign law, science or art, or in questions 
        as to identity of hand-writing or finger impressions are relevant facts."""
    },
    {
        "title": "Criminal Procedure Code - Section 308",
        "content": """Cases where bail in bailable offense can be offered. When any person is accused 
        of an offense punishable with imprisonment which may extend to seven years or upwards 
        but not to imprisonment for life, and such person is arrested without warrant, the 
        police officer making the arrest may release such person on bail."""
    },
    {
        "title": "Indian Penal Code - Section 304A",
        "content": """Causing death by negligence. Whoever causes death by doing any rash or negligent act 
        not amounting to culpable homicide, shall be punished with imprisonment of either 
        description for a term which may extend to two years, or with fine which may extend 
        to one thousand rupees, or with both."""
    },
    {
        "title": "Right to Equality - Article 14",
        "content": """The State shall not deny to any person equality before the law or the equal 
        protection of the laws within the territory of India. Prohibition of discrimination 
        on grounds of religion, race, caste, sex or place of birth."""
    },
    {
        "title": "Bail Guidelines - Supreme Court Judgment",
        "content": """Bail is a right in a bailable offense and a discretion in a non-bailable offense. 
        The objective of bail is to ensure the accused's appearance before the court. Factors 
        like gravity of offense, nature of evidence, and criminal antecedents are considered. 
        Bail should not be refused merely on the basis of severity of the offense."""
    },
    {
        "title": "Witness Examination - Cross Examination",
        "content": """During cross-examination, counsel may put to the witness any question which 
        is relevant to the issues in the trial, and which is not excluded by applicable rules 
        of evidence. The purpose is to test the accuracy, credibility, and veracity of the 
        witness's testimony."""
    }
]

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return None

def chunk_text(text, chunk_size=500):
    """Split text into overlapping chunks."""
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i+chunk_size+100]  # Add overlap
        if chunk.strip():
            chunks.append(chunk)
    return chunks

def index_documents():
    """Index documents into ChromaDB."""
    documents = []
    metadatas = []
    ids = []
    
    # Try to load PDFs from data/raw directory
    pdf_files = glob.glob("./data/raw/*.PDF") + glob.glob("./data/raw/*.pdf")
    
    doc_id = 0
    
    if pdf_files:
        print(f"Found {len(pdf_files)} PDF files. Indexing...")
        for pdf_path in pdf_files:
            print(f"  Processing: {os.path.basename(pdf_path)}")
            text = extract_text_from_pdf(pdf_path)
            if text:
                chunks = chunk_text(text)
                for chunk in chunks:
                    documents.append(chunk)
                    metadatas.append({
                        "source": os.path.basename(pdf_path),
                        "type": "pdf"
                    })
                    ids.append(f"doc_{doc_id}")
                    doc_id += 1
    
    # Add sample legal content
    print(f"Adding {len(SAMPLE_LEGAL_CONTENT)} sample legal documents...")
    for item in SAMPLE_LEGAL_CONTENT:
        chunks = chunk_text(item["content"])
        for chunk in chunks:
            documents.append(chunk)
            metadatas.append({
                "source": item["title"],
                "type": "legal_reference"
            })
            ids.append(f"doc_{doc_id}")
            doc_id += 1
    
    if documents:
        print(f"Indexing {len(documents)} chunks into ChromaDB...")
        
        # Generate embeddings
        embeddings = model.encode(documents).tolist()
        
        # Add to ChromaDB
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        print(f"✓ Successfully indexed {len(documents)} documents")
    else:
        print("✗ No documents to index")

if __name__ == "__main__":
    print("Initializing ChromaDB for Courtroom Practice...")
    index_documents()
    print("✓ ChromaDB initialization complete!")

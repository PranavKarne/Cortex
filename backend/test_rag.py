from app.services.rag_service import generate_legal_answer

query = "What powers do acting judges have?"
answer = generate_legal_answer(query)

print("\nAI LEGAL ANSWER:\n")
print(answer)
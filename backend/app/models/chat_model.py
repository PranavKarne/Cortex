from pydantic import BaseModel
from typing import List
from datetime import datetime


class Source(BaseModel):
    file: str
    chunk: int


class ChatHistory(BaseModel):
    query: str
    answer: str
    sources: List[Source]
    timestamp: datetime
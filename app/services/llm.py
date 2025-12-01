import itertools
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from app.core.config import settings

# Global iterator for key cycling
_groq_key_cycle = None

def get_next_groq_key():
    global _groq_key_cycle
    keys = settings.groq_api_key_list
    if not keys:
        return None
    
    if _groq_key_cycle is None:
        _groq_key_cycle = itertools.cycle(keys)
    
    return next(_groq_key_cycle)

def get_llm():
    groq_key = get_next_groq_key()
    if groq_key:
        return ChatGroq(
            api_key=groq_key,
            model_name="llama-3.3-70b-versatile"
        )
    elif settings.OPENAI_API_KEY:
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model="gpt-4o"
        )
    else:
        return None

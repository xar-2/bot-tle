from ddgs import DDGS
from typing import List, Dict

class WebSearch:
    def __init__(self):
        pass

    def search(self, query: str, max_results: int = 3) -> str:
        if not query:
            return "Query pencarian tidak boleh kosong."

        try:
            results = []
            # Gunakan DDGS untuk mencari di internet dengan region Indonesia
            with DDGS() as ddgs:
                for r in ddgs.text(query, region='id-id', safesearch='moderate', timelimit=None, max_results=max_results):
                    results.append(r)
            
            if not results:
                return f"🔍 Tidak ditemukan hasil untuk: '{query}'"

            # Format hasil pencarian
            response_text = f"🔍 **Hasil Pencarian Web:** '{query}'\n\n"
            for i, res in enumerate(results, 1):
                title = res.get('title', 'Tanpa Judul')
                body = res.get('body', '')
                href = res.get('href', '#')
                
                response_text += f"{i}. *{title}*\n"
                response_text += f"{body[:150]}...\n"
                response_text += f"🔗 [Baca selengkapnya]({href})\n\n"

            return response_text
        except Exception as e:
            print(f"Web Search Error: {e}")
            return f"❌ Maaf, terjadi kesalahan saat melakukan pencarian: {str(e)}"

web_search_engine = WebSearch()

try:
    from duckduckgo_search import DDGS
except ImportError:
    # Fallback jika library belum terinstall
    class DDGS:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def text(self, *args, **kwargs): return []

from typing import List, Dict

class WebSearch:
    def __init__(self):
        pass

    def search(self, query: str, max_results: int = 3) -> str:
        if not query:
            return "Query pencarian tidak boleh kosong."

        try:
            results = []
            # Gunakan DDGS untuk mencari di internet
            with DDGS() as ddgs:
                ddgs_gen = ddgs.text(query, region='id-id', safesearch='moderate', timelimit=None)
                for r in ddgs_gen:
                    results.append(r)
                    if len(results) >= max_results:
                        break
            
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
            if "ratelimit" in str(e).lower():
                return "❌ Maaf, terlalu banyak permintaan ke mesin pencari. Silakan coba lagi nanti."
            return f"❌ Maaf, terjadi kesalahan saat melakukan pencarian: {str(e)}"

web_search_engine = WebSearch()

# brandrag.py
import requests
import json
from typing import List, Dict, Optional

class BrandRAG:
    def __init__(self, metta_instance):
        self.metta = metta_instance
        # Your ngrok URL - update this with your current ngrok URL
        self.kg_base_url = "https://ba02caeecf6f.ngrok-free.app"
    
    def get_all_brands(self) -> List[str]:
        """Get all brands available in the knowledge graph."""
        try:
            response = requests.get(f"{self.kg_base_url}/kg/get_all_brands")
            if response.status_code == 200:
                data = response.json()
                return data.get("brands", [])
            return []
        except Exception as e:
            print(f"Error fetching brands: {e}")
            return []
    
    def query_brand_data(self, brand_name: str, data_type: str = None, sentiment: str = None) -> List[str]:
        """Query specific brand data from the knowledge graph."""
        try:
            params = {"brand_name": brand_name}
            if data_type:
                params["data_type"] = data_type
            if sentiment:
                params["sentiment"] = sentiment
            
            response = requests.get(f"{self.kg_base_url}/kg/query_brand_data", params=params)
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            return []
        except Exception as e:
            print(f"Error querying brand data: {e}")
            return []
    
    def get_brand_summary(self, brand_name: str) -> Dict:
        """Get comprehensive brand summary from knowledge graph."""
        try:
            response = requests.get(f"{self.kg_base_url}/kg/get_brand_summary", params={"brand_name": brand_name})
            if response.status_code == 200:
                data = response.json()
                return data.get("summary", {})
            return {}
        except Exception as e:
            print(f"Error getting brand summary: {e}")
            return {}
    
    def query_web_results(self, brand_name: str) -> List[str]:
        """Get web search results for a brand."""
        return self.query_brand_data(brand_name, "web_results")
    
    def query_reddit_threads(self, brand_name: str, sentiment: str = None) -> List[str]:
        """Get Reddit threads for a brand."""
        return self.query_brand_data(brand_name, "reddit_threads", sentiment)
    
    def query_reviews(self, brand_name: str, sentiment: str = None) -> List[str]:
        """Get reviews for a brand."""
        return self.query_brand_data(brand_name, "reviews", sentiment)
    
    def query_social_comments(self, brand_name: str, sentiment: str = None) -> List[str]:
        """Get social media comments for a brand."""
        return self.query_brand_data(brand_name, "social_comments", sentiment)
    
    def query_faq(self, question: str) -> Optional[str]:
        """Retrieve FAQ answers from local MeTTa knowledge graph."""
        query_str = f'!(match &self (faq "{question}" $answer) $answer)'
        results = self.metta.run(query_str)
        return results[0][0].get_object().value if results and results[0] else None
    
    def add_knowledge(self, relation_type: str, subject: str, object_value: str):
        """Add new knowledge to local MeTTa knowledge graph."""
        from hyperon import E, S, ValueAtom
        self.metta.space().add_atom(E(S(relation_type), S(subject), ValueAtom(object_value)))
        return f"Added {relation_type}: {subject} → {object_value}"
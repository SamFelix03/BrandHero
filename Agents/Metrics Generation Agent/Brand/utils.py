import json
from openai import OpenAI
from .brandrag import BrandRAG

class LLM:
    def __init__(self, api_key):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.asi1.ai/v1"
        )

    def create_completion(self, prompt):
        completion = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="asi1-mini"  # ASI:One model name
        )
        return completion.choices[0].message.content

def get_intent_and_keyword(query, llm):
    """Use ASI:One API to classify intent and extract a keyword."""
    prompt = (
        f"Given the query: '{query}'\n"
        "Classify the intent as one of: 'brand_research', 'sentiment_analysis', 'competitor_analysis', 'faq', or 'unknown'.\n"
        "Extract the most relevant keyword (e.g., a brand name) from the query.\n"
        "Return *only* the result in JSON format like this, with no additional text:\n"
        "{\n"
        "  \"intent\": \"<classified_intent>\",\n"
        "  \"keyword\": \"<extracted_keyword>\"\n"
        "}"
    )
    response = llm.create_completion(prompt)
    try:
        result = json.loads(response)
        return result["intent"], result["keyword"]
    except json.JSONDecodeError:
        print(f"Error parsing ASI:One response: {response}")
        return "unknown", None

def generate_knowledge_response(query, intent, keyword, llm):
    """Use ASI:One to generate a response for new knowledge based on intent."""
    if intent == "brand_research":
        prompt = (
            f"Query: '{query}'\n"
            "This is a new brand research question not in my knowledge base. Provide a helpful response about brand research.\n"
            "Return *only* the answer, no additional text."
        )
    elif intent == "sentiment_analysis":
        prompt = (
            f"Query: '{query}'\n"
            "This is a sentiment analysis question not in my knowledge base. Provide helpful information about sentiment analysis.\n"
            "Return *only* the answer, no additional text."
        )
    elif intent == "competitor_analysis":
        prompt = (
            f"Query: '{query}'\n"
            "This is a competitor analysis question not in my knowledge base. Provide helpful information about competitor analysis.\n"
            "Return *only* the answer, no additional text."
        )
    elif intent == "faq":
        prompt = (
            f"Query: '{query}'\n"
            "This is a new FAQ not in my knowledge base. Provide a concise, helpful answer.\n"
            "Return *only* the answer, no additional text."
        )
    else:
        return None
    return llm.create_completion(prompt)

def process_query(query, rag: BrandRAG, llm: LLM):
    intent, keyword = get_intent_and_keyword(query, llm)
    print(f"Intent: {intent}, Keyword: {keyword}")
    prompt = ""

    if intent == "faq":
        faq_answer = rag.query_faq(query)
        if not faq_answer and keyword:
            new_answer = generate_knowledge_response(query, intent, keyword, llm)
            rag.add_knowledge("faq", query, new_answer)
            print(f"Knowledge graph updated - Added FAQ: '{query}' → '{new_answer}'")
            prompt = (
                f"Query: '{query}'\n"
                f"FAQ Answer: '{new_answer}'\n"
                "Humanize this for a brand research assistant with a professional tone."
            )
        elif faq_answer:
            prompt = (
                f"Query: '{query}'\n"
                f"FAQ Answer: '{faq_answer}'\n"
                "Humanize this for a brand research assistant with a professional tone."
            )
    
    elif intent == "brand_research" and keyword:
        # Get comprehensive brand data
        print(f"🔍 Fetching comprehensive brand data for: '{keyword}'")
        brand_summary = rag.get_brand_summary(keyword)
        print(f"📊 Brand summary received: {type(brand_summary)} - {bool(brand_summary)}")
        
        if brand_summary:
            print(f"📊 Brand summary keys: {list(brand_summary.keys()) if isinstance(brand_summary, dict) else 'Not a dict'}")
            
            web_results = brand_summary.get('web_results', [])
            print(f"📊 Web Results: {len(web_results) if web_results else 0} items")
            if web_results:
                print(f"   Sample: {web_results[0][:100]}..." if len(web_results[0]) > 100 else f"   Sample: {web_results[0]}")
            
            positive_reddit = brand_summary.get('positive_reddit', [])
            print(f"📊 Positive Reddit: {len(positive_reddit) if positive_reddit else 0} items")
            if positive_reddit:
                print(f"   Sample: {positive_reddit[0][:100]}..." if len(positive_reddit[0]) > 100 else f"   Sample: {positive_reddit[0]}")
            
            negative_reddit = brand_summary.get('negative_reddit', [])
            print(f"📊 Negative Reddit: {len(negative_reddit) if negative_reddit else 0} items")
            if negative_reddit:
                print(f"   Sample: {negative_reddit[0][:100]}..." if len(negative_reddit[0]) > 100 else f"   Sample: {negative_reddit[0]}")
            
            positive_reviews = brand_summary.get('positive_reviews', [])
            print(f"📊 Positive Reviews: {len(positive_reviews) if positive_reviews else 0} items")
            if positive_reviews:
                print(f"   Sample: {positive_reviews[0][:100]}..." if len(positive_reviews[0]) > 100 else f"   Sample: {positive_reviews[0]}")
            
            negative_reviews = brand_summary.get('negative_reviews', [])
            print(f"📊 Negative Reviews: {len(negative_reviews) if negative_reviews else 0} items")
            if negative_reviews:
                print(f"   Sample: {negative_reviews[0][:100]}..." if len(negative_reviews[0]) > 100 else f"   Sample: {negative_reviews[0]}")
            
            positive_social = brand_summary.get('positive_social', [])
            print(f"📊 Positive Social: {len(positive_social) if positive_social else 0} items")
            if positive_social:
                print(f"   Sample: {positive_social[0][:100]}..." if len(positive_social[0]) > 100 else f"   Sample: {positive_social[0]}")
            
            negative_social = brand_summary.get('negative_social', [])
            print(f"📊 Negative Social: {len(negative_social) if negative_social else 0} items")
            if negative_social:
                print(f"   Sample: {negative_social[0][:100]}..." if len(negative_social[0]) > 100 else f"   Sample: {negative_social[0]}")
            
            prompt = (
                f"Query: '{query}'\n"
                f"Brand: {keyword}\n"
                f"Web Results: {web_results[0] if web_results else 'No data available'}\n"
                f"Positive Reddit: {positive_reddit[0] if positive_reddit else 'No data available'}\n"
                f"Negative Reddit: {negative_reddit[0] if negative_reddit else 'No data available'}\n"
                f"Positive Reviews: {positive_reviews[0] if positive_reviews else 'No data available'}\n"
                f"Negative Reviews: {negative_reviews[0] if negative_reviews else 'No data available'}\n"
                f"Positive Social: {positive_social[0] if positive_social else 'No data available'}\n"
                f"Negative Social: {negative_social[0] if negative_social else 'No data available'}\n"
                "Generate a comprehensive brand analysis report with insights and recommendations."
            )
            print(f"📝 Generated prompt length: {len(prompt)} characters")
        else:
            # Brand not found, suggest research
            print(f"🔍 Brand '{keyword}' not found in knowledge graph")
            all_brands = rag.get_all_brands()
            print(f"📊 Available brands in KG: {all_brands}")
            
            prompt = (
                f"Query: '{query}'\n"
                f"Brand: {keyword}\n"
                f"Available brands in knowledge graph: {', '.join(all_brands) if all_brands else 'None'}\n"
                "This brand is not in our knowledge graph yet. Suggest how to research this brand and what data sources to use."
            )
    
    elif intent == "sentiment_analysis" and keyword:
        # Get sentiment-specific data
        print(f"🔍 Fetching sentiment data for brand: '{keyword}'")
        
        positive_reviews = rag.query_reviews(keyword, "positive")
        print(f"📊 Positive Reviews: {len(positive_reviews) if positive_reviews else 0} items")
        if positive_reviews:
            print(f"   Sample: {positive_reviews[0][:100]}..." if len(positive_reviews[0]) > 100 else f"   Sample: {positive_reviews[0]}")
        
        negative_reviews = rag.query_reviews(keyword, "negative")
        print(f"📊 Negative Reviews: {len(negative_reviews) if negative_reviews else 0} items")
        if negative_reviews:
            print(f"   Sample: {negative_reviews[0][:100]}..." if len(negative_reviews[0]) > 100 else f"   Sample: {negative_reviews[0]}")
        
        positive_reddit = rag.query_reddit_threads(keyword, "positive")
        print(f"📊 Positive Reddit: {len(positive_reddit) if positive_reddit else 0} items")
        if positive_reddit:
            print(f"   Sample: {positive_reddit[0][:100]}..." if len(positive_reddit[0]) > 100 else f"   Sample: {positive_reddit[0]}")
        
        negative_reddit = rag.query_reddit_threads(keyword, "negative")
        print(f"📊 Negative Reddit: {len(negative_reddit) if negative_reddit else 0} items")
        if negative_reddit:
            print(f"   Sample: {negative_reddit[0][:100]}..." if len(negative_reddit[0]) > 100 else f"   Sample: {negative_reddit[0]}")
        
        positive_social = rag.query_social_comments(keyword, "positive")
        print(f"📊 Positive Social: {len(positive_social) if positive_social else 0} items")
        if positive_social:
            print(f"   Sample: {positive_social[0][:100]}..." if len(positive_social[0]) > 100 else f"   Sample: {positive_social[0]}")
        
        negative_social = rag.query_social_comments(keyword, "negative")
        print(f"📊 Negative Social: {len(negative_social) if negative_social else 0} items")
        if negative_social:
            print(f"   Sample: {negative_social[0][:100]}..." if len(negative_social[0]) > 100 else f"   Sample: {negative_social[0]}")
        
        print(f"🔍 Total sentiment data items: {sum([len(x) if x else 0 for x in [positive_reviews, negative_reviews, positive_reddit, negative_reddit, positive_social, negative_social]])}")
        
        if any([positive_reviews, negative_reviews, positive_reddit, negative_reddit, positive_social, negative_social]):
            prompt = (
                f"Query: '{query}'\n"
                f"Brand: {keyword}\n"
                f"Positive Reviews: {positive_reviews[0] if positive_reviews else 'No data'}\n"
                f"Negative Reviews: {negative_reviews[0] if negative_reviews else 'No data'}\n"
                f"Positive Reddit: {positive_reddit[0] if positive_reddit else 'No data'}\n"
                f"Negative Reddit: {negative_reddit[0] if negative_reddit else 'No data'}\n"
                f"Positive Social: {positive_social[0] if positive_social else 'No data'}\n"
                f"Negative Social: {negative_social[0] if negative_social else 'No data'}\n"
                "Provide a detailed sentiment analysis with key themes, trends, and actionable insights."
            )
            print(f"📝 Generated prompt length: {len(prompt)} characters")
        else:
            # Check if the knowledge graph is accessible at all
            print(f"🔍 No sentiment data found, checking knowledge graph accessibility...")
            all_brands = rag.get_all_brands()
            print(f"📊 Available brands in KG: {all_brands}")
            
            if not all_brands:
                prompt = (
                    f"Query: '{query}'\n"
                    f"Brand: {keyword}\n"
                    "The knowledge graph appears to be empty or inaccessible. This could be because:\n"
                    "1. The ngrok URL is outdated or incorrect\n"
                    "2. The brand research orchestrator is not running\n"
                    "3. No brands have been researched yet\n"
                    "Please suggest how to set up the knowledge graph and research this brand."
                )
            else:
                prompt = (
                    f"Query: '{query}'\n"
                    f"Brand: {keyword}\n"
                    f"Available brands in knowledge graph: {', '.join(all_brands)}\n"
                    f"No sentiment data available for '{keyword}'. This brand hasn't been researched yet. "
                    f"Suggest how to research this brand and what data sources to use."
                )
    
    elif intent == "competitor_analysis" and keyword:
        # Get all brands and suggest competitor analysis
        all_brands = rag.get_all_brands()
        prompt = (
            f"Query: '{query}'\n"
            f"Brand: {keyword}\n"
            f"Available brands in knowledge graph: {', '.join(all_brands) if all_brands else 'None'}\n"
            "Suggest a competitor analysis approach and which brands to compare."
        )
    
    if not prompt:
        prompt = f"Query: '{query}'\nNo specific info found. Offer general brand research assistance."

    prompt += "\nFormat response as: 'Selected Question: <question>' on first line, 'Humanized Answer: <response>' on second."
    print(f"📝 Final prompt length: {len(prompt)} characters")
    print(f"📝 Final prompt preview: {prompt[:200]}...")
    
    print(f"🤖 Sending prompt to ASI:One LLM...")
    response = llm.create_completion(prompt)
    print(f"📥 LLM response received: {len(response)} characters")
    print(f"📥 LLM response preview: {response[:200]}...")
    
    try:
        selected_q = response.split('\n')[0].replace("Selected Question: ", "").strip()
        answer = response.split('\n')[1].replace("Humanized Answer: ", "").strip()
        print(f"✅ Parsed response successfully:")
        print(f"   Selected Question: {selected_q}")
        print(f"   Humanized Answer: {answer[:100]}..." if len(answer) > 100 else f"   Humanized Answer: {answer}")
        return {"selected_question": selected_q, "humanized_answer": answer}
    except IndexError:
        print(f"⚠️ Failed to parse LLM response format, returning raw response")
        print(f"   Raw response: {response[:200]}...")
        return {"selected_question": query, "humanized_answer": response}
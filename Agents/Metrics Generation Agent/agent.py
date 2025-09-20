from datetime import datetime, timezone
import mailbox
from uuid import uuid4
from typing import Any, Dict, List, Optional
import json
import os
from dotenv import load_dotenv
from uagents import Context, Model, Protocol, Agent
from hyperon import MeTTa

from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

# Import components from separate files
from brand.brandrag import BrandRAG
from brand.knowledge import initialize_knowledge_graph
from brand.utils import LLM, process_query

# Load environment variables
load_dotenv()

# Set your API keys
ASI_ONE_API_KEY = os.environ.get("ASI_ONE_API_KEY")
AGENTVERSE_API_KEY = os.environ.get("AGENTVERSE_API_KEY")

if not ASI_ONE_API_KEY:
    raise ValueError("Please set ASI_ONE_API_KEY environment variable")
if not AGENTVERSE_API_KEY:
    raise ValueError("Please set AGENTVERSE_API_KEY environment variable")

# Initialize agent
agent = Agent(
    name="brand_research_metta_agent",
    port=8080,
    seed="brand research metta agent seed",
    mailbox=True,
    endpoint=["http://localhost:8080/submit"]
)

# REST API Models
class BrandResearchRequest(Model):
    brand_name: str

class BrandResearchResponse(Model):
    success: bool
    brand_name: str
    research_result: str
    timestamp: str
    agent_address: str

class BrandQueryRequest(Model):
    query: str

class BrandQueryResponse(Model):
    success: bool
    query: str
    answer: str
    timestamp: str
    agent_address: str

class BrandDataRequest(Model):
    brand_name: str
    data_type: Optional[str] = None
    sentiment: Optional[str] = None

class BrandDataResponse(Model):
    success: bool
    brand_name: str
    data_type: str
    sentiment: str
    results: List[str]
    timestamp: str
    agent_address: str

class BrandSummaryRequest(Model):
    brand_name: str

class BrandSummaryResponse(Model):
    success: bool
    brand_name: str
    summary: Dict
    timestamp: str
    agent_address: str

class AllBrandsResponse(Model):
    success: bool
    brands: List[str]
    timestamp: str
    agent_address: str

# Initialize global components
metta = MeTTa()
initialize_knowledge_graph(metta)
rag = BrandRAG(metta)
llm = LLM(api_key=ASI_ONE_API_KEY)

# Protocol setup
chat_proto = Protocol(spec=chat_protocol_spec)

def create_text_chat(text: str, end_session: bool = False) -> ChatMessage:
    """Create a text chat message."""
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=content,
    )

# Startup Handler
@agent.on_event("startup")
async def startup_handler(ctx: Context):
    ctx.logger.info(f"Brand Research MeTTa Agent started with address: {ctx.agent.address}")
    ctx.logger.info("Agent is ready to process brand research queries using MeTTa Knowledge Graph!")
    ctx.logger.info("REST API endpoints available:")
    ctx.logger.info("- POST http://localhost:8080/brand/research")
    ctx.logger.info("- POST http://localhost:8080/brand/query")
    ctx.logger.info("- POST http://localhost:8080/brand/data")
    ctx.logger.info("- POST http://localhost:8080/brand/summary")
    ctx.logger.info("- GET  http://localhost:8080/brands/all")

# Chat Protocol Handlers
@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming chat messages and process brand research queries."""
    ctx.storage.set(str(ctx.session), sender)
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id),
    )

    for item in msg.content:
        if isinstance(item, StartSessionContent):
            ctx.logger.info(f"Got a start session message from {sender}")
            continue
        elif isinstance(item, TextContent):
            user_query = item.text.strip()
            ctx.logger.info(f"Got a brand research query from {sender}: {user_query}")
            
            try:
                # Process the query using the brand research assistant logic
                response = process_query(user_query, rag, llm)
                
                # Format the response
                if isinstance(response, dict):
                    answer_text = f"**{response.get('selected_question', user_query)}**\n\n{response.get('humanized_answer', 'I apologize, but I could not process your query.')}"
                else:
                    answer_text = str(response)
                
                # Send the response back
                await ctx.send(sender, create_text_chat(answer_text))
                
            except Exception as e:
                ctx.logger.error(f"Error processing brand research query: {e}")
                await ctx.send(
                    sender, 
                    create_text_chat("I apologize, but I encountered an error processing your brand research query. Please try again.")
                )
        else:
            ctx.logger.info(f"Got unexpected content from {sender}")

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle chat acknowledgements."""
    ctx.logger.info(f"Got an acknowledgement from {sender} for {msg.acknowledged_msg_id}")

# REST API Handlers
@agent.on_rest_post("/brand/research", BrandResearchRequest, BrandResearchResponse)
async def handle_brand_research(ctx: Context, req: BrandResearchRequest) -> BrandResearchResponse:
    """Handle comprehensive brand research requests."""
    ctx.logger.info(f"Received brand research request for: {req.brand_name}")
    
    try:
        # Get comprehensive brand data from knowledge graph
        brand_summary = rag.get_brand_summary(req.brand_name)
        
        if brand_summary:
            # Format the research result
            research_result = f"**Comprehensive Brand Research for {req.brand_name}**\n\n"
            
            if brand_summary.get('web_results'):
                research_result += f"**Web Results:**\n{brand_summary['web_results']}\n\n"
            
            if brand_summary.get('positive_reviews'):
                research_result += f"**Positive Reviews:**\n{brand_summary['positive_reviews']}\n\n"
            
            if brand_summary.get('negative_reviews'):
                research_result += f"**Negative Reviews:**\n{brand_summary['negative_reviews']}\n\n"
            
            if brand_summary.get('positive_reddit'):
                research_result += f"**Positive Reddit Discussions:**\n{brand_summary['positive_reddit']}\n\n"
            
            if brand_summary.get('negative_reddit'):
                research_result += f"**Negative Reddit Discussions:**\n{brand_summary['negative_reddit']}\n\n"
            
            if brand_summary.get('positive_social'):
                research_result += f"**Positive Social Media:**\n{brand_summary['positive_social']}\n\n"
            
            if brand_summary.get('negative_social'):
                research_result += f"**Negative Social Media:**\n{brand_summary['negative_social']}\n\n"
            
            return BrandResearchResponse(
                success=True,
                brand_name=req.brand_name,
                research_result=research_result,
                timestamp=datetime.now(timezone.utc).isoformat(),
                agent_address=ctx.agent.address
            )
        else:
            return BrandResearchResponse(
                success=False,
                brand_name=req.brand_name,
                research_result=f"No data found for brand: {req.brand_name}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                agent_address=ctx.agent.address
            )
        
    except Exception as e:
        error_msg = f"Error processing brand research for {req.brand_name}: {str(e)}"
        ctx.logger.error(error_msg)
        
        return BrandResearchResponse(
            success=False,
            brand_name=req.brand_name,
            research_result=error_msg,
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )

@agent.on_rest_post("/brand/query", BrandQueryRequest, BrandQueryResponse)
async def handle_brand_query(ctx: Context, req: BrandQueryRequest) -> BrandQueryResponse:
    """Handle general brand research queries."""
    ctx.logger.info(f"Received brand query: {req.query}")
    
    try:
        # Process the query using the brand research assistant logic
        response = process_query(req.query, rag, llm)
        
        # Format the response
        if isinstance(response, dict):
            answer_text = f"**{response.get('selected_question', req.query)}**\n\n{response.get('humanized_answer', 'I apologize, but I could not process your query.')}"
        else:
            answer_text = str(response)
        
        return BrandQueryResponse(
            success=True,
            query=req.query,
            answer=answer_text,
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )
        
    except Exception as e:
        error_msg = f"Error processing query '{req.query}': {str(e)}"
        ctx.logger.error(error_msg)
        
        return BrandQueryResponse(
            success=False,
            query=req.query,
            answer=error_msg,
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )

@agent.on_rest_post("/brand/data", BrandDataRequest, BrandDataResponse)
async def handle_brand_data(ctx: Context, req: BrandDataRequest) -> BrandDataResponse:
    """Handle specific brand data queries."""
    ctx.logger.info(f"Received brand data request for: {req.brand_name}, type: {req.data_type}, sentiment: {req.sentiment}")
    
    try:
        # Query specific brand data
        results = rag.query_brand_data(req.brand_name, req.data_type, req.sentiment)
        
        return BrandDataResponse(
            success=True,
            brand_name=req.brand_name,
            data_type=req.data_type or "all",
            sentiment=req.sentiment or "all",
            results=results,
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )
        
    except Exception as e:
        error_msg = f"Error processing brand data request: {str(e)}"
        ctx.logger.error(error_msg)
        
        return BrandDataResponse(
            success=False,
            brand_name=req.brand_name,
            data_type=req.data_type or "all",
            sentiment=req.sentiment or "all",
            results=[],
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )

@agent.on_rest_post("/brand/summary", BrandSummaryRequest, BrandSummaryResponse)
async def handle_brand_summary(ctx: Context, req: BrandSummaryRequest) -> BrandSummaryResponse:
    """Handle brand summary requests."""
    ctx.logger.info(f"Received brand summary request for: {req.brand_name}")
    
    try:
        # Get comprehensive brand summary
        summary = rag.get_brand_summary(req.brand_name)
        
        return BrandSummaryResponse(
            success=True,
            brand_name=req.brand_name,
            summary=summary,
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )
        
    except Exception as e:
        error_msg = f"Error processing brand summary request: {str(e)}"
        ctx.logger.error(error_msg)
        
        return BrandSummaryResponse(
            success=False,
            brand_name=req.brand_name,
            summary={},
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )

@agent.on_rest_get("/brands/all", AllBrandsResponse)
async def handle_all_brands(ctx: Context) -> AllBrandsResponse:
    """Handle requests for all available brands."""
    ctx.logger.info("Received request for all brands")
    
    try:
        # Get all brands
        brands = rag.get_all_brands()
        
        return AllBrandsResponse(
            success=True,
            brands=brands,
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )
        
    except Exception as e:
        error_msg = f"Error processing all brands request: {str(e)}"
        ctx.logger.error(error_msg)
        
        return AllBrandsResponse(
            success=False,
            brands=[],
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_address=ctx.agent.address
        )

# Include the chat protocol
agent.include(chat_proto, publish_manifest=True)

if __name__ == '__main__':
    print("🚀 Starting Brand Research MeTTa Agent...")
    print(f"✅ Agent address: {agent.address}")
    print("📡 Ready to process brand research queries using MeTTa Knowledge Graph")
    print("🧠 Powered by ASI:One AI reasoning and MeTTa Knowledge Graph")
    print("\n🌐 REST API Endpoints:")
    print("POST http://localhost:8080/brand/research")
    print("Body: {\"brand_name\": \"Tesla\"}")
    print("\nPOST http://localhost:8080/brand/query")
    print("Body: {\"query\": \"Tell me about Apple's sentiment analysis\"}")
    print("\nPOST http://localhost:8080/brand/data")
    print("Body: {\"brand_name\": \"Nike\", \"data_type\": \"reviews\", \"sentiment\": \"negative\"}")
    print("\nPOST http://localhost:8080/brand/summary")
    print("Body: {\"brand_name\": \"Samsung\"}")
    print("\nGET http://localhost:8080/brands/all")
    print("\n🧪 Test queries:")
    print("- 'What brands do you have data for?'")
    print("- 'Tell me about Tesla's sentiment analysis'")
    print("- 'How do Apple's reviews compare to Samsung?'")
    print("- 'What are the negative reviews for Nike?'")
    print("\nPress CTRL+C to stop the agent")
    
    try:
        agent.run()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Brand Research MeTTa Agent...")
        print("✅ Agent stopped.")
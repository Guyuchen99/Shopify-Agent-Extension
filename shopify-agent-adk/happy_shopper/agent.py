import json
from google.adk.agents import Agent, SequentialAgent
from google.adk.tools import google_search
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from pydantic import BaseModel, Field
from typing import List, Any, Dict, Optional


from happy_shopper.prompt import (
    SearchAgentInstruction,
    ShopifyAgentInstruction,
    SuggestionAgentInstruction,
)


class SuggestionAgentOutput(BaseModel):
    message: str = Field(description="Your response to the user")
    suggestion: List[str] = Field(
        description="User's possible follow-up reply based on your response"
    )


def after_tool_callback(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext, tool_response: Dict
) -> Optional[Dict]:
    """
    Intercepts tool responses after execution.

    If the MCP 'search_shop_catalog' tool is called, cache its response in the session state under 'cached_shop_catalog_response'.
    """
    if tool.name == "search_shop_catalog":
        search_shop_catalog_response = tool_response.content[0].text
        parsed_response = json.loads(search_shop_catalog_response)

        new_products = parsed_response.get("products", [])
        cached_products = tool_context.state.get("cached_products", [])

        combined_products = cached_products + new_products

        tool_context.state["cached_products"] = combined_products


def get_cached_products(product_name: str, tool_context: ToolContext) -> dict:
    """
    Retrieve products from the cached product list that match a given product name.

    This function checks whether relevant products have already been fetched from the Shopify catalog in the current session before making a new `search_shop_catalog` tool call.

    Args:
        product_name (str): The product name or keyword to search for
    """
    cached_products = tool_context.state.get("cached_products", [])

    if not cached_products:
        return {
            "status": "success",
            "product_count": 0,
            "products": [],
        }

    product_name_lowercase = product_name.lower().strip()
    relevant_products = []

    for product in cached_products:
        product_title_lowercase = product.get("title", "").lower().strip()

        if product_name_lowercase in product_title_lowercase:
            relevant_products.append(product)

    return {
        "status": "success",
        "product_count": len(relevant_products),
        "products": relevant_products,
    }


search_agent = Agent(
    name="search_agent",
    model="gemini-2.5-flash",
    description="Perform Google Search for external information retrieval",
    instruction=SearchAgentInstruction,
    tools=[google_search],
)

shopify_agent = Agent(
    name="shopify_agent",
    model="gemini-2.5-flash",
    description="A personalized shopping agent for YC Graphixs's store",
    instruction=ShopifyAgentInstruction,
    tools=[
        AgentTool(agent=search_agent),
        McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://ycgraphixs-dev.myshopify.com/api/mcp",
            ),
            tool_filter=["search_shop_catalog", "get_cart", "update_cart"],
            errlog=None,
        ),
        get_cached_products,
    ],
    output_key="agent_output",
    after_tool_callback=after_tool_callback,
)

suggestion_agent = Agent(
    name="suggestion_agent",
    model="gemini-2.5-flash",
    description="Formats agent output into concise output with prompt suggestions",
    instruction=SuggestionAgentInstruction,
    output_schema=SuggestionAgentOutput,
    include_contents="none",
)

root_agent = SequentialAgent(
    name="root_agent",
    description="Orchestrates the shopify and suggestion agents for YC Graphixs's store",
    sub_agents=[shopify_agent, suggestion_agent],
)

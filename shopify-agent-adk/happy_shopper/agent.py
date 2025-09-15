from google.adk.agents import Agent, SequentialAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from pydantic import BaseModel, Field
from typing import List

from happy_shopper.prompt import ShopifyAgentInstruction, SuggestionAgentInstruction


class SuggestionAgentOutput(BaseModel):
    message: str = Field(description="The main response from the agent")
    suggestion: List[str] = Field(
        description="User's possible follow-up reply based on the conversation context"
    )


shopify_agent = Agent(
    name="shopify_agent",
    model="gemini-2.5-flash",
    description="A personalized shopping agent for YC Graphixs's store",
    instruction=ShopifyAgentInstruction,
    tools=[
        MCPToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://ycgraphixs-testing.myshopify.com/api/mcp",
            ),
            tool_filter=["search_shop_catalog", "get_cart", "update_cart"],
            errlog=None,
        )
    ],
    output_key="shopify_agent_output",
)

suggestion_agent = Agent(
    name="suggestion_agent",
    model="gemini-2.5-flash",
    description="Formats shopify agent results into final user-friendly output with prompt suggestions",
    instruction=SuggestionAgentInstruction,
    output_schema=SuggestionAgentOutput,
    include_contents="none",
)

root_agent = SequentialAgent(
    name="root_agent",
    description="Orchestrates the shopify and suggestion agents for YC Graphixs's store",
    sub_agents=[shopify_agent, suggestion_agent],
)

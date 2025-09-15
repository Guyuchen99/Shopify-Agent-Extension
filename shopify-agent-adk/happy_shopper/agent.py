from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from pydantic import BaseModel, Field
from typing import List

from happy_shopper.prompt import RootAgentInstruction


class RootAgentOutput(BaseModel):
    message: str = Field(description="The main response from the agent")
    suggestion: List[str] = Field(
        description="User's possible follow-up replies based on the conversation context"
    )


root_agent = Agent(
    name="root_agent",
    model="gemini-2.5-flash",
    description="A personalized shopping agent for YC Graphixs's Store",
    instruction=RootAgentInstruction,
    output_schema=RootAgentOutput,
    tools=[
        MCPToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://ycgraphixs-testing.myshopify.com/api/mcp",
            ),
            tool_filter=["search_shop_catalog", "get_cart", "update_cart"],
            errlog=None,
        )
    ],
)

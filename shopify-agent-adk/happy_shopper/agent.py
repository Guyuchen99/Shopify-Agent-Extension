from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

from happy_shopper.prompt import RootAgentInstruction

root_agent = Agent(
    name="root_agent",
    model="gemini-2.5-flash",
    description="A personalized shopping agent for YC Graphixs's Store",
    instruction=RootAgentInstruction,
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

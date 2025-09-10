from google.adk.agents import Agent
from shopify_agent.prompt import ROOT_AGENT_INSTRUCTION
from pydantic import BaseModel, Field
from typing import List


class ShopifyAgentOutput(BaseModel):
    message: str = Field(description="The main response from the agent")
    suggestion: List[str] = Field(
        description="1-3 suggested prompts based on the conversation context"
    )


root_agent = Agent(
    name="shopify_agent",
    model="gemini-2.5-flash",
    description="A personalized shopping agent for Mark's Shopify Store",
    instruction=ROOT_AGENT_INSTRUCTION,
    output_schema=ShopifyAgentOutput,
    output_key="shopify_agent_output",
)

from google.adk.agents import Agent
from pydantic import BaseModel, Field
from typing import List

from happy_advisor.prompt import (
    ShopifyAdvisorInstruction,
)


class Output(BaseModel):
    message: str = Field(..., description="Your response to the user")
    suggestions: List[str] = Field(
        ...,
        description="User's possible follow-up reply based on your response",
        min_length=2,
    )


root_agent = Agent(
    name="shopify_advisor",
    model="gemini-2.5-flash",
    description="A personalized advising agent for YC Graphixs's store",
    instruction=ShopifyAdvisorInstruction,
    output_schema=Output,
)

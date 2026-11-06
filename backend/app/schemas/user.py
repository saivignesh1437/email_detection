"""
User Pydantic Schemas
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    name: str
    email: str

class UserResponse(UserBase):
    user_id: int
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

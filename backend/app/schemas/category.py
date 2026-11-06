"""
Category Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    category_name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    category_id: int

    model_config = ConfigDict(from_attributes=True)

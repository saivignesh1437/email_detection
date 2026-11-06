"""
Categories Router
Endpoints for managing email classification categories.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.category import CategoryResponse, CategoryCreate
from backend.app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Retrieve all email categories."""
    return db.query(Category).order_by(Category.category_id.asc()).all()

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Category).filter(Category.category_name.ilike(cat.category_name.strip())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists.")
    
    new_cat = Category(category_name=cat.category_name.strip())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

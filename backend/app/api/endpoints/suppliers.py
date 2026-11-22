from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db import models
from app.schemas.rfq import SupplierCreate, SupplierOut

router = APIRouter()

@router.get("", response_model=List[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    """Retrieves all registered and verified logistics suppliers."""
    return db.query(models.Supplier).order_by(models.Supplier.name.asc()).all()

@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(supplier_in: SupplierCreate, db: Session = Depends(get_db)):
    """Registers a new supplier for RFQ participation."""
    existing = db.query(models.Supplier).filter(models.Supplier.supplier_code == supplier_in.supplier_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier code already exists.")
    
    supplier = models.Supplier(**supplier_in.dict())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

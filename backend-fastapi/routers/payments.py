"""Payments router"""
from fastapi import APIRouter

router = APIRouter()

@router.post("/process")
def process_payment():
    return {"success": True}

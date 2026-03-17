import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import motor.motor_asyncio
from bson.objectid import ObjectId
import bcrypt
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# MongoDB client (initialized lazily)
_mongo_client = None
_db = None


async def get_db():
    """Get MongoDB database instance."""
    global _mongo_client, _db

    if _db is None:
        if not settings.MONGO_CONNECTION_STRING:
            raise HTTPException(
                status_code=500,
                detail="MongoDB connection string not configured"
            )
        _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_CONNECTION_STRING)
        _db = _mongo_client["kes_db"]  # Specify database name

    return _db


# Pydantic models
class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    picture: str | None = None
    sub: str  # Google user ID


class ManualLoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    user_id: str | None = None
    message: str


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


@router.post("/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    Save or update user from Google OAuth login.

    - Upserts user by email
    - Stores Google-provided data (name, picture, sub)
    - No password stored for Google users
    """
    try:
        db = await get_db()
        users = db["users"]

        now = datetime.utcnow()
        user_data = {
            "email": request.email,
            "name": request.name,
            "auth_provider": "google",
            "google_sub": request.sub,
            "picture": request.picture,
            "updated_at": now,
        }

        # Upsert: update if exists, insert if not
        await users.update_one(
            {"email": request.email},
            {
                "$set": user_data,
                "$setOnInsert": {"created_at": now}
            },
            upsert=True
        )

        # Get the user to return the ID
        user = await users.find_one({"email": request.email})
        user_id = str(user["_id"]) if user else None

        logger.info(f"✅ Google auth successful for {request.email}")
        return AuthResponse(
            success=True,
            user_id=user_id,
            message=f"User {request.email} authenticated successfully"
        )

    except Exception as e:
        logger.error(f"❌ Google auth failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Google authentication failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def manual_login(request: ManualLoginRequest):
    """
    Save or update user from email/password login.

    - Upserts user by email
    - Hashes and stores password
    - auth_provider set to 'email'
    """
    try:
        db = await get_db()
        users = db["users"]

        # Hash the password
        password_hash = hash_password(request.password)

        now = datetime.utcnow()
        user_data = {
            "email": request.email,
            "name": request.email.split("@")[0],  # Default name from email
            "auth_provider": "email",
            "password_hash": password_hash,
            "updated_at": now,
        }

        # Upsert: update if exists, insert if not
        await users.update_one(
            {"email": request.email},
            {
                "$set": user_data,
                "$setOnInsert": {"created_at": now}
            },
            upsert=True
        )

        # Get the user to return the ID
        user = await users.find_one({"email": request.email})
        user_id = str(user["_id"]) if user else None

        logger.info(f"✅ Manual login successful for {request.email}")
        return AuthResponse(
            success=True,
            user_id=user_id,
            message=f"User {request.email} authenticated successfully"
        )

    except Exception as e:
        logger.error(f"❌ Manual login failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


class UpgradeSubscriptionRequest(BaseModel):
    email: str
    payment_id: str


class UpgradeSubscriptionResponse(BaseModel):
    success: bool
    message: str
    subscription_status: str | None = None


@router.post("/upgrade-subscription", response_model=UpgradeSubscriptionResponse)
async def upgrade_subscription(request: UpgradeSubscriptionRequest):
    """
    Upgrade user subscription to premium after successful payment.

    Updates user's subscription_status from 'free' to 'paid'.
    """
    try:
        db = await get_db()
        users = db["users"]

        # Update user subscription status
        result = await users.find_one_and_update(
            {"email": request.email},
            {
                "$set": {
                    "subscription_status": "paid",
                    "payment_id": request.payment_id,
                    "subscription_updated_at": datetime.utcnow(),
                }
            },
            return_document=True
        )

        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"User {request.email} not found"
            )

        logger.info(f"✅ Subscription upgraded for {request.email} (Payment ID: {request.payment_id})")
        return UpgradeSubscriptionResponse(
            success=True,
            message=f"Subscription upgraded successfully for {request.email}",
            subscription_status="paid"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Subscription upgrade failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Subscription upgrade failed: {str(e)}"
        )


@router.get("/health")
async def auth_health():
    """Health check for auth service."""
    try:
        db = await get_db()
        # Try to ping MongoDB
        await db.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.warning(f"⚠️  Auth health check failed: {e}")
        return {"status": "error", "database": "disconnected", "error": str(e)}

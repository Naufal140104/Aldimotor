from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date, time
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict


# ----------------- Setup -----------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@aldimotor.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
WORKSHOP_WHATSAPP = os.environ.get("WORKSHOP_WHATSAPP", "6281234567890")
WORKSHOP_NAME = os.environ.get("WORKSHOP_NAME", "ALDI MOTOR")

JWT_ALG = "HS256"
TZ = ZoneInfo("Asia/Makassar")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ALDI MOTOR API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ----------------- Helpers -----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def normalize_wa(phone: str) -> str:
    p = "".join(c for c in phone if c.isdigit())
    if p.startswith("0"):
        p = "62" + p[1:]
    elif p.startswith("62"):
        pass
    elif p.startswith("8"):
        p = "62" + p
    return p


def today_local() -> date:
    return datetime.now(TZ).date()


# ----------------- Models -----------------
class LoginReq(BaseModel):
    email: str
    password: str

class MechanicIn(BaseModel):
    name: str
    status: Optional[str] = "active"  # active | inactive

class MechanicUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class ServiceUpdate(BaseModel):
    duration_hours: Optional[float] = None
    description: Optional[str] = None

class HolidayIn(BaseModel):
    date: str  # YYYY-MM-DD
    description: str

class BusinessHoursUpdate(BaseModel):
    opening_time: str  # "08:00"
    closing_time: str  # "16:00"

class BookingCreate(BaseModel):
    customer_name: str = Field(min_length=3)
    whatsapp: str
    plate_number: str
    complaint: str
    service_id: str
    booking_date: str  # YYYY-MM-DD
    start_time: str  # "HH:MM"

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    duration_hours: Optional[float] = None
    mechanic_id: Optional[str] = None


# ----------------- Seed / Init -----------------
async def seed_data():
    # Admin user
    if not await db.users.find_one({"email": ADMIN_EMAIL}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        existing = await db.users.find_one({"email": ADMIN_EMAIL})
        if not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
            await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})

    # Services
    default_services = [
        {"code": "ringan", "name": "Servis Ringan", "description": "Servis berkala dan pemeriksaan ringan kendaraan.", "duration_hours": 1.0},
        {"code": "berat", "name": "Servis Berat", "description": "Penanganan kerusakan atau servis dengan tingkat pengerjaan lebih kompleks.", "duration_hours": 2.0},
        {"code": "overhaul", "name": "Overhaul", "description": "Pengerjaan pembongkaran dan pemeriksaan komponen mesin secara menyeluruh.", "duration_hours": 4.0},
        {"code": "request", "name": "Request Customer", "description": "Customer dapat menjelaskan kebutuhan atau pekerjaan khusus.", "duration_hours": 1.0},
    ]
    for svc in default_services:
        exists = await db.services.find_one({"code": svc["code"]})
        if not exists:
            await db.services.insert_one({
                "id": str(uuid.uuid4()),
                **svc,
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Mechanics
    count = await db.mechanics.count_documents({})
    if count == 0:
        for i in range(1, 6):
            await db.mechanics.insert_one({
                "id": str(uuid.uuid4()),
                "name": f"Mekanik {i}",
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Business hours
    if not await db.settings.find_one({"key": "business_hours"}):
        await db.settings.insert_one({
            "key": "business_hours",
            "opening_time": "08:00",
            "closing_time": "16:00",
            "closed_days": [6],  # Sunday (Python: Mon=0, Sun=6)
        })


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.bookings.create_index([("booking_date", 1), ("mechanic_id", 1)])
    await seed_data()
    logger.info("ALDI MOTOR API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ----------------- Auth -----------------
@api.post("/auth/login")
async def login(body: LoginReq, response: Response):
    user = await db.users.find_one({"email": body.email.lower().strip()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/",
    )
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ----------------- Public: services, mechanics, business hours, holidays -----------------
@api.get("/services")
async def list_services():
    docs = await db.services.find({"status": "active"}, {"_id": 0}).to_list(100)
    order = {"ringan": 1, "berat": 2, "overhaul": 3, "request": 4}
    docs.sort(key=lambda d: order.get(d.get("code"), 99))
    return docs


@api.get("/mechanics")
async def list_mechanics():
    docs = await db.mechanics.find({}, {"_id": 0}).to_list(100)
    return docs


@api.get("/business-hours")
async def get_business_hours():
    doc = await db.settings.find_one({"key": "business_hours"}, {"_id": 0})
    today = today_local()
    return {
        **(doc or {}),
        "today": today.isoformat(),
        "min_date": (today + timedelta(days=1)).isoformat(),
        "max_date": (today + timedelta(days=7)).isoformat(),
    }


@api.get("/holidays")
async def list_holidays():
    docs = await db.holidays.find({}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d.get("date", ""))
    return docs


# ----------------- Availability -----------------
def parse_hhmm(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


async def get_active_mechanics() -> List[dict]:
    return await db.mechanics.find({"status": "active"}, {"_id": 0}).to_list(100)


async def get_bookings_for_date(booking_date: str) -> List[dict]:
    return await db.bookings.find(
        {"booking_date": booking_date, "status": {"$ne": "Dibatalkan"}},
        {"_id": 0},
    ).to_list(500)


def hour_range(open_t: str, close_t: str) -> List[str]:
    oh = int(open_t.split(":")[0])
    ch = int(close_t.split(":")[0])
    return [f"{h:02d}:00" for h in range(oh, ch)]


def slot_overlaps(slot_start: str, slot_end: str, existing_start: str, existing_end: str) -> bool:
    return not (slot_end <= existing_start or slot_start >= existing_end)


def add_hours_str(hhmm: str, hours: float) -> str:
    h, m = map(int, hhmm.split(":"))
    total_min = h * 60 + m + int(hours * 60)
    return f"{total_min // 60:02d}:{total_min % 60:02d}"


@api.get("/availability")
async def availability(date_str: str = Query(..., alias="date"), service_id: str = Query(...)):
    # Validate date
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Format tanggal tidak valid")

    today = today_local()
    max_date = today + timedelta(days=7)
    if d <= today:
        raise HTTPException(status_code=400, detail="Reservasi hanya dapat dilakukan mulai H+1")
    if d > max_date:
        raise HTTPException(status_code=400, detail="Reservasi maksimal 7 hari ke depan")

    bh = await db.settings.find_one({"key": "business_hours"}, {"_id": 0})
    open_t, close_t = bh["opening_time"], bh["closing_time"]
    closed_days = bh.get("closed_days", [6])
    if d.weekday() in closed_days:
        raise HTTPException(status_code=400, detail="Bengkel tutup pada hari tersebut")

    # Holiday
    holiday = await db.holidays.find_one({"date": date_str})
    if holiday:
        raise HTTPException(status_code=400, detail=f"Bengkel tutup: {holiday.get('description','Hari Libur')}")

    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Servis tidak ditemukan")
    duration = float(service["duration_hours"])

    mechanics = await get_active_mechanics()
    total_mechanics = len(mechanics)
    bookings = await get_bookings_for_date(date_str)

    slots = []
    close_hour = int(close_t.split(":")[0])
    for hhmm in hour_range(open_t, close_t):
        slot_start = hhmm
        slot_end = add_hours_str(hhmm, duration)
        end_hour = int(slot_end.split(":")[0])
        # if servis melebihi jam tutup, tandai penuh (tidak bisa dipilih)
        if end_hour > close_hour or slot_end > close_t:
            slots.append({"time": hhmm, "available": 0, "total": total_mechanics, "status": "closed"})
            continue

        # count busy mechanics
        busy = set()
        for b in bookings:
            if slot_overlaps(slot_start, slot_end, b["start_time"], b["end_time"]):
                busy.add(b["mechanic_id"])
        available = max(0, total_mechanics - len(busy))
        if available == 0:
            status = "full"
        elif available <= max(1, total_mechanics // 3):
            status = "almost"
        else:
            status = "available"
        slots.append({"time": hhmm, "available": available, "total": total_mechanics, "status": status})

    return {"date": date_str, "service_id": service_id, "duration_hours": duration, "slots": slots}


# ----------------- Bookings -----------------
async def next_booking_number(booking_date: str) -> str:
    date_compact = booking_date.replace("-", "")
    prefix = f"RSV-{date_compact}-"
    count = await db.bookings.count_documents({"booking_number": {"$regex": f"^{prefix}"}})
    return f"{prefix}{count + 1:04d}"


@api.post("/bookings")
async def create_booking(body: BookingCreate):
    # Validate date
    try:
        d = datetime.strptime(body.booking_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Format tanggal tidak valid")

    today = today_local()
    if d <= today:
        raise HTTPException(status_code=400, detail="Reservasi hanya untuk H+1")
    if d > today + timedelta(days=7):
        raise HTTPException(status_code=400, detail="Reservasi maksimal 7 hari ke depan")

    bh = await db.settings.find_one({"key": "business_hours"}, {"_id": 0})
    closed_days = bh.get("closed_days", [6])
    if d.weekday() in closed_days:
        raise HTTPException(status_code=400, detail="Bengkel tutup pada hari tersebut")

    if await db.holidays.find_one({"date": body.booking_date}):
        raise HTTPException(status_code=400, detail="Bengkel tutup pada tanggal tersebut")

    service = await db.services.find_one({"id": body.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Servis tidak ditemukan")
    duration = float(service["duration_hours"])
    start = body.start_time
    end = add_hours_str(start, duration)
    if end > bh["closing_time"]:
        raise HTTPException(status_code=400, detail="Servis melewati jam tutup")
    if start < bh["opening_time"]:
        raise HTTPException(status_code=400, detail="Servis dimulai sebelum jam buka")

    mechanics = await get_active_mechanics()
    if not mechanics:
        raise HTTPException(status_code=400, detail="Tidak ada mekanik aktif")

    bookings = await get_bookings_for_date(body.booking_date)
    busy_ids = set()
    for b in bookings:
        if slot_overlaps(start, end, b["start_time"], b["end_time"]):
            busy_ids.add(b["mechanic_id"])

    available_mech = next((m for m in mechanics if m["id"] not in busy_ids), None)
    if not available_mech:
        raise HTTPException(status_code=409, detail="Maaf, slot tersebut baru saja penuh. Silakan pilih jam lainnya.")

    # Create customer record (or reuse)
    wa = normalize_wa(body.whatsapp)
    plate = body.plate_number.upper().strip()
    customer_id = str(uuid.uuid4())
    await db.customers.insert_one({
        "id": customer_id, "name": body.customer_name.strip(),
        "whatsapp": wa, "plate_number": plate,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    booking_number = await next_booking_number(body.booking_date)
    booking = {
        "id": str(uuid.uuid4()),
        "booking_number": booking_number,
        "customer_id": customer_id,
        "customer_name": body.customer_name.strip(),
        "whatsapp": wa,
        "plate_number": plate,
        "complaint": body.complaint.strip(),
        "service_id": service["id"],
        "service_name": service["name"],
        "service_code": service.get("code"),
        "duration_hours": duration,
        "mechanic_id": available_mech["id"],
        "mechanic_name": available_mech["name"],
        "booking_date": body.booking_date,
        "start_time": start,
        "end_time": end,
        "status": "Menunggu Konfirmasi",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking.copy())
    booking.pop("_id", None)

    # WA link (customer receives confirmation via their own WA if they click)
    customer_msg = (
        f"Halo {booking['customer_name']},%0A%0A"
        f"Reservasi servis motor Anda di *{WORKSHOP_NAME}* berhasil dibuat.%0A%0A"
        f"Nomor Reservasi: *{booking['booking_number']}*%0A"
        f"Jenis Servis: {booking['service_name']}%0A"
        f"Tanggal: {booking['booking_date']}%0A"
        f"Jam: {booking['start_time']}%0A"
        f"Nomor Polisi: {booking['plate_number']}%0A"
        f"Keluhan: {booking['complaint']}%0A"
        f"Status: {booking['status']}%0A%0A"
        f"Mohon datang sesuai jadwal reservasi. Terima kasih."
    )
    admin_msg = (
        f"*Reservasi Baru!*%0A%0A"
        f"Nomor: {booking['booking_number']}%0A"
        f"Customer: {booking['customer_name']}%0A"
        f"WhatsApp: {booking['whatsapp']}%0A"
        f"Nomor Polisi: {booking['plate_number']}%0A"
        f"Jenis Servis: {booking['service_name']}%0A"
        f"Tanggal: {booking['booking_date']}%0A"
        f"Jam: {booking['start_time']}%0A"
        f"Mekanik: {booking['mechanic_name']}%0A"
        f"Keluhan: {booking['complaint']}"
    )

    return {
        "booking": booking,
        "wa_customer_link": f"https://wa.me/{wa}?text={customer_msg}",
        "wa_admin_link": f"https://wa.me/{WORKSHOP_WHATSAPP}?text={admin_msg}",
    }


# ----------------- Admin -----------------
@api.get("/admin/bookings")
async def admin_bookings(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
):
    q = {}
    if date_from or date_to:
        q["booking_date"] = {}
        if date_from:
            q["booking_date"]["$gte"] = date_from
        if date_to:
            q["booking_date"]["$lte"] = date_to
    if status:
        q["status"] = status
    docs = await db.bookings.find(q, {"_id": 0}).to_list(2000)
    docs.sort(key=lambda x: (x["booking_date"], x["start_time"]))
    return docs


@api.patch("/admin/bookings/{booking_id}")
async def update_booking(booking_id: str, body: BookingUpdate, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Reservasi tidak ditemukan")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status:
        allowed = ["Menunggu Konfirmasi", "Dikonfirmasi", "Sedang Diproses", "Selesai", "Dibatalkan"]
        if body.status not in allowed:
            raise HTTPException(400, "Status tidak valid")
        updates["status"] = body.status
    if body.duration_hours is not None:
        updates["duration_hours"] = float(body.duration_hours)
        updates["end_time"] = add_hours_str(b["start_time"], float(body.duration_hours))
    if body.mechanic_id:
        m = await db.mechanics.find_one({"id": body.mechanic_id}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Mekanik tidak ditemukan")
        updates["mechanic_id"] = m["id"]
        updates["mechanic_name"] = m["name"]
    await db.bookings.update_one({"id": booking_id}, {"$set": updates})
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    today = today_local().isoformat()
    tomorrow = (today_local() + timedelta(days=1)).isoformat()
    total = await db.bookings.count_documents({})
    today_count = await db.bookings.count_documents({"booking_date": today})
    tomorrow_count = await db.bookings.count_documents({"booking_date": tomorrow})
    by_status = {}
    for s in ["Menunggu Konfirmasi", "Dikonfirmasi", "Sedang Diproses", "Selesai", "Dibatalkan"]:
        by_status[s] = await db.bookings.count_documents({"status": s})
    return {
        "total": total,
        "today": today_count,
        "tomorrow": tomorrow_count,
        "by_status": by_status,
    }


@api.post("/admin/mechanics")
async def create_mechanic(body: MechanicIn, user: dict = Depends(get_current_user)):
    m = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "status": body.status or "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mechanics.insert_one(m.copy())
    m.pop("_id", None)
    return m


@api.patch("/admin/mechanics/{mid}")
async def update_mechanic(mid: str, body: MechanicUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Tidak ada perubahan")
    r = await db.mechanics.update_one({"id": mid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "Mekanik tidak ditemukan")
    return await db.mechanics.find_one({"id": mid}, {"_id": 0})


@api.delete("/admin/mechanics/{mid}")
async def delete_mechanic(mid: str, user: dict = Depends(get_current_user)):
    r = await db.mechanics.delete_one({"id": mid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Mekanik tidak ditemukan")
    return {"ok": True}


@api.patch("/admin/services/{sid}")
async def update_service(sid: str, body: ServiceUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Tidak ada perubahan")
    r = await db.services.update_one({"id": sid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "Servis tidak ditemukan")
    return await db.services.find_one({"id": sid}, {"_id": 0})


@api.put("/admin/business-hours")
async def update_business_hours(body: BusinessHoursUpdate, user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"key": "business_hours"},
        {"$set": {"opening_time": body.opening_time, "closing_time": body.closing_time}},
        upsert=True,
    )
    return await db.settings.find_one({"key": "business_hours"}, {"_id": 0})


@api.post("/admin/holidays")
async def add_holiday(body: HolidayIn, user: dict = Depends(get_current_user)):
    h = {"id": str(uuid.uuid4()), "date": body.date, "description": body.description}
    await db.holidays.insert_one(h.copy())
    h.pop("_id", None)
    return h


@api.delete("/admin/holidays/{hid}")
async def delete_holiday(hid: str, user: dict = Depends(get_current_user)):
    r = await db.holidays.delete_one({"id": hid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Holiday tidak ditemukan")
    return {"ok": True}


# ----------------- Root -----------------
@api.get("/")
async def root():
    return {"message": "ALDI MOTOR API", "workshop": WORKSHOP_NAME}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

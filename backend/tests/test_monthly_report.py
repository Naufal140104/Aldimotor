"""Backend tests for monthly report + service/booking price features."""
import os
import pytest
import requests

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    v = line.split("=", 1)[1].strip()
                    break
    return v.rstrip("/")

BASE_URL = _load_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@aldimotor.com"
ADMIN_PASS = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- services price ----------------
class TestServicePrice:
    def test_services_include_price(self):
        r = requests.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        for s in data:
            assert "price" in s, f"service missing price: {s}"
        codes = {s["code"]: s for s in data}
        # seeded prices
        assert codes["ringan"]["price"] == 75000
        assert codes["berat"]["price"] == 200000
        assert codes["overhaul"]["price"] == 500000
        assert codes["request"]["price"] == 0

    def test_patch_service_price(self, auth_headers):
        # find ringan
        r = requests.get(f"{API}/services")
        svc = next(s for s in r.json() if s["code"] == "ringan")
        original = svc["price"]
        try:
            r2 = requests.patch(f"{API}/admin/services/{svc['id']}", json={"price": 90000}, headers=auth_headers)
            assert r2.status_code == 200, r2.text
            # verify via GET
            r3 = requests.get(f"{API}/services")
            new_svc = next(s for s in r3.json() if s["code"] == "ringan")
            assert new_svc["price"] == 90000
        finally:
            # restore
            requests.patch(f"{API}/admin/services/{svc['id']}", json={"price": original}, headers=auth_headers)

    def test_patch_service_requires_auth(self):
        r = requests.get(f"{API}/services")
        svc = r.json()[0]
        r2 = requests.patch(f"{API}/admin/services/{svc['id']}", json={"price": 12345})
        assert r2.status_code in (401, 403)


# ---------------- booking price inheritance & update ----------------
def _pick_date(auth_headers):
    """Pick a bookable date H+1..H+7 that's not Sunday. Server today = 2026-08-29 Sat."""
    # 2026-08-31 Mon, 2026-09-01 Tue, 2026-09-02 Wed, 2026-09-03 Thu, 2026-09-04 Fri, 2026-09-05 Sat
    return "2026-09-02"


def _find_free_slot(date, service_id):
    r = requests.get(f"{API}/availability", params={"date": date, "service_id": service_id})
    assert r.status_code == 200, r.text
    slots = r.json().get("slots", [])
    for s in slots:
        if s.get("available", 0) > 0:
            return s["time"]
    return None


class TestBookingPrice:
    def _create_booking(self, auth_headers, date, service_code="berat"):
        r = requests.get(f"{API}/services")
        svc = next(s for s in r.json() if s["code"] == service_code)
        start = _find_free_slot(date, svc["id"])
        assert start, f"No free slot on {date} for {service_code}"
        payload = {
            "customer_name": "TEST_Reporter",
            "whatsapp": "081234567890",
            "plate_number": "DD1234TX",
            "complaint": "TEST booking for report",
            "service_id": svc["id"],
            "booking_date": date,
            "start_time": start,
        }
        r2 = requests.post(f"{API}/bookings", json=payload)
        assert r2.status_code == 200, r2.text
        resp = r2.json()
        b = resp.get("booking", resp)
        return b, svc

    def test_booking_inherits_service_price(self, auth_headers):
        b, svc = self._create_booking(auth_headers, _pick_date(auth_headers), "berat")
        assert "price" in b
        assert float(b["price"]) == float(svc["price"])  # 200000

    def test_patch_booking_price(self, auth_headers):
        b, _ = self._create_booking(auth_headers, _pick_date(auth_headers), "berat")
        r = requests.patch(f"{API}/admin/bookings/{b['id']}", json={"price": 150000}, headers=auth_headers)
        assert r.status_code == 200, r.text
        # verify
        r2 = requests.get(f"{API}/admin/bookings", headers=auth_headers)
        assert r2.status_code == 200
        got = next((x for x in r2.json() if x["id"] == b["id"]), None)
        assert got and float(got["price"]) == 150000


# ---------------- monthly report JSON ----------------
class TestMonthlyReport:
    def test_report_auth_required(self):
        r = requests.get(f"{API}/admin/reports/monthly", params={"year": 2026, "month": 8})
        assert r.status_code in (401, 403)

    def test_report_invalid_month(self, auth_headers):
        r = requests.get(f"{API}/admin/reports/monthly", params={"year": 2026, "month": 13}, headers=auth_headers)
        assert r.status_code == 400

    def test_report_structure(self, auth_headers):
        r = requests.get(f"{API}/admin/reports/monthly", params={"year": 2026, "month": 8}, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["period"]["label"] == "Agustus 2026"
        assert d["period"]["year"] == 2026 and d["period"]["month"] == 8
        assert d["period"]["from"] == "2026-08-01" and d["period"]["to"] == "2026-08-31"
        for k in ("total", "revenue_total", "revenue_completed", "by_status", "by_service", "bookings"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["by_status"], dict)
        assert isinstance(d["by_service"], dict)
        assert isinstance(d["bookings"], list)
        # note: request says "all 5 statuses as keys even if count=0"
        expected = {"Menunggu Konfirmasi", "Dikonfirmasi", "Sedang Diproses", "Selesai", "Dibatalkan"}
        missing = expected - set(d["by_status"].keys())
        if missing:
            pytest.fail(f"by_status missing keys (should include all 5 statuses): {missing}")


# ---------------- monthly report PDF ----------------
class TestMonthlyReportPDF:
    def test_pdf_no_auth_401(self):
        r = requests.get(f"{API}/admin/reports/monthly.pdf", params={"year": 2026, "month": 8})
        assert r.status_code == 401

    def test_pdf_bearer_header(self, auth_headers):
        r = requests.get(f"{API}/admin/reports/monthly.pdf", params={"year": 2026, "month": 8}, headers=auth_headers)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-"

    def test_pdf_query_token(self, token):
        r = requests.get(f"{API}/admin/reports/monthly.pdf", params={"year": 2026, "month": 8, "token": token})
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-"


# ---------------- Revenue calc integration ----------------
class TestRevenueCalculation:
    def test_revenue_completed_vs_total(self, auth_headers):
        """Create 2 bookings priced 100000, mark 1 Selesai, 1 Dibatalkan."""
        # Use a distinct date to isolate; still needs H+1..H+7
        date = "2026-09-03"  # Thursday
        r = requests.get(f"{API}/services")
        svc = next(s for s in r.json() if s["code"] == "berat")
        created = []
        for i in range(2):
            start = _find_free_slot(date, svc["id"])
            assert start
            payload = {
                "customer_name": f"TEST_Rev{i}",
                "whatsapp": "081234567890",
                "plate_number": f"DD999{i}RV",
                "complaint": "revenue test",
                "service_id": svc["id"],
                "booking_date": date,
                "start_time": start,
            }
            r2 = requests.post(f"{API}/bookings", json=payload)
            assert r2.status_code == 200, r2.text
            resp = r2.json()
            b = resp.get("booking", resp)
            # set price to 100000
            requests.patch(f"{API}/admin/bookings/{b['id']}", json={"price": 100000}, headers=auth_headers)
            created.append(b)

        # progress statuses
        # Selesai requires progression: Menunggu -> Dikonfirmasi -> Sedang Diproses -> Selesai
        for s in ["Dikonfirmasi", "Sedang Diproses", "Selesai"]:
            r = requests.patch(f"{API}/admin/bookings/{created[0]['id']}", json={"status": s}, headers=auth_headers)
            assert r.status_code == 200, r.text
        # cancel the other
        r = requests.patch(f"{API}/admin/bookings/{created[1]['id']}", json={"status": "Dibatalkan"}, headers=auth_headers)
        assert r.status_code == 200, r.text

        # Fetch report for September 2026
        r = requests.get(f"{API}/admin/reports/monthly", params={"year": 2026, "month": 9}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        # Assertions: within Sept 2026, revenue_completed should include these 100000, revenue_total should exclude cancelled
        # We can't assume isolation (previous test bookings on 09-02 may add), so verify contribution.
        # Just verify: our two are present with correct statuses & prices.
        my = [b for b in d["bookings"] if b["id"] in (created[0]["id"], created[1]["id"])]
        assert len(my) == 2
        by_id = {b["id"]: b for b in my}
        assert by_id[created[0]["id"]]["status"] == "Selesai"
        assert by_id[created[0]["id"]]["price"] == 100000
        assert by_id[created[1]["id"]]["status"] == "Dibatalkan"
        assert by_id[created[1]["id"]]["price"] == 100000
        # And revenue_total in September must exclude Dibatalkan
        # Weak invariant: revenue_completed >= 100000 (our Selesai contributes)
        assert d["revenue_completed"] >= 100000
        # revenue_total should NOT include the Dibatalkan 100000 → but includes other non-cancelled
        # So we compute expected minimum contribution excluding cancelled = revenue_completed_contrib
        # Verify: sum of prices of non-cancelled bookings equals revenue_total
        computed_total = sum(float(b.get("price", 0) or 0) for b in d["bookings"] if b["status"] != "Dibatalkan")
        computed_completed = sum(float(b.get("price", 0) or 0) for b in d["bookings"] if b["status"] == "Selesai")
        assert d["revenue_total"] == computed_total
        assert d["revenue_completed"] == computed_completed

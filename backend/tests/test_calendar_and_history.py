"""
Tests for new features:
- GET /api/customer/history (public, privacy-safe)
- GET /api/admin/calendar/day (auth)
- GET /api/admin/calendar/week (auth)
- GET /api/admin/bookings?plate= (auth)
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(api):
    r = api.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@aldimotor.com", "password": "admin123"},
    )
    assert r.status_code == 200, r.text
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Customer history ----------
class TestCustomerHistory:
    def test_history_with_matching_plate(self, api):
        r = api.get(f"{BASE_URL}/api/customer/history", params={"plate": "DD1234TX"})
        assert r.status_code == 200
        data = r.json()
        assert data["plate_number"] == "DD1234TX"
        assert isinstance(data["count"], int)
        assert isinstance(data["recent"], list)
        assert len(data["recent"]) <= 5
        # Privacy: no whatsapp/customer_name in recent items
        for item in data["recent"]:
            assert "whatsapp" not in item
            assert "customer_name" not in item
            # Required fields
            for k in ("booking_number", "booking_date", "start_time",
                      "service_name", "mechanic_name", "status"):
                assert k in item, f"Missing {k} in {item}"

    def test_history_case_insensitive(self, api):
        r = api.get(f"{BASE_URL}/api/customer/history", params={"plate": "dd1234tx"})
        assert r.status_code == 200
        assert r.json()["plate_number"] == "DD1234TX"

    def test_history_no_match(self, api):
        r = api.get(f"{BASE_URL}/api/customer/history", params={"plate": "ZZ9999ZZ"})
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 0
        assert data["recent"] == []

    def test_history_min_length_validation(self, api):
        r = api.get(f"{BASE_URL}/api/customer/history", params={"plate": "AB"})
        # min_length=3 → 422
        assert r.status_code == 422


# ---------- Calendar day ----------
class TestCalendarDay:
    def test_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/admin/calendar/day", params={"date": "2026-08-25"})
        assert r.status_code == 401

    def test_invalid_date(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/calendar/day",
                    params={"date": "not-a-date"}, headers=auth_headers)
        assert r.status_code == 400

    def test_day_structure(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/calendar/day",
                    params={"date": "2026-08-25"}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == "2026-08-25"
        assert isinstance(data["hours"], list) and len(data["hours"]) > 0
        assert isinstance(data["mechanics"], list)
        for m in data["mechanics"]:
            for k in ("id", "name", "status", "cells"):
                assert k in m
            # cells len + spans should account for all hours
            total = sum(c["span"] if c["type"] == "booking" else 1 for c in m["cells"])
            assert total == len(data["hours"]), (
                f"Cell coverage mismatch for {m['name']}: {total} vs hours {len(data['hours'])}"
            )
            for c in m["cells"]:
                assert c["type"] in ("booking", "covered", "empty")
                if c["type"] == "booking":
                    assert "booking" in c
                    assert c["span"] >= 1

    def test_servis_berat_span_on_sep2(self, api, auth_headers):
        """Sep 2 has Servis Berat 2h bookings at 08:00; verify span=2 and 09:00 hidden (colSpan handled)."""
        r = api.get(f"{BASE_URL}/api/admin/calendar/day",
                    params={"date": "2026-09-02"}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        found_span2 = False
        for m in data["mechanics"]:
            for c in m["cells"]:
                if c["type"] == "booking" and c["time"] == "08:00" and c["span"] == 2:
                    found_span2 = True
                    # 09:00 must NOT appear as a separate cell in same row
                    times = [x["time"] for x in m["cells"]]
                    # 09:00 might appear only if a separate booking exists there (unlikely). At minimum
                    # the cell at 08:00 has span=2, meaning we skip the next hour.
                    # Verify NO cell for this mechanic has time=09:00 (since it's spanned)
                    assert "09:00" not in times, f"09:00 should be covered by span, found in {times}"
        assert found_span2, "Expected at least one Servis Berat span=2 booking at 08:00 on 2026-09-02"


# ---------- Calendar week ----------
class TestCalendarWeek:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/calendar/week", params={"start": "2026-08-24"})
        assert r.status_code == 401

    def test_week_returns_7_days_with_sunday_closed(self, api, auth_headers):
        # 2026-08-24 is a Monday → Sunday is index 6 (2026-08-30)
        r = api.get(f"{BASE_URL}/api/admin/calendar/week",
                    params={"start": "2026-08-24"}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data["days"]) == 7
        for i, day in enumerate(data["days"]):
            for k in ("date", "bookings_count", "occupied_slots", "capacity", "is_closed"):
                assert k in day
        sunday = data["days"][6]
        assert sunday["date"] == "2026-08-30"
        assert sunday["is_closed"] is True

    def test_week_bookings_count(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/calendar/week",
                    params={"start": "2026-08-24"}, headers=auth_headers)
        assert r.status_code == 200
        by_date = {d["date"]: d for d in r.json()["days"]}
        # Aug 25 should have 6 bookings per context
        assert by_date["2026-08-25"]["bookings_count"] >= 1


# ---------- Admin bookings plate filter ----------
class TestAdminBookingsPlateFilter:
    def test_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/admin/bookings", params={"plate": "DD1234TX"})
        assert r.status_code == 401

    def test_plate_filter(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/bookings",
                    params={"plate": "DD1234TX"}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for b in data:
            assert b["plate_number"] == "DD1234TX"

    def test_plate_filter_case_insensitive(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/bookings",
                    params={"plate": "dd1234tx"}, headers=auth_headers)
        assert r.status_code == 200
        for b in r.json():
            assert b["plate_number"] == "DD1234TX"

    def test_plate_filter_no_match(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/bookings",
                    params={"plate": "ZZ9999ZZ"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == []

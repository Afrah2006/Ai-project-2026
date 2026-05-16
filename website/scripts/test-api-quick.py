"""Quick smoke test for /api/run-algorithm (run from website/: python scripts/test-api-quick.py)."""
from __future__ import annotations

import json
import urllib.error
import urllib.request

NURSES = [
    {"id": f"nurse-{i}", "name": f"Nurse {i}", "isSenior": i % 5 == 0, "dayOffRequests": [1, 2]}
    for i in range(1, 26)
]

# Real names from default dataset for feasible CSP
NURSES = [
    {"id": "nurse-1", "name": "IMAN BEBOUDI", "isSenior": False, "dayOffRequests": [2, 2]},
    {"id": "nurse-2", "name": "NDJATE BEDBOUDI", "isSenior": False, "dayOffRequests": [1, 5]},
    {"id": "nurse-3", "name": "KHEIREDDINE BADRAOUI", "isSenior": False, "dayOffRequests": [2, 3]},
    {"id": "nurse-4", "name": "HOUDRA BERABEZ", "isSenior": True, "dayOffRequests": [6, 5]},
    {"id": "nurse-5", "name": "ELHADI BERRAHIL", "isSenior": True, "dayOffRequests": [6, 7]},
    {"id": "nurse-6", "name": "ABDELKARIM BERRAHIL", "isSenior": False, "dayOffRequests": [7, 4]},
    {"id": "nurse-7", "name": "IMEN BRADAI", "isSenior": True, "dayOffRequests": [7, 1]},
    {"id": "nurse-8", "name": "HOUSSEM EDDINE BRANES", "isSenior": False, "dayOffRequests": [5, 2]},
    {"id": "nurse-9", "name": "SAMIRA BERBEGUE", "isSenior": False, "dayOffRequests": [3, 4]},
    {"id": "nurse-10", "name": "KHOULOUD BERBAGUE", "isSenior": True, "dayOffRequests": [3, 6]},
    {"id": "nurse-11", "name": "MAROUA BERDIOM", "isSenior": True, "dayOffRequests": [2, 7]},
    {"id": "nurse-12", "name": "CHAIMA BERHI", "isSenior": False, "dayOffRequests": [4, 7]},
    {"id": "nurse-13", "name": "MIANEL BERROGTANE", "isSenior": False, "dayOffRequests": [5, 4]},
    {"id": "nurse-14", "name": "LAILA BARKOUK", "isSenior": False, "dayOffRequests": [6, 2]},
    {"id": "nurse-15", "name": "ASIA BERKANI", "isSenior": False, "dayOffRequests": [7, 4]},
    {"id": "nurse-16", "name": "MERIEM BERKOUS", "isSenior": True, "dayOffRequests": [3, 5]},
    {"id": "nurse-17", "name": "INA BERNAMDANE", "isSenior": False, "dayOffRequests": [6, 3]},
    {"id": "nurse-18", "name": "ROUMAISSA BEROUR", "isSenior": False, "dayOffRequests": [2, 3]},
    {"id": "nurse-19", "name": "YASMINA BRISEKH", "isSenior": False, "dayOffRequests": [4, 5]},
    {"id": "nurse-20", "name": "RACHID BRIZAKH", "isSenior": True, "dayOffRequests": [4, 6]},
    {"id": "nurse-21", "name": "BADREDDINE BESSIKEUR", "isSenior": False, "dayOffRequests": [6, 7]},
    {"id": "nurse-22", "name": "NESRINE BSIKER", "isSenior": False, "dayOffRequests": [6, 1]},
    {"id": "nurse-23", "name": "NABILA IBRIR", "isSenior": False, "dayOffRequests": [7, 2]},
    {"id": "nurse-24", "name": "AMMAR ERHAILI", "isSenior": False, "dayOffRequests": [4, 3]},
    {"id": "nurse-25", "name": "KHAIER EDINE AKTOUF", "isSenior": False, "dayOffRequests": [7, 4]},
]


def post(algorithm: str, **extra):
    body = {"algorithm": algorithm, "nurses": NURSES, **extra}
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        "http://localhost:3000/api/run-algorithm",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            payload = json.loads(resp.read())
            print(algorithm, "OK", payload.get("algorithm"), "score", payload.get("score"))
            return payload
    except urllib.error.HTTPError as e:
        print(algorithm, "HTTP", e.code, e.read().decode()[:1500])
        raise


if __name__ == "__main__":
    post("tabu", seed=1, iterations=40, maxNoImprove=15)
    post("sa", iterations=40)

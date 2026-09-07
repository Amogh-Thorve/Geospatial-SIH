"""
app/utils/id_generator.py
Collision-resistant ID generators for submissions and transactions.
"""
from __future__ import annotations

import time
import random
import string


def generate_submission_id() -> str:
    """
    Generate a GW-XXXXXX style submission ID.
    Uses last 5 digits of millisecond timestamp + 1 random char for collision resistance.
    Example: GW-74831A
    """
    ts_part = str(int(time.time() * 1000))[-5:]
    rand_part = random.choice(string.ascii_uppercase)
    return f"GW-{ts_part}{rand_part}"


def generate_transaction_id() -> str:
    """
    Generate a TXN-XXXXXX style earnings transaction ID.
    Example: TXN-483921
    """
    ts_part = str(int(time.time() * 1000))[-6:]
    return f"TXN-{ts_part}"

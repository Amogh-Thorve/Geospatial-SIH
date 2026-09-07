# Jal Saheli — Database Migrations

This directory will contain Alembic migration scripts.

## Setup (Phase 2)

```bash
cd backend/jal_saheli
alembic init migrations
```

Then edit `migrations/env.py` to import all ORM models:

```python
from app.db.database import Base
from app.models import *  # noqa: F401, F403

target_metadata = Base.metadata
```

## Creating a migration

```bash
# Auto-generate from ORM model diff
alembic revision --autogenerate -m "create_cadre_profiles_table"

# Run migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

## Migration history

| Revision | Description |
|---|---|
| *(none yet — Phase 2 will add first migration)* | |

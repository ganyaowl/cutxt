import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from models import Base

ENGINE = create_engine(os.environ.get("DATABASE_URL", "sqlite:///api.db"))

Base.metadata.create_all(ENGINE)


def _migrate_classifications():
    """Добавить колонку classifier_method в существующих SQLite-БД."""
    try:
        with ENGINE.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info(classifications)")).fetchall()
            cols = {r[1] for r in rows}
            if "classifier_method" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE classifications "
                        "ADD COLUMN classifier_method VARCHAR(32) DEFAULT 'dictionary'"
                    )
                )
                conn.execute(
                    text(
                        "UPDATE classifications SET classifier_method = 'dictionary' "
                        "WHERE classifier_method IS NULL"
                    )
                )
    except Exception:
        pass


_migrate_classifications()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

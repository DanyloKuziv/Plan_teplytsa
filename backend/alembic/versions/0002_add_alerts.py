"""Add alerts table

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    alert_type_enum = postgresql.ENUM(
        "high_temperature", "high_co2", "low_humidity", "system",
        name="alerttype",
    )
    alert_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "greenhouse_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("greenhouses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.Enum("high_temperature", "high_co2", "low_humidity", "system", name="alerttype", create_type=False),
            nullable=False,
        ),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_greenhouse_id", "alerts", ["greenhouse_id"])
    op.create_index("ix_alerts_is_read", "alerts", ["is_read"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.execute("DROP TYPE IF EXISTS alerttype")

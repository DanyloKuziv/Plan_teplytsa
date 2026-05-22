"""add reset_code and reset_expires to users

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('reset_code', sa.String(6), nullable=True))
    op.add_column('users', sa.Column('reset_expires', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'reset_expires')
    op.drop_column('users', 'reset_code')

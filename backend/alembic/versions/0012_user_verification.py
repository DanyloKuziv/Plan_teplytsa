"""add email verification fields to users

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('verification_code', sa.String(6), nullable=True))
    op.add_column('users', sa.Column('verification_expires', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'verification_expires')
    op.drop_column('users', 'verification_code')
    op.drop_column('users', 'is_verified')

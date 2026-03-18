"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------------------
    # titles
    # ---------------------------------------------------------------------------
    op.create_table(
        'titles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('poster_url', sa.String(length=1000), nullable=True),
        sa.Column('backdrop_url', sa.String(length=1000), nullable=True),
        sa.Column('genres', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('rating', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column('runtime_minutes', sa.Integer(), nullable=True),
        sa.Column('tmdb_id', sa.Integer(), nullable=True),
        sa.Column('imdb_id', sa.String(length=20), nullable=True),
        sa.Column('mal_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_titles_title', 'titles', ['title'])
    op.create_index('ix_titles_type', 'titles', ['type'])
    op.create_index('ix_titles_tmdb_id', 'titles', ['tmdb_id'], unique=True)
    op.create_index('ix_titles_imdb_id', 'titles', ['imdb_id'], unique=True)
    op.create_index('ix_titles_mal_id', 'titles', ['mal_id'], unique=True)
    # Full-text search index
    op.execute(
        "CREATE INDEX ix_titles_fts ON titles USING gin(to_tsvector('english', title))"
    )

    # ---------------------------------------------------------------------------
    # platforms
    # ---------------------------------------------------------------------------
    op.create_table(
        'platforms',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('logo_url', sa.String(length=1000), nullable=True),
        sa.Column('base_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_platforms_slug', 'platforms', ['slug'], unique=True)

    # ---------------------------------------------------------------------------
    # availability
    # ---------------------------------------------------------------------------
    op.create_table(
        'availability',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('region', sa.String(length=10), nullable=False),
        sa.Column('stream_type', sa.String(length=50), nullable=False),
        sa.Column('content_url', sa.String(length=2000), nullable=True),
        sa.Column('price', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('available_until', sa.Date(), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('last_verified', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['title_id'], ['titles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['platform_id'], ['platforms.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_availability_title_id', 'availability', ['title_id'])
    op.create_index('ix_availability_platform_id', 'availability', ['platform_id'])
    op.create_index('ix_availability_region', 'availability', ['region'])
    op.create_index('ix_availability_available_until', 'availability', ['available_until'])
    op.create_index(
        'uq_availability_title_platform_region_type',
        'availability',
        ['title_id', 'platform_id', 'region', 'stream_type'],
        unique=True,
    )

    # ---------------------------------------------------------------------------
    # users
    # ---------------------------------------------------------------------------
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('hashed_password', sa.String(length=200), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('notify_email', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notify_push', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('preferred_region', sa.String(length=10), server_default='US', nullable=False),
        sa.Column('subscribed_platforms', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # ---------------------------------------------------------------------------
    # watchlist
    # ---------------------------------------------------------------------------
    op.create_table(
        'watchlist',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('alert_on_add', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('alert_on_remove', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['title_id'], ['titles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'title_id', name='uq_watchlist_user_title'),
    )
    op.create_index('ix_watchlist_user_id', 'watchlist', ['user_id'])
    op.create_index('ix_watchlist_title_id', 'watchlist', ['title_id'])

    # ---------------------------------------------------------------------------
    # sports_events
    # ---------------------------------------------------------------------------
    op.create_table(
        'sports_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('home_team', sa.String(length=200), nullable=False),
        sa.Column('away_team', sa.String(length=200), nullable=False),
        sa.Column('league', sa.String(length=200), nullable=True),
        sa.Column('league_id', sa.String(length=50), nullable=True),
        sa.Column('sport', sa.String(length=100), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('venue', sa.String(length=300), nullable=True),
        sa.Column('broadcast_channels', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('external_event_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['title_id'], ['titles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_event_id'),
    )
    op.create_index('ix_sports_events_start_time', 'sports_events', ['start_time'])
    op.create_index('ix_sports_events_league_id', 'sports_events', ['league_id'])


def downgrade() -> None:
    op.drop_table('sports_events')
    op.drop_table('watchlist')
    op.drop_table('users')
    op.drop_table('availability')
    op.drop_table('platforms')
    op.drop_index('ix_titles_fts', table_name='titles')
    op.drop_table('titles')

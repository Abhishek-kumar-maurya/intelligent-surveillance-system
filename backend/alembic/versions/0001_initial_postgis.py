from alembic import op
revision='0001_initial_postgis';down_revision=None;branch_labels=None;depends_on=None

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("ALTER TABLE cameras ADD COLUMN IF NOT EXISTS geom geometry(Point,4326)")
    op.execute("UPDATE cameras SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_cameras_geom_gist ON cameras USING GIST (geom)")

def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_cameras_geom_gist")
    op.execute("ALTER TABLE cameras DROP COLUMN IF EXISTS geom")

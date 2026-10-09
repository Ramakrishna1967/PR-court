"""Initial schema – all tables."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enums
    op.execute("CREATE TYPE IF NOT EXISTS trial_status AS ENUM ('QUEUED','INTAKE','ARGUMENTS','EVIDENCE_FILTER','REBUTTAL','JURY','VERDICT','FINISHED','ERROR','INCONCLUSIVE')")
    op.execute("CREATE TYPE IF NOT EXISTS risk_level AS ENUM ('LOW','MEDIUM','HIGH')")
    op.execute("CREATE TYPE IF NOT EXISTS verdict_type AS ENUM ('MERGE','FIX_FIRST','BLOCK','INCONCLUSIVE')")
    op.execute("CREATE TYPE IF NOT EXISTS claim_side AS ENUM ('prosecution','defense')")
    op.execute("CREATE TYPE IF NOT EXISTS claim_severity AS ENUM ('info','low','medium','high','critical')")
    op.execute("CREATE TYPE IF NOT EXISTS claim_status AS ENUM ('pending','admitted','discarded')")
    op.execute("CREATE TYPE IF NOT EXISTS juror_vote AS ENUM ('MERGE','FIX_FIRST','BLOCK')")

    op.create_table(
        'trials',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('repo', sa.String(255), nullable=False),
        sa.Column('pr_number', sa.Integer(), nullable=False),
        sa.Column('head_sha', sa.String(64), nullable=False, server_default=''),
        sa.Column('status', sa.Enum('QUEUED','INTAKE','ARGUMENTS','EVIDENCE_FILTER','REBUTTAL','JURY','VERDICT','FINISHED','ERROR','INCONCLUSIVE', name='trial_status'), nullable=False),
        sa.Column('risk', sa.Enum('LOW','MEDIUM','HIGH', name='risk_level'), nullable=True),
        sa.Column('verdict', sa.Enum('MERGE','FIX_FIRST','BLOCK','INCONCLUSIVE', name='verdict_type'), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('cost_usd', sa.Float(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('trial_id', sa.Uuid(), nullable=False),
        sa.Column('seq', sa.BigInteger(), nullable=False),
        sa.Column('type', sa.String(64), nullable=False),
        sa.Column('agent', sa.String(64), nullable=False, server_default=''),
        sa.Column('payload_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['trial_id'], ['trials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trial_id', 'seq'),
    )
    op.create_index('ix_events_trial_seq', 'events', ['trial_id', 'seq'])

    op.create_table(
        'evidence',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('trial_id', sa.Uuid(), nullable=False),
        sa.Column('agent', sa.String(64), nullable=False),
        sa.Column('command', sa.Text(), nullable=False),
        sa.Column('exit_code', sa.Integer(), nullable=False),
        sa.Column('stdout', sa.Text(), nullable=False, server_default=''),
        sa.Column('stderr', sa.Text(), nullable=False, server_default=''),
        sa.Column('artifact_paths', sa.JSON(), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False, server_default=''),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['trial_id'], ['trials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'claims',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('trial_id', sa.Uuid(), nullable=False),
        sa.Column('side', sa.Enum('prosecution','defense', name='claim_side'), nullable=False),
        sa.Column('agent', sa.String(64), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('severity', sa.Enum('info','low','medium','high','critical', name='claim_severity'), nullable=False),
        sa.Column('evidence_id', sa.Uuid(), nullable=True),
        sa.Column('status', sa.Enum('pending','admitted','discarded', name='claim_status'), nullable=False),
        sa.Column('failing_test_snippet', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id']),
        sa.ForeignKeyConstraint(['trial_id'], ['trials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'votes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('trial_id', sa.Uuid(), nullable=False),
        sa.Column('juror', sa.String(64), nullable=False),
        sa.Column('vote', sa.Enum('MERGE','FIX_FIRST','BLOCK', name='juror_vote'), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=False, server_default=''),
        sa.ForeignKeyConstraint(['trial_id'], ['trials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('votes')
    op.drop_table('claims')
    op.drop_table('evidence')
    op.drop_table('events')
    op.drop_table('trials')
    op.execute("DROP TYPE IF EXISTS juror_vote")
    op.execute("DROP TYPE IF EXISTS claim_status")
    op.execute("DROP TYPE IF EXISTS claim_severity")
    op.execute("DROP TYPE IF EXISTS claim_side")
    op.execute("DROP TYPE IF EXISTS verdict_type")
    op.execute("DROP TYPE IF EXISTS risk_level")
    op.execute("DROP TYPE IF EXISTS trial_status")

"""Add baseline_time_utc and metadata_json to scenarios and scenario_results

Revision ID: 0002_scenario_baseline_and_metadata
Revises: 0001_initial_schema
Create Date: 2026-09-26 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_scenario_baseline_and_metadata'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. scenarios table updates
    op.add_column('scenarios', sa.Column('baseline_time_utc', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_scenarios_baseline_time', 'scenarios', ['baseline_time_utc'], unique=False)

    # 2. scenario_results table updates
    op.add_column('scenario_results', sa.Column('baseline_time_utc', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_scen_res_baseline_time', 'scenario_results', ['baseline_time_utc'], unique=False)
    op.add_column('scenario_results', sa.Column('metadata_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('scenario_results', 'metadata_json')
    op.drop_index('ix_scen_res_baseline_time', table_name='scenario_results')
    op.drop_column('scenario_results', 'baseline_time_utc')
    op.drop_index('ix_scenarios_baseline_time', table_name='scenarios')
    op.drop_column('scenarios', 'baseline_time_utc')

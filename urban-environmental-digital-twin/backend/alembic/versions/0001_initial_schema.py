"""Initial normalized schema for Urban Environmental Digital Twin

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-26 18:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. stations table
    op.create_table(
        'stations',
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('station_name', sa.String(length=150), nullable=False),
        sa.Column('zone_type', sa.String(length=100), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('elevation_m', sa.Float(), nullable=True),
        sa.Column('city', sa.String(length=50), nullable=False),
        sa.Column('monitoring_authority', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('data_provenance', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('station_id')
    )
    op.create_index('ix_stations_station_id', 'stations', ['station_id'], unique=False)

    # 2. station_traffic_exposure table
    op.create_table(
        'station_traffic_exposure',
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('buffer_radius_m', sa.Float(), nullable=False),
        sa.Column('buffer_area_km2', sa.Float(), nullable=False),
        sa.Column('total_road_segments', sa.Integer(), nullable=False),
        sa.Column('total_road_length_km', sa.Float(), nullable=False),
        sa.Column('major_road_length_km', sa.Float(), nullable=False),
        sa.Column('local_road_length_km', sa.Float(), nullable=False),
        sa.Column('major_road_density_km_per_km2', sa.Float(), nullable=False),
        sa.Column('total_road_density_km_per_km2', sa.Float(), nullable=False),
        sa.Column('distance_to_nearest_major_road_m', sa.Float(), nullable=False),
        sa.Column('nearest_major_road_name', sa.String(length=150), nullable=True),
        sa.Column('nearest_major_road_class', sa.String(length=50), nullable=True),
        sa.Column('data_provenance', sa.String(length=100), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('station_id')
    )
    op.create_index('ix_station_traffic_exposure_station_id', 'station_traffic_exposure', ['station_id'], unique=False)

    # 3. station_activity_exposure table
    op.create_table(
        'station_activity_exposure',
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('industrial_elements_2km', sa.Integer(), nullable=False),
        sa.Column('dist_nearest_industrial_m', sa.Float(), nullable=False),
        sa.Column('has_industrial_within_1km', sa.Boolean(), nullable=False),
        sa.Column('construction_elements_1_5km', sa.Integer(), nullable=False),
        sa.Column('dist_nearest_construction_m', sa.Float(), nullable=False),
        sa.Column('has_construction_within_1km', sa.Boolean(), nullable=False),
        sa.Column('poi_total_count_1_5km', sa.Integer(), nullable=False),
        sa.Column('poi_density_per_km2', sa.Float(), nullable=False),
        sa.Column('poi_commercial_count', sa.Integer(), nullable=False),
        sa.Column('poi_institutional_count', sa.Integer(), nullable=False),
        sa.Column('poi_transit_count', sa.Integer(), nullable=False),
        sa.Column('landuse_elements_total', sa.Integer(), nullable=False),
        sa.Column('landuse_residential_count', sa.Integer(), nullable=False),
        sa.Column('landuse_commercial_count', sa.Integer(), nullable=False),
        sa.Column('landuse_industrial_count', sa.Integer(), nullable=False),
        sa.Column('landuse_green_count', sa.Integer(), nullable=False),
        sa.Column('dominant_landuse', sa.String(length=50), nullable=False),
        sa.Column('data_provenance', sa.String(length=100), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('station_id')
    )
    op.create_index('ix_station_activity_exposure_station_id', 'station_activity_exposure', ['station_id'], unique=False)

    # 4. traffic_proxy table
    op.create_table(
        'traffic_proxy',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('hour_of_day', sa.Integer(), nullable=False),
        sa.Column('is_weekend', sa.Boolean(), nullable=False),
        sa.Column('traffic_proxy_index', sa.Float(), nullable=False),
        sa.Column('traffic_intensity_category', sa.String(length=50), nullable=False),
        sa.Column('data_provenance', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('hour_of_day', 'is_weekend', name='uq_traffic_proxy_hour_weekend')
    )

    # 5. model_registry table
    op.create_table(
        'model_registry',
        sa.Column('model_id', sa.String(length=100), nullable=False),
        sa.Column('model_name', sa.String(length=150), nullable=False),
        sa.Column('model_type', sa.String(length=50), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('target', sa.String(length=100), nullable=False),
        sa.Column('horizon', sa.String(length=100), nullable=False),
        sa.Column('feature_set', sa.String(length=50), nullable=False),
        sa.Column('training_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('training_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('validation_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('validation_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('test_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('test_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metrics', sa.JSON(), nullable=False),
        sa.Column('artifact_path', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('model_id')
    )
    op.create_index('ix_model_registry_model_id', 'model_registry', ['model_id'], unique=False)

    # 6. environmental_observations table
    op.create_table(
        'environmental_observations',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('datetime_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('datetime_local_ist', sa.DateTime(), nullable=False),
        sa.Column('pm25', sa.Float(), nullable=True),
        sa.Column('pm25_obs_count', sa.Integer(), nullable=True),
        sa.Column('pm25_completeness_flag', sa.String(length=20), nullable=False),
        sa.Column('pm10', sa.Float(), nullable=True),
        sa.Column('pm10_obs_count', sa.Integer(), nullable=True),
        sa.Column('no2', sa.Float(), nullable=True),
        sa.Column('no2_obs_count', sa.Integer(), nullable=True),
        sa.Column('so2', sa.Float(), nullable=True),
        sa.Column('co', sa.Float(), nullable=True),
        sa.Column('o3', sa.Float(), nullable=True),
        sa.Column('temp_insitu_c', sa.Float(), nullable=True),
        sa.Column('humidity_insitu_pct', sa.Float(), nullable=True),
        sa.Column('wind_speed_insitu_ms', sa.Float(), nullable=True),
        sa.Column('data_provenance', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('station_id', 'datetime_utc', name='uq_env_obs_station_datetime')
    )
    op.create_index('ix_env_obs_datetime', 'environmental_observations', ['datetime_utc'], unique=False)
    op.create_index('ix_env_obs_station_datetime', 'environmental_observations', ['station_id', 'datetime_utc'], unique=False)
    op.create_index('ix_env_obs_station_id', 'environmental_observations', ['station_id'], unique=False)

    # 7. weather_reanalysis table
    op.create_table(
        'weather_reanalysis',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('datetime_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('temp_c', sa.Float(), nullable=False),
        sa.Column('humidity_pct', sa.Float(), nullable=False),
        sa.Column('dew_point_c', sa.Float(), nullable=False),
        sa.Column('precip_mm', sa.Float(), nullable=False),
        sa.Column('rain_mm', sa.Float(), nullable=False),
        sa.Column('pressure_hpa', sa.Float(), nullable=False),
        sa.Column('wind_speed_ms', sa.Float(), nullable=False),
        sa.Column('wind_dir_deg', sa.Float(), nullable=False),
        sa.Column('solar_rad_wm2', sa.Float(), nullable=False),
        sa.Column('cloud_cover_pct', sa.Float(), nullable=False),
        sa.Column('pbl_height_m', sa.Float(), nullable=False),
        sa.Column('grid_latitude', sa.Float(), nullable=False),
        sa.Column('grid_longitude', sa.Float(), nullable=False),
        sa.Column('elevation_m', sa.Float(), nullable=False),
        sa.Column('data_provenance', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('station_id', 'datetime_utc', name='uq_weather_station_datetime')
    )
    op.create_index('ix_weather_datetime', 'weather_reanalysis', ['datetime_utc'], unique=False)
    op.create_index('ix_weather_station_datetime', 'weather_reanalysis', ['station_id', 'datetime_utc'], unique=False)
    op.create_index('ix_weather_station_id', 'weather_reanalysis', ['station_id'], unique=False)

    # 8. model_predictions table
    op.create_table(
        'model_predictions',
        sa.Column('prediction_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('model_id', sa.String(length=100), nullable=False),
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('prediction_time_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('target_time_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('horizon_hours', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('predicted_pm25', sa.Float(), nullable=False),
        sa.Column('actual_pm25', sa.Float(), nullable=True),
        sa.Column('split', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['model_id'], ['model_registry.model_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('prediction_id')
    )
    op.create_index('ix_model_preds_model_id', 'model_predictions', ['model_id'], unique=False)
    op.create_index('ix_model_preds_station_id', 'model_predictions', ['station_id'], unique=False)
    op.create_index('ix_model_preds_prediction_time', 'model_predictions', ['prediction_time_utc'], unique=False)
    op.create_index('ix_model_preds_target_time', 'model_predictions', ['target_time_utc'], unique=False)
    op.create_index('ix_model_preds_model_target', 'model_predictions', ['model_id', 'target_time_utc'], unique=False)
    op.create_index('ix_model_preds_station_target', 'model_predictions', ['station_id', 'target_time_utc'], unique=False)
    op.create_index('ix_model_preds_model_station_target', 'model_predictions', ['model_id', 'station_id', 'target_time_utc'], unique=False)

    # 9. scenarios table
    op.create_table(
        'scenarios',
        sa.Column('scenario_id', sa.String(length=64), nullable=False),
        sa.Column('scenario_name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('station_id', sa.Integer(), nullable=True),
        sa.Column('model_id', sa.String(length=100), nullable=False),
        sa.Column('traffic_reduction_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('industrial_reduction_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('construction_halt', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('weather_reference_period', sa.String(length=50), nullable=True),
        sa.Column('simulation_status', sa.String(length=20), nullable=False, server_default='DRAFT'),
        sa.Column('is_modeled_scenario', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_by', sa.String(length=100), nullable=False, server_default='system'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['model_id'], ['model_registry.model_id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('scenario_id')
    )
    op.create_index('ix_scenarios_model_id', 'scenarios', ['model_id'], unique=False)
    op.create_index('ix_scenarios_scenario_id', 'scenarios', ['scenario_id'], unique=False)
    op.create_index('ix_scenarios_station_id', 'scenarios', ['station_id'], unique=False)

    # 10. scenario_results table
    op.create_table(
        'scenario_results',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('scenario_id', sa.String(length=64), nullable=False),
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('target_time_utc', sa.DateTime(timezone=True), nullable=False),
        sa.Column('baseline_pm25', sa.Float(), nullable=False),
        sa.Column('scenario_pm25', sa.Float(), nullable=False),
        sa.Column('delta_pm25', sa.Float(), nullable=False),
        sa.Column('pct_change', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.scenario_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_scenario_results_scenario_id', 'scenario_results', ['scenario_id'], unique=False)
    op.create_index('ix_scenario_results_station_id', 'scenario_results', ['station_id'], unique=False)
    op.create_index('ix_scen_res_scenario_time', 'scenario_results', ['scenario_id', 'target_time_utc'], unique=False)
    op.create_index('ix_scen_res_station_time', 'scenario_results', ['station_id', 'target_time_utc'], unique=False)


def downgrade() -> None:
    op.drop_table('scenario_results')
    op.drop_table('scenarios')
    op.drop_table('model_predictions')
    op.drop_table('weather_reanalysis')
    op.drop_table('environmental_observations')
    op.drop_table('model_registry')
    op.drop_table('traffic_proxy')
    op.drop_table('station_activity_exposure')
    op.drop_table('station_traffic_exposure')
    op.drop_table('stations')

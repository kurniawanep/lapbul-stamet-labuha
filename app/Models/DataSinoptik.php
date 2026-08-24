<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataSinoptik extends Model
{
    use HasFactory;

    protected $table = 'data_sinoptik';

    protected $fillable = [
        'station_id',
        'station_name',
        'data_timestamp',
        'received_timestamp',
        'sent_timestamp',
        'delta_min',
        'monitoring_status',
        'delay_minutes',
        'sandi',
        'temp_drybulb',
        'temp_max',
        'temp_min',
        'temp_wetbulb',
        'temp_dewpoint',
        'humidity',
        'pressure_qff',
        'pressure_qfe',
        'wind_dir',
        'wind_speed',
        'visibility',
        'rainfall',
        'cloud_cover',
        'observer_name',
        'pegawai_id',

        // Weather & Indicators
        'present_weather_ww',
        'past_weather_w1',
        'past_weather_w2',
        'wind_indicator_iw',
        'weather_indicator_ix',
        'rainfall_indicator_ir',

        // Pressure details
        'pressure_reading_mb',
        'pressure_temp_c',
        'pressure_3h_diff_ppp',
        'pressure_24h_diff_p24',

        // Cloud Types & Cover
        'cloud_low_type_cl',
        'cloud_med_type_cm',
        'cloud_high_type_ch',
        'cloud_low_cover_oktas',
        'cloud_med_cover_oktas',
        'cloud_high_cover_oktas',

        // Cloud Layers
        'cloud_layer_1_type',
        'cloud_layer_1_height',
        'cloud_layer_1_amt',
        'cloud_layer_2_type',
        'cloud_layer_2_height',
        'cloud_layer_2_amt',
        'cloud_layer_3_type',
        'cloud_layer_3_height',
        'cloud_layer_3_amt',
        'cloud_layer_4_type',
        'cloud_layer_4_height',
        'cloud_layer_4_amt',

        // Rainfall periods
        'rainfall_6h_rrr',
        'rainfall_24h_rrrr',

        // Solar, Sunshine, Evaporation & Land
        'solar_rad_24h',
        'sunshine_hours',
        'evaporation_24h',
        'evaporation_indicator_ie',
        'land_cond',
        'land_note',

        // Encoded Synop
        'encoded_synop',

        'teknisi_id',
        'ppnpn_id',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'temp_drybulb' => 'float',
        'temp_max' => 'float',
        'temp_min' => 'float',
        'temp_wetbulb' => 'float',
        'temp_dewpoint' => 'float',
        'humidity' => 'float',
        'pressure_qff' => 'float',
        'pressure_qfe' => 'float',
        'wind_dir' => 'float',
        'wind_speed' => 'float',
        'visibility' => 'float',
        'rainfall' => 'float',
        'pressure_reading_mb' => 'float',
        'pressure_temp_c' => 'float',
        'pressure_3h_diff_ppp' => 'float',
        'pressure_24h_diff_p24' => 'float',
        'cloud_low_cover_oktas' => 'float',
        'cloud_med_cover_oktas' => 'float',
        'cloud_high_cover_oktas' => 'float',
        'cloud_layer_1_height' => 'float',
        'cloud_layer_1_amt' => 'float',
        'cloud_layer_2_height' => 'float',
        'cloud_layer_2_amt' => 'float',
        'cloud_layer_3_height' => 'float',
        'cloud_layer_3_amt' => 'float',
        'cloud_layer_4_height' => 'float',
        'cloud_layer_4_amt' => 'float',
        'rainfall_6h_rrr' => 'float',
        'rainfall_24h_rrrr' => 'float',
        'solar_rad_24h' => 'float',
        'sunshine_hours' => 'float',
        'evaporation_24h' => 'float',
    ];

    /**
     * Relationship to Pegawai observer model.
     */
    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }

    public function teknisi(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'teknisi_id');
    }

    public function ppnpn(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'ppnpn_id');
    }
}

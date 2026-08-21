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
    ];

    /**
     * Relationship to Pegawai observer model.
     */
    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}

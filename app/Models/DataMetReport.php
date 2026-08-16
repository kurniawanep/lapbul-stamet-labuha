<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataMetReport extends Model
{
    use HasFactory;

    protected $table = 'data_met_report';

    protected $fillable = [
        'station_code',
        'station_name',
        'data_timestamp',
        'wind',
        'visibility',
        'weather',
        'cloud',
        'temp_drybulb',
        'temp_dewpoint',
        'qnh_hpa',
        'qnh_inhg',
        'qfe_hpa',
        'qfe_inhg',
        'remarks',
        'trend',
        'raw_message',
        'observer_name',
        'pegawai_id',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'temp_drybulb' => 'float',
        'temp_dewpoint' => 'float',
        'qnh_hpa' => 'float',
        'qnh_inhg' => 'float',
        'qfe_hpa' => 'float',
        'qfe_inhg' => 'float',
    ];

    /**
     * Relationship to Pegawai observer model.
     */
    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataPibal extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'data_pibal';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'station_id',
        'alias_station_id',
        'station_name',
        'data_timestamp',
        'received_timestamp',
        'sent_timestamp',
        'delta_min',
        'monitoring_status',
        'delay_minutes',
        'observer_name',
        'pegawai_id',
        'wind_dir_surface',
        'wind_speed_surface',
        'station_elevation',
        'sandi_pibal',
        'penghentian_pengamatan',
        'pembacaan_azimuth_elevasi',
        'hasil_lapisan_wd_ws_dddff',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data_timestamp' => 'datetime:Y-m-d H:i:s',
            'wind_dir_surface' => 'float',
            'wind_speed_surface' => 'float',
            'pembacaan_azimuth_elevasi' => 'array',
            'hasil_lapisan_wd_ws_dddff' => 'array',
        ];
    }

    /**
     * Relationship to Pegawai model (matched by observer_name).
     */
    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}

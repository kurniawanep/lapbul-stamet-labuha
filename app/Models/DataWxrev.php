<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataWxrev extends Model
{
    use HasFactory;

    protected $table = 'data_wxrev';

    protected $fillable = [
        'station_id',
        'station_name',
        'data_timestamp',
        'sandi',
        'mmyygp',
        'iiiii',
        'attxtxtntn',
        'appxpxpnpn',
        'auuxuxunun',
        'arrrrr',
        'rdrddfmfm1',
        'rdrddfmfm2',
        'jam_kirim',
        'pressure_indicator',
        'pressure_max',
        'pressure_min',
        'temperature_indicator',
        'temperature_max',
        'temperature_min',
        'relative_humidity_indicator',
        'relative_humidity_max',
        'relative_humidity_min',
        'rainfall_indicator',
        'rainfall_24',
        'number_of_observation',
        'dominant_wind_direction_1',
        'dominant_wind_direction_2',
        'dominant_wind_speed_1',
        'dominant_wind_speed_2',
        'number_of_dominant_wind_direction_1',
        'number_of_dominant_wind_direction_2',
        'observer_name',
        'pegawai_id',
        'teknisi_id',
        'ppnpn_id',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'pressure_max' => 'float',
        'pressure_min' => 'float',
        'temperature_max' => 'float',
        'temperature_min' => 'float',
        'relative_humidity_max' => 'float',
        'relative_humidity_min' => 'float',
        'rainfall_24' => 'float',
        'dominant_wind_direction_1' => 'float',
        'dominant_wind_direction_2' => 'float',
        'dominant_wind_speed_1' => 'float',
        'dominant_wind_speed_2' => 'float',
    ];

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

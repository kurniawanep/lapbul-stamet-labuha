<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataFklim extends Model
{
    use HasFactory;

    protected $table = 'data_fklim';

    protected $fillable = [
        'station_id',
        'station_name',
        'alias_station_id',
        'data_timestamp',
        'source_data',
        'tbk_0700',
        'tbk_1300',
        'tbk_1800',
        'tbk_avg',
        't_max',
        't_min',
        'rr_0700',
        'ss_8',
        'cu_khusus',
        'pp_qfe',
        'rh_0700',
        'rh_1300',
        'rh_1800',
        'rh_avg',
        'ff_avg',
        'wd_cardinal',
        'ff_max',
        'wd_ff_max',
        'observer_name',
        'pegawai_id',
        'qc_flag',
        'qc_histories',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'tbk_0700' => 'float',
        'tbk_1300' => 'float',
        'tbk_1800' => 'float',
        'tbk_avg' => 'float',
        't_max' => 'float',
        't_min' => 'float',
        'rr_0700' => 'float',
        'ss_8' => 'float',
        'pp_qfe' => 'float',
        'rh_0700' => 'integer',
        'rh_1300' => 'integer',
        'rh_1800' => 'integer',
        'rh_avg' => 'integer',
        'ff_avg' => 'float',
        'ff_max' => 'float',
        'qc_flag' => 'integer',
    ];

    /**
     * Relationship to Pegawai observer model.
     */
    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}

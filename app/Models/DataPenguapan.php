<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DataPenguapan extends Model
{
    use HasFactory;

    protected $table = 'data_penguapan';

    protected $fillable = [
        'station_id',
        'station_name',
        'alias_station_id',
        'data_timestamp',
        'source_data',
        'op_diff_baca',
        't_air_max',
        't_air_min',
        't_air_avg',
        'rr_0700',
        'op_eva',
        'ws_avg_0c5',
        'observer_name',
        'qc_flag',
        'qc_histories',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'op_diff_baca' => 'float',
        't_air_max' => 'float',
        't_air_min' => 'float',
        't_air_avg' => 'float',
        'rr_0700' => 'float',
        'op_eva' => 'float',
        'ws_avg_0c5' => 'float',
        'qc_flag' => 'integer',
    ];
}

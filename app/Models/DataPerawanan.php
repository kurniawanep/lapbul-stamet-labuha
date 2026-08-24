<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataPerawanan extends Model
{
    use HasFactory;

    protected $table = 'data_perawanan';

    protected $fillable = [
        'station_id',
        'station_name',
        'data_timestamp',
        'clear',
        'partly_cloudy',
        'cloudy',
        'totally_cloudy',
        'total_observation',
        'notes',
        'observer_name',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'clear' => 'integer',
        'partly_cloudy' => 'integer',
        'cloudy' => 'integer',
        'totally_cloudy' => 'integer',
        'total_observation' => 'integer',
    ];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataFlightDocument extends Model
{
    use HasFactory;

    protected $table = 'data_flight_document';

    protected $fillable = [
        'station_code',
        'inasiam_fd_id',
        'no_fd',
        'flight_number',
        'airline_name',
        'route',
        'departure_at',
        'issued_at',
        'flight_level',
        'type',
        'status',
        'fd_url',
        'is_wa_dispatched',
        'wa_dispatched_at',
        'wa_sender_name',
        'observer_name',
        'pegawai_id',
    ];

    protected $casts = [
        'departure_at' => 'datetime',
        'issued_at' => 'datetime',
        'wa_dispatched_at' => 'datetime',
        'is_wa_dispatched' => 'boolean',
    ];

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}

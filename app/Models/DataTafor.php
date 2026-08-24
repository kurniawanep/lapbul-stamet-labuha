<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataTafor extends Model
{
    use HasFactory;

    protected $table = 'data_tafor';

    protected $fillable = [
        'bmkgsoft_entry_id',
        'station_id',
        'alias_station_id',
        'station_name',
        'cccc',
        'ttaaii',
        'type_message',
        'bbb',
        'data_timestamp',
        'received_timestamp',
        'sent_timestamp',
        'sandi',
        'status',
        'sender_username',
        'observer_name',
        'pegawai_id',
        'teknisi_id',
        'ppnpn_id',
    ];

    protected $casts = [
        'data_timestamp' => 'datetime',
        'received_timestamp' => 'datetime',
        'sent_timestamp' => 'datetime',
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

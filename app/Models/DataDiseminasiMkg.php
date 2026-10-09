<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataDiseminasiMkg extends Model
{
    use HasFactory;

    protected $table = 'data_diseminasi_mkg';

    protected $fillable = [
        'simpan_mkg_id',
        'dissemination_timestamp',
        'pegawai_id',
        'shift_id',
        'shift_kode',
        'shift_nama',
        'media_type',
        'message',
        'platforms',
        'status',
        'sender_wa',
        'sender_name',
        'is_registered',
        'media_url',
    ];

    protected $casts = [
        'dissemination_timestamp' => 'datetime',
        'platforms' => 'array',
        'is_registered' => 'boolean',
    ];

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(JadwalBulananShift::class, 'shift_id');
    }
}

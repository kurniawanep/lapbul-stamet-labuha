<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JadwalDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'jadwal_bulanan_id',
        'pegawai_id',
        'tanggal',
        'shift_id',
    ];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
    ];

    public function jadwalBulanan(): BelongsTo
    {
        return $this->belongsTo(JadwalBulanan::class, 'jadwal_bulanan_id');
    }

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(JadwalBulananShift::class, 'shift_id');
    }
}

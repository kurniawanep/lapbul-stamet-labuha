<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JadwalBulananShift extends Model
{
    use HasFactory;

    protected $table = 'jadwal_bulanan_shifts';

    protected $fillable = [
        'jadwal_bulanan_id',
        'master_shift_id',
        'category',
        'kode_shift',
        'nama_shift',
        'jam_masuk',
        'jam_keluar',
        'is_tidak_masuk_kerja',
    ];

    protected $casts = [
        'is_tidak_masuk_kerja' => 'boolean',
    ];

    public function jadwalBulanan(): BelongsTo
    {
        return $this->belongsTo(JadwalBulanan::class, 'jadwal_bulanan_id');
    }

    public function masterShift(): BelongsTo
    {
        return $this->belongsTo(MasterShift::class, 'master_shift_id');
    }

    public function jadwalDetails(): HasMany
    {
        return $this->hasMany(JadwalDetail::class, 'shift_id');
    }
}

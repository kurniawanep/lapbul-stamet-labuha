<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JadwalBulanan extends Model
{
    use HasFactory;

    protected $fillable = [
        'bulan',
        'tahun',
        'stasiun',
        'zona_waktu',
        'kepala_stasiun_nama',
        'kepala_pokjung_nama',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(JadwalDetail::class, 'jadwal_bulanan_id');
    }
}

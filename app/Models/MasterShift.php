<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'category',
        'kode_shift',
        'nama_shift',
        'jam_masuk',
        'jam_keluar',
        'is_tidak_masuk_kerja',
    ];

    protected function casts(): array
    {
        return [
            'is_tidak_masuk_kerja' => 'boolean',
        ];
    }

    public function jadwalDetails(): HasMany
    {
        return $this->hasMany(JadwalDetail::class, 'shift_id');
    }
}

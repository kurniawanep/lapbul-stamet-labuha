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

    public function shifts(): HasMany
    {
        return $this->hasMany(JadwalBulananShift::class, 'jadwal_bulanan_id');
    }

    public function copyMasterShifts(): void
    {
        $masterShifts = MasterShift::all();

        foreach ($masterShifts as $ms) {
            JadwalBulananShift::updateOrCreate(
                [
                    'jadwal_bulanan_id' => $this->id,
                    'category' => $ms->category,
                    'kode_shift' => $ms->kode_shift,
                ],
                [
                    'master_shift_id' => $ms->id,
                    'nama_shift' => $ms->nama_shift,
                    'jam_masuk' => $ms->jam_masuk,
                    'jam_keluar' => $ms->jam_keluar,
                    'is_tidak_masuk_kerja' => $ms->is_tidak_masuk_kerja,
                ]
            );
        }
    }
}

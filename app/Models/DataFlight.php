<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataFlight extends Model
{
    use HasFactory;

    protected $table = 'data_flights';

    protected $fillable = [
        'tanggal',
        'maskapai',
        'flight_number',
        'reg',
        'dep',
        'arr',
        'sta_utc',
        'std_utc',
        'ata_utc',
        'atd_utc',
        'remarks',
        'pegawai_id',
    ];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
    ];

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }

    /**
     * Helper to detect airline name from flight number prefix.
     */
    public static function detectMaskapai(?string $flightNumber): string
    {
        if (!$flightNumber) {
            return 'Wings Air';
        }

        $upper = strtoupper(trim($flightNumber));
        if (str_starts_with($upper, 'IW')) {
            return 'Wings Air';
        }
        if (str_starts_with($upper, 'JT')) {
            return 'Lion Air';
        }
        if (str_starts_with($upper, 'ID')) {
            return 'Batik Air';
        }
        if (str_starts_with($upper, 'IU')) {
            return 'Super Air Jet';
        }
        if (str_starts_with($upper, 'GA')) {
            return 'Garuda Indonesia';
        }
        if (str_starts_with($upper, 'QG')) {
            return 'Citilink';
        }
        if (str_starts_with($upper, 'SJ') || str_starts_with($upper, 'IN')) {
            return 'Sriwijaya Air';
        }
        if (str_starts_with($upper, 'IL')) {
            return 'Trigana Air';
        }
        if (str_starts_with($upper, 'SI')) {
            return 'Susi Air';
        }
        if (str_starts_with($upper, 'SZ')) {
            return 'SAM Air';
        }

        return 'Wings Air';
    }
}

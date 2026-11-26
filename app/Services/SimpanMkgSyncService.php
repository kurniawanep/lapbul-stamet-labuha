<?php

namespace App\Services;

use App\Models\DataDiseminasiMkg;
use App\Models\JadwalDetail;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SimpanMkgSyncService
{
    protected ObserverResolverService $resolver;

    public function __construct(ObserverResolverService $resolver)
    {
        $this->resolver = $resolver;
    }

    /**
     * Get Supabase credentials from config, environment, or ../simpan-mkg/.env fallback.
     */
    protected function getCredentials(): array
    {
        $url = config('services.simpan_mkg.supabase_url') ?: env('SIMPAN_MKG_SUPABASE_URL');
        $key = config('services.simpan_mkg.supabase_key') ?: env('SIMPAN_MKG_SUPABASE_KEY');

        if (empty($url) || empty($key)) {
            // Check fallback from ../simpan-mkg/.env
            $simpanEnv = base_path('../simpan-mkg/.env');
            if (file_exists($simpanEnv)) {
                $content = file_get_contents($simpanEnv);
                if (preg_match('/SUPABASE_URL\s*=\s*([^\r\n]+)/', $content, $mUrl)) {
                    $url = trim($mUrl[1]);
                }
                if (preg_match('/SUPABASE_KEY\s*=\s*([^\r\n]+)/', $content, $mKey)) {
                    $key = trim($mKey[1]);
                }
            }
        }

        return [
            'url' => rtrim($url ?? '', '/'),
            'key' => trim($key ?? ''),
        ];
    }

    /**
     * Synchronize dissemination logs from Supabase for a given month and year.
     */
    public function syncMonth(int $bulan, int $tahun): array
    {
        $creds = $this->getCredentials();
        if (empty($creds['url']) || empty($creds['key'])) {
            return [
                'success' => false,
                'synced_count' => 0,
                'new_count' => 0,
                'total_fetched' => 0,
                'message' => 'Konfigurasi Supabase SIMPAN-MKG (URL atau Service Key) belum terisi di .env.',
            ];
        }

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $daysInMonth = $startDate->daysInMonth;
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        // Convert query window to UTC to match Supabase timestamptz
        // Local WIT (UTC+9) starts 9 hours earlier in UTC
        $utcStart = $startDate->copy()->setTimezone('UTC')->subDay()->format('Y-m-d\T00:00:00\Z');
        $utcEnd = $endDate->copy()->setTimezone('UTC')->addDay()->format('Y-m-d\T23:59:59\Z');

        $endpoint = "{$creds['url']}/rest/v1/dissemination_log";

        try {
            $response = Http::withHeaders([
                'apikey' => $creds['key'],
                'Authorization' => "Bearer {$creds['key']}",
            ])
            ->timeout(20)
            ->get($endpoint, [
                'timestamp' => "gte.{$utcStart}",
                'and' => "(timestamp.lte.{$utcEnd})",
                'order' => 'timestamp.asc',
                'select' => '*',
            ]);

            if (!$response->successful()) {
                Log::error("SimpanMkgSyncService: HTTP request to Supabase failed: " . $response->body());
                return [
                    'success' => false,
                    'synced_count' => 0,
                    'new_count' => 0,
                    'total_fetched' => 0,
                    'message' => 'Gagal mengambil data dari Supabase SIMPAN-MKG (HTTP ' . $response->status() . ').',
                ];
            }

            $rawLogs = $response->json();
            if (!is_array($rawLogs)) {
                $rawLogs = [];
            }

            // Pre-warm observer resolver schedules
            $this->resolver->resetCache();
            $this->resolver->prewarm($startDate->copy()->subDays(2), $endDate->copy()->addDays(2));

            $syncedCount = 0;
            $newCount = 0;
            $details = [];

            foreach ($rawLogs as $log) {
                if (empty($log['id']) || empty($log['timestamp'])) {
                    continue;
                }

                // Parse timestamp and convert strictly to WIT (Asia/Jayapura)
                $rawTs = $log['timestamp'];
                if (preg_match('/[Z\+\-]/i', $rawTs)) {
                    $witDt = Carbon::parse($rawTs)->setTimezone('Asia/Jayapura');
                } else {
                    // Naive timestamp
                    $witDt = Carbon::parse($rawTs, 'Asia/Jayapura');
                }

                // Only process records falling within the requested month in WIT
                if ($witDt->year !== $tahun || $witDt->month !== $bulan) {
                    continue;
                }

                // Resolve active operational duty officer & shift
                $duty = $this->resolveOperationalDutyOfficer($witDt, $log['name'] ?? null);

                // Parse platforms array safely
                $platforms = $log['platforms'] ?? [];
                if (is_string($platforms)) {
                    $decoded = json_decode($platforms, true);
                    $platforms = is_array($decoded) ? $decoded : [$platforms];
                }

                $isNew = !DataDiseminasiMkg::where('simpan_mkg_id', $log['id'])->exists();

                DataDiseminasiMkg::updateOrCreate(
                    ['simpan_mkg_id' => $log['id']],
                    [
                        'dissemination_timestamp' => $witDt->format('Y-m-d H:i:s'),
                        'pegawai_id' => $duty['pegawai']?->id,
                        'shift_id' => $duty['shift']?->id,
                        'shift_kode' => $duty['shift']?->kode_shift,
                        'shift_nama' => $duty['shift']?->nama_shift,
                        'media_type' => $log['media_type'] ?? 'image',
                        'message' => $log['message'] ?? '',
                        'platforms' => $platforms,
                        'status' => $log['status'] ?? 'success',
                        'sender_wa' => $log['wa_number'] ?? null,
                        'sender_name' => $log['name'] ?? null,
                        'is_registered' => (bool) ($log['is_registered'] ?? false),
                    ]
                );

                $syncedCount++;
                if ($isNew) {
                    $newCount++;
                }

                if (count($details) < 15) {
                    $details[] = [
                        'id' => $log['id'],
                        'waktu_wit' => $witDt->format('d M Y H:i:s') . ' WIT',
                        'pegawai' => $duty['pegawai']?->nama ?? 'Tidak Terjadwal',
                        'shift' => $duty['shift']?->kode_shift ?? '-',
                        'media_type' => $log['media_type'] ?? 'image',
                        'status' => $log['status'] ?? 'success',
                    ];
                }
            }

            return [
                'success' => true,
                'synced_count' => $syncedCount,
                'new_count' => $newCount,
                'total_fetched' => count($rawLogs),
                'details' => $details,
                'message' => "Sinkronisasi berhasil! {$syncedCount} log diseminasi diproses ({$newCount} data baru masuk).",
            ];

        } catch (\Throwable $e) {
            Log::error("SimpanMkgSyncService Error: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return [
                'success' => false,
                'synced_count' => 0,
                'new_count' => 0,
                'total_fetched' => 0,
                'message' => 'Terjadi kesalahan saat sinkronisasi: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Resolve the operational duty officer (Observer / Forecaster) and active shift
     * for a given Carbon datetime in WIT timezone.
     */
    public function resolveOperationalDutyOfficer(Carbon $witDt, ?string $fallbackName = null): array
    {
        $wit = $witDt->copy()->setTimezone('Asia/Jayapura');
        $matchedActive = $this->resolver->getObserverDetailByTimestamp($wit->format('Y-m-d H:i:s'), 'Asia/Jayapura');
        if ($matchedActive && $matchedActive->pegawai) {
            return [
                'pegawai' => $matchedActive->pegawai,
                'shift' => $matchedActive->shift,
            ];
        }

        $currentDateStr = $wit->toDateString();
        $currentDetails = $this->resolver->getDetailsForDate($currentDateStr)->filter(function ($detail) {
            if (!$detail->shift || !$detail->pegawai) {
                return false;
            }
            $shift = $detail->shift;
            $role = strtolower($detail->pegawai->role ?? '');
            $isObsOrForecast = str_contains($role, 'observer') || str_contains($role, 'forecaster');
            // Operational shifts only: exclude administrative shift 'A' and leave 'L'
            return $shift->category === 'operasional'
                && $shift->kode_shift !== 'A'
                && !$shift->is_tidak_masuk_kerja
                && $isObsOrForecast;
        });

        // 3. Fallback: If outside regular observer shifts, check active morning / afternoon officer
        $hour = $wit->hour;
        $matchedDetail = null;
        if ($hour >= 7 && $hour < 15) {
            // Morning duty (P / PF)
            $matchedDetail = $currentDetails->first(fn($d) => in_array($d->shift?->kode_shift, ['P', 'PF']));
        } elseif ($hour >= 15 && $hour < 23) {
            // Afternoon duty (S)
            $matchedDetail = $currentDetails->first(fn($d) => $d->shift?->kode_shift === 'S');
        } else {
            // Night duty (M / M1 / M2)
            $matchedDetail = $currentDetails->first(fn($d) => in_array($d->shift?->kode_shift, ['M', 'M1', 'M2']));
        }

        if ($matchedDetail) {
            return [
                'pegawai' => $matchedDetail->pegawai,
                'shift' => $matchedDetail->shift,
            ];
        }

        // 4. Secondary fallback: Match by sender name from Pegawai table (only Observer / Forecaster)
        if (!empty($fallbackName) && $fallbackName !== 'Admin' && $fallbackName !== 'Unregistered') {
            $pegawaiByName = $this->resolver->resolvePegawaiByName($fallbackName);
            if ($pegawaiByName) {
                $role = strtolower($pegawaiByName->role ?? '');
                if (str_contains($role, 'observer') || str_contains($role, 'forecaster')) {
                    return [
                        'pegawai' => $pegawaiByName,
                        'shift' => null,
                    ];
                }
            }
        }

        return [
            'pegawai' => null,
            'shift' => null,
        ];
    }
}

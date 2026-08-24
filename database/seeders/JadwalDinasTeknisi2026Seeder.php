<?php

namespace Database\Seeders;

use App\Models\JadwalBulanan;
use App\Models\JadwalBulananShift;
use App\Models\JadwalDetail;
use App\Models\Pegawai;
use Illuminate\Database\Seeder;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class JadwalDinasTeknisi2026Seeder extends Seeder
{
    /**
     * Search mapping from Excel names to Teknisi Pegawai search terms.
     */
    protected array $searchMap = [
        'ZULFIKAR' => 'ZULFIKAR',
        'ARWIN' => 'ARWIN',
        'KURNIAWAN' => 'KURNIAWAN',
    ];

    /**
     * July 2026 schedules from JadwalDinasJuli2026Seeder.
     */
    protected array $juliSchedules = [
        [
            'name_search' => 'ZULFIKAR',
            'shifts' => [
                1 => 'PT', 2 => 'PT', 3 => 'PT', 4 => 'L', 5 => 'L', 6 => 'PT', 7 => 'PT', 8 => 'PT', 9 => 'ST', 10 => 'ST',
                11 => 'L', 12 => 'L', 13 => 'PT', 14 => 'PT', 15 => 'PT', 16 => 'PT', 17 => 'PT', 18 => 'L', 19 => 'L', 20 => 'PT',
                21 => 'PT', 22 => 'ST', 23 => 'L', 24 => 'L', 25 => 'PT', 26 => 'PT', 27 => 'PT', 28 => 'ST', 29 => 'L', 30 => 'L', 31 => 'PT',
            ],
        ],
        [
            'name_search' => 'ARWIN',
            'shifts' => [
                1 => 'CT', 2 => 'CT', 3 => 'CT', 4 => 'CT', 5 => 'CT', 6 => 'CT', 7 => 'CT', 8 => 'L', 9 => 'PT', 10 => 'PT',
                11 => 'PT', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'ST',
                21 => 'ST', 22 => 'PT', 23 => 'PT', 24 => 'PT', 25 => 'L', 26 => 'L', 27 => 'ST', 28 => 'PT', 29 => 'PT', 30 => 'PT', 31 => 'L',
            ],
        ],
        [
            'name_search' => 'KURNIAWAN',
            'shifts' => [
                1 => 'A', 2 => 'A', 3 => 'A', 4 => 'L', 5 => 'L', 6 => 'A', 7 => 'A', 8 => 'A', 9 => 'A', 10 => 'A',
                11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
            ],
        ],
    ];

    /**
     * August 2026 schedules from official image.
     */
    protected array $agustusSchedules = [
        [
            'name_search' => 'ZULFIKAR',
            'shifts' => [
                1 => 'PT', 2 => 'PT', 3 => 'L', 4 => 'L', 5 => 'ST', 6 => 'PT', 7 => 'PT', 8 => 'PT', 9 => 'PT', 10 => 'L',
                11 => 'L', 12 => 'ST', 13 => 'PT', 14 => 'PT', 15 => 'PT', 16 => 'PT', 17 => 'PT', 18 => 'L', 19 => 'L', 20 => 'ST',
                21 => 'PT', 22 => 'PT', 23 => 'PT', 24 => 'PT', 25 => 'PT', 26 => 'L', 27 => 'L', 28 => 'PT', 29 => 'PT', 30 => 'PT', 31 => 'L',
            ],
        ],
        [
            'name_search' => 'ARWIN',
            'shifts' => [
                1 => 'ST', 2 => 'L', 3 => 'A', 4 => 'A', 5 => 'A', 6 => 'A', 7 => 'A', 8 => 'L', 9 => 'L', 10 => 'A',
                11 => 'A', 12 => 'A', 13 => 'A', 14 => 'A', 15 => 'L', 16 => 'L', 17 => 'L', 18 => 'A', 19 => 'A', 20 => 'A',
                21 => 'A', 22 => 'L', 23 => 'L', 24 => 'A', 25 => 'L', 26 => 'A', 27 => 'A', 28 => 'A', 29 => 'L', 30 => 'L', 31 => 'A',
            ],
        ],
        [
            'name_search' => 'KURNIAWAN',
            'shifts' => [
                1 => 'L', 2 => 'L', 3 => 'A', 4 => 'A', 5 => 'A', 6 => 'A', 7 => 'A', 8 => 'L', 9 => 'L', 10 => 'A',
                11 => 'A', 12 => 'A', 13 => 'A', 14 => 'A', 15 => 'L', 16 => 'L', 17 => 'L', 18 => 'A', 19 => 'A', 20 => 'A',
                21 => 'A', 22 => 'L', 23 => 'L', 24 => 'A', 25 => 'L', 26 => 'A', 27 => 'A', 28 => 'A', 29 => 'L', 30 => 'L', 31 => 'A',
            ],
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $excelPath = base_path('jadwal_dinas_teknisi.xlsx');

        if (file_exists($excelPath)) {
            $this->seedFromExcel($excelPath);
        } else {
            $this->command->error('File jadwal_dinas_teknisi.xlsx tidak ditemukan di root project!');
        }

        $this->seedJuliSchedule();
        $this->seedAgustusSchedule();
    }

    /**
     * Parse and seed January - June from Excel file.
     */
    protected function seedFromExcel(string $filePath): void
    {
        ini_set('memory_limit', '512M');

        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($filePath);

        $monthMap = [
            1 => 0, // JAN -> Sheet 0
            2 => 1, // FEB -> Sheet 1
            3 => 3, // MAR (2) -> Sheet 3
            4 => 5, // APR (2) -> Sheet 5
            5 => 6, // MEI -> Sheet 6
            6 => 7, // JUN -> Sheet 7
        ];

        foreach ($monthMap as $bulan => $sheetIndex) {
            if ($sheetIndex >= $spreadsheet->getSheetCount()) {
                continue;
            }

            $sheet = $spreadsheet->getSheet($sheetIndex);

            // Populate merged cells so every cell in range gets value
            foreach ($sheet->getMergeCells() as $cells) {
                $range = Coordinate::extractAllCellReferencesInRange($cells);
                if (empty($range)) {
                    continue;
                }
                $firstCell = $range[0];
                $val = $sheet->getCell($firstCell)->getValue();
                foreach ($range as $cell) {
                    $sheet->getCell($cell)->setValue($val);
                }
            }

            $rows = $sheet->toArray();

            // Find date row (contains day numbers 1..28+)
            $dateRowIdx = null;
            $dayCols = [];

            foreach ($rows as $rIdx => $row) {
                $tempCols = [];
                foreach ($row as $cIdx => $val) {
                    $v = trim((string) $val);
                    if (is_numeric($v) && (int) $v >= 1 && (int) $v <= 31) {
                        $tempCols[(int) $v] = $cIdx;
                    }
                }
                if (isset($tempCols[1], $tempCols[2], $tempCols[3]) && count($tempCols) >= 28) {
                    $dateRowIdx = $rIdx;
                    $dayCols = $tempCols;
                    break;
                }
            }

            if ($dateRowIdx === null) {
                continue;
            }

            ksort($dayCols);

            // Create or update JadwalBulanan
            $jadwalBulanan = JadwalBulanan::updateOrCreate(
                ['bulan' => $bulan, 'tahun' => 2026],
                [
                    'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                    'zona_waktu' => 'WIT',
                    'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                    'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
                ]
            );

            // Copy default master shifts into jadwal_bulanan_shifts
            $jadwalBulanan->copyMasterShifts();

            // Parse sheet legend for custom shift times if any
            $this->updateMonthlyShiftTimes($rows, $jadwalBulanan->id);

            // Cache shifts for category teknisi
            $shiftsCache = JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
                ->where('category', 'teknisi')
                ->get()
                ->keyBy('kode_shift');

            // Parse schedule rows
            for ($rIdx = $dateRowIdx + 1; $rIdx < count($rows); $rIdx++) {
                $row = $rows[$rIdx];
                $nameCell = trim((string) ($row[1] ?? ''));

                if (empty($nameCell) || str_contains($nameCell, 'KETERANGAN') || str_starts_with($nameCell, 'PETUGAS')) {
                    break;
                }

                if (in_array($nameCell, ['M1', 'M2', 'S', 'P', 'PF', 'PB', 'L', 'NAMA PEGAWAI', 'TANGGAL'])) {
                    continue;
                }

                // Match pegawai
                $pegawai = $this->findPegawai($nameCell);
                if (! $pegawai) {
                    continue;
                }

                // Loop through days
                foreach ($dayCols as $dayNum => $cIdx) {
                    $kodeShift = trim((string) ($row[$cIdx] ?? ''));
                    if (empty($kodeShift)) {
                        continue;
                    }

                    $shift = $shiftsCache->get($kodeShift);
                    if (! $shift) {
                        continue;
                    }

                    $formattedDay = sprintf('%02d', $dayNum);
                    $formattedMonth = sprintf('%02d', $bulan);
                    $tanggal = "2026-{$formattedMonth}-{$formattedDay}";

                    JadwalDetail::updateOrCreate(
                        [
                            'pegawai_id' => $pegawai->id,
                            'tanggal' => $tanggal,
                        ],
                        [
                            'jadwal_bulanan_id' => $jadwalBulanan->id,
                            'shift_id' => $shift->id,
                        ]
                    );
                }
            }
        }
    }

    /**
     * Seed July schedule from JadwalDinasJuli2026Seeder definitions.
     */
    protected function seedJuliSchedule(): void
    {
        $bulan = 7;
        $jadwalBulanan = JadwalBulanan::updateOrCreate(
            ['bulan' => $bulan, 'tahun' => 2026],
            [
                'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                'zona_waktu' => 'WIT',
                'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
            ]
        );

        $jadwalBulanan->copyMasterShifts();

        $shiftsCache = JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
            ->where('category', 'teknisi')
            ->get()
            ->keyBy('kode_shift');

        foreach ($this->juliSchedules as $sched) {
            $pegawai = Pegawai::where('nama', 'like', '%'.$sched['name_search'].'%')->first();

            if (! $pegawai) {
                continue;
            }

            foreach ($sched['shifts'] as $day => $kodeShift) {
                $shift = $shiftsCache->get($kodeShift);

                if (! $shift) {
                    continue;
                }

                $formattedDay = sprintf('%02d', $day);
                $tanggal = "2026-07-{$formattedDay}";

                JadwalDetail::updateOrCreate(
                    [
                        'pegawai_id' => $pegawai->id,
                        'tanggal' => $tanggal,
                    ],
                    [
                        'jadwal_bulanan_id' => $jadwalBulanan->id,
                        'shift_id' => $shift->id,
                    ]
                );
            }
        }
    }

    /**
     * Seed August schedule from official August 2026 schedule image.
     */
    protected function seedAgustusSchedule(): void
    {
        $bulan = 8;
        $jadwalBulanan = JadwalBulanan::updateOrCreate(
            ['bulan' => $bulan, 'tahun' => 2026],
            [
                'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                'zona_waktu' => 'WIT',
                'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
            ]
        );

        $jadwalBulanan->copyMasterShifts();

        $shiftsCache = JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
            ->where('category', 'teknisi')
            ->get()
            ->keyBy('kode_shift');

        foreach ($this->agustusSchedules as $sched) {
            $pegawai = Pegawai::where('nama', 'like', '%'.$sched['name_search'].'%')->first();

            if (! $pegawai) {
                continue;
            }

            foreach ($sched['shifts'] as $day => $kodeShift) {
                $shift = $shiftsCache->get($kodeShift);

                if (! $shift) {
                    continue;
                }

                $formattedDay = sprintf('%02d', $day);
                $tanggal = "2026-08-{$formattedDay}";

                JadwalDetail::updateOrCreate(
                    [
                        'pegawai_id' => $pegawai->id,
                        'tanggal' => $tanggal,
                    ],
                    [
                        'jadwal_bulanan_id' => $jadwalBulanan->id,
                        'shift_id' => $shift->id,
                    ]
                );
            }
        }
    }

    /**
     * Parse legend in sheet to set exact monthly Teknisi jam_masuk & jam_keluar.
     */
    protected function updateMonthlyShiftTimes(array $rows, int $jadwalBulananId): void
    {
        foreach ($rows as $row) {
            foreach ($row as $cIdx => $val) {
                $v = trim((string) ($val ?? ''));
                if (empty($v)) {
                    continue;
                }

                if (preg_match('/^([A-Z0-9]+)\s*:\s*(.*)$/', $v, $matches)) {
                    $kode = $matches[1];
                    $rest = $matches[2];
                    if (empty($rest) && isset($row[$cIdx + 1])) {
                        $rest = trim((string) ($row[$cIdx + 1] ?? ''));
                    }

                    if (preg_match('/^(.*?)\s*\((.*?)\)$/', $rest, $mRest)) {
                        $namaShift = trim($mRest[1]);
                        $timesStr = trim($mRest[2]);
                        $times = explode('-', $timesStr);
                        if (count($times) === 2) {
                            $jamMasuk = str_replace('.', ':', trim($times[0])).':00';
                            $jamKeluar = str_replace('.', ':', trim($times[1])).':00';

                            JadwalBulananShift::updateOrCreate(
                                [
                                    'jadwal_bulanan_id' => $jadwalBulananId,
                                    'category' => 'teknisi',
                                    'kode_shift' => $kode,
                                ],
                                [
                                    'nama_shift' => $namaShift,
                                    'jam_masuk' => $jamMasuk,
                                    'jam_keluar' => $jamKeluar,
                                    'is_tidak_masuk_kerja' => false,
                                ]
                            );
                        }
                    }
                }
            }
        }
    }

    /**
     * Find Pegawai by search term map.
     */
    protected function findPegawai(string $excelName): ?Pegawai
    {
        foreach ($this->searchMap as $key => $term) {
            if (stripos($excelName, $key) !== false) {
                return Pegawai::where('nama', 'like', "%{$term}%")->first();
            }
        }

        return null;
    }
}

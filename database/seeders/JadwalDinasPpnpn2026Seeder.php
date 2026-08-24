<?php

namespace Database\Seeders;

use App\Models\JadwalBulanan;
use App\Models\JadwalBulananShift;
use App\Models\JadwalDetail;
use App\Models\Pegawai;
use Illuminate\Database\Seeder;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class JadwalDinasPpnpn2026Seeder extends Seeder
{
    /**
     * Search mapping from Excel names to PPNPN Pegawai search terms.
     */
    protected array $searchMap = [
        'BEATRICH' => 'BEATRICH',
        'MUKLAS' => 'MUKLAS',
        'MUHLIS' => 'MUHLIS',
        'ABDU' => 'ABDU',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $excelPath = base_path('jadwal_dinas_ppnpn.xlsx');

        if (file_exists($excelPath)) {
            $this->seedFromExcel($excelPath);
        } else {
            $this->command->error("File jadwal_dinas_ppnpn.xlsx tidak ditemukan di root project!");
        }
    }

    /**
     * Parse and seed directly from excel file.
     */
    protected function seedFromExcel(string $filePath): void
    {
        ini_set('memory_limit', '512M');

        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($filePath);

        $monthMap = [
            0 => 1, // JAN
            1 => 2, // FEB
            2 => 3, // MAR
            3 => 4, // APR
            4 => 5, // MEI
            5 => 6, // JUN
            6 => 7, // JUL
            7 => 8, // AGS
        ];

        foreach ($monthMap as $sheetIndex => $bulan) {
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
                    $v = trim((string)$val);
                    if (is_numeric($v) && (int)$v >= 1 && (int)$v <= 31) {
                        $tempCols[(int)$v] = $cIdx;
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

            // Parse sheet legend for custom PPNPN shift times if any
            $this->updateMonthlyShiftTimes($rows, $jadwalBulanan->id);

            // Cache shifts for category ppnpn
            $shiftsCache = JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
                ->where('category', 'ppnpn')
                ->get()
                ->keyBy('kode_shift');

            // Parse schedule rows
            for ($rIdx = $dateRowIdx + 1; $rIdx < count($rows); $rIdx++) {
                $row = $rows[$rIdx];
                $nameCell = trim((string)($row[1] ?? ''));

                if (empty($nameCell) || str_contains($nameCell, 'KETERANGAN') || str_starts_with($nameCell, 'PETUGAS')) {
                    break;
                }

                if (in_array($nameCell, ['M1', 'M2', 'S', 'P', 'PF', 'PB', 'L', 'NAMA PEGAWAI', 'TANGGAL'])) {
                    continue;
                }

                // Match pegawai
                $pegawai = $this->findPegawai($nameCell);
                if (!$pegawai) {
                    continue;
                }

                // Loop through days
                foreach ($dayCols as $dayNum => $cIdx) {
                    $kodeShift = trim((string)($row[$cIdx] ?? ''));
                    if (empty($kodeShift)) {
                        continue;
                    }

                    $shift = $shiftsCache->get($kodeShift);
                    if (!$shift) {
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
     * Parse legend in sheet to set exact monthly PPNPN jam_masuk & jam_keluar.
     */
    protected function updateMonthlyShiftTimes(array $rows, int $jadwalBulananId): void
    {
        foreach ($rows as $row) {
            foreach ($row as $cIdx => $val) {
                $v = trim((string)($val ?? ''));
                if (empty($v)) {
                    continue;
                }

                if (preg_match('/^([A-Z0-9]+)\s*:\s*(.*)$/', $v, $matches)) {
                    $kode = $matches[1];
                    $rest = $matches[2];
                    if (empty($rest) && isset($row[$cIdx + 1])) {
                        $rest = trim((string)($row[$cIdx + 1] ?? ''));
                    }

                    if (preg_match('/^(.*?)\s*\((.*?)\)$/', $rest, $mRest)) {
                        $namaShift = trim($mRest[1]);
                        $timesStr = trim($mRest[2]);
                        $times = explode('-', $timesStr);
                        if (count($times) === 2) {
                            $jamMasuk = str_replace('.', ':', trim($times[0])) . ':00';
                            $jamKeluar = str_replace('.', ':', trim($times[1])) . ':00';

                            JadwalBulananShift::updateOrCreate(
                                [
                                    'jadwal_bulanan_id' => $jadwalBulananId,
                                    'category' => 'ppnpn',
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

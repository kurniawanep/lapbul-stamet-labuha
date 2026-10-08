<?php

namespace App\Services;

use App\Models\DataFlight;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FlightDataImportService
{
    /**
     * Import Flight Data from an Excel file.
     *
     * @param UploadedFile|string $file
     * @param int|null $pegawaiId
     * @param string|null $overrideMaskapai
     * @return array{imported: int, skipped: int, errors: array<string>}
     */
    public function import(UploadedFile|string $file, ?int $pegawaiId = null, ?string $overrideMaskapai = null): array
    {
        $filePath = is_string($file) ? $file : $file->getRealPath();
        $spreadsheet = IOFactory::load($filePath);

        $imported = 0;
        $skipped = 0;
        $errors = [];
        $detectedMonth = null;
        $detectedYear = null;

        DB::beginTransaction();
        try {
            foreach ($spreadsheet->getAllSheets() as $sheet) {
                $rows = $sheet->toArray(null, true, true, false);

                if (empty($rows)) {
                    continue;
                }

                // Find header row index (looking for 'Tanggal' or 'Flight No')
                $headerIndex = -1;
                $colMap = [];

                foreach ($rows as $idx => $row) {
                    $rowValues = array_map(fn($v) => strtolower(trim((string)$v)), $row);
                    if (in_array('tanggal', $rowValues, true) || in_array('flight no', $rowValues, true) || in_array('flight_no', $rowValues, true)) {
                        $headerIndex = $idx;
                        // Map column positions
                        foreach ($rowValues as $colIdx => $headerName) {
                            if (str_contains($headerName, 'tanggal') || str_contains($headerName, 'date')) {
                                $colMap['tanggal'] = $colIdx;
                            } elseif (str_contains($headerName, 'flight') || str_contains($headerName, 'flt')) {
                                $colMap['flight_number'] = $colIdx;
                            } elseif (str_contains($headerName, 'reg') || str_contains($headerName, 'pk-') || str_contains($headerName, 'pesawat')) {
                                $colMap['reg'] = $colIdx;
                            } elseif ($headerName === 'dep' || str_contains($headerName, 'dari') || str_contains($headerName, 'origin') || str_contains($headerName, 'departure')) {
                                $colMap['dep'] = $colIdx;
                            } elseif ($headerName === 'arr' || str_contains($headerName, 'ke') || str_contains($headerName, 'dest') || str_contains($headerName, 'arrival')) {
                                $colMap['arr'] = $colIdx;
                            } elseif (str_contains($headerName, 'sta')) {
                                $colMap['sta_utc'] = $colIdx;
                            } elseif (str_contains($headerName, 'std')) {
                                $colMap['std_utc'] = $colIdx;
                            } elseif (str_contains($headerName, 'ata')) {
                                $colMap['ata_utc'] = $colIdx;
                            } elseif (str_contains($headerName, 'atd')) {
                                $colMap['atd_utc'] = $colIdx;
                            } elseif (str_contains($headerName, 'maskapai') || str_contains($headerName, 'airline')) {
                                $colMap['maskapai'] = $colIdx;
                            } elseif (str_contains($headerName, 'ket') || str_contains($headerName, 'remark')) {
                                $colMap['remarks'] = $colIdx;
                            }
                        }
                        break;
                    }
                }

                // If no specific header found, assume standard template layout:
                // 0: Tanggal, 1: Flight No, 2: Reg, 3: Dep, 4: Arr, 5: STA/UTC, 6: STD/UTC, 7: ATA/UTC, 8: ATD/UTC
                if ($headerIndex === -1) {
                    $headerIndex = 0; // Assume row 1 is header
                    $colMap = [
                        'tanggal' => 0,
                        'flight_number' => 1,
                        'reg' => 2,
                        'dep' => 3,
                        'arr' => 4,
                        'sta_utc' => 5,
                        'std_utc' => 6,
                        'ata_utc' => 7,
                        'atd_utc' => 8,
                    ];
                }

                // Iterate through data rows
                $totalRows = count($rows);
                for ($i = $headerIndex + 1; $i < $totalRows; $i++) {
                    $row = $rows[$i];

                    $rawTanggal = isset($colMap['tanggal']) && isset($row[$colMap['tanggal']]) ? $row[$colMap['tanggal']] : null;
                    $rawFlightNumber = isset($colMap['flight_number']) && isset($row[$colMap['flight_number']]) ? $row[$colMap['flight_number']] : null;

                    // Skip empty rows
                    if (empty($rawTanggal) && empty($rawFlightNumber)) {
                        continue;
                    }

                    $parsedDate = $this->parseDate($rawTanggal);
                    if (!$parsedDate) {
                        $skipped++;
                        $errors[] = "Baris " . ($i + 1) . " diabaikan: Tanggal tidak valid ('" . (string)$rawTanggal . "').";
                        continue;
                    }

                    $flightNumber = trim((string)$rawFlightNumber);
                    if (empty($flightNumber)) {
                        $skipped++;
                        $errors[] = "Baris " . ($i + 1) . " diabaikan: Nomor penerbangan kosong.";
                        continue;
                    }

                    $reg = isset($colMap['reg']) && isset($row[$colMap['reg']]) ? trim((string)$row[$colMap['reg']]) : null;
                    $dep = isset($colMap['dep']) && isset($row[$colMap['dep']]) ? strtoupper(trim((string)$row[$colMap['dep']])) : null;
                    $arr = isset($colMap['arr']) && isset($row[$colMap['arr']]) ? strtoupper(trim((string)$row[$colMap['arr']])) : null;

                    $staUtc = isset($colMap['sta_utc']) && isset($row[$colMap['sta_utc']]) ? $this->parseTime($row[$colMap['sta_utc']]) : null;
                    $stdUtc = isset($colMap['std_utc']) && isset($row[$colMap['std_utc']]) ? $this->parseTime($row[$colMap['std_utc']]) : null;
                    $ataUtc = isset($colMap['ata_utc']) && isset($row[$colMap['ata_utc']]) ? $this->parseTime($row[$colMap['ata_utc']]) : null;
                    $atdUtc = isset($colMap['atd_utc']) && isset($row[$colMap['atd_utc']]) ? $this->parseTime($row[$colMap['atd_utc']]) : null;

                    // Convert UTC date & time to local WIT date (Asia/Jayapura, UTC+9)
                    $effectiveTime = null;
                    if ($dep === 'LAH' || $dep === 'WAEL') {
                        $effectiveTime = $stdUtc ?: ($atdUtc ?: ($staUtc ?: $ataUtc));
                    } elseif ($arr === 'LAH' || $arr === 'WAEL') {
                        $effectiveTime = $staUtc ?: ($ataUtc ?: ($stdUtc ?: $atdUtc));
                    } else {
                        $effectiveTime = $stdUtc ?: ($staUtc ?: ($atdUtc ?: $ataUtc));
                    }

                    $localDate = $parsedDate->copy();
                    if ($effectiveTime && preg_match('/^(\d{1,2}):(\d{2})$/', $effectiveTime, $tMatch)) {
                        $utcDt = Carbon::createFromFormat(
                            'Y-m-d H:i',
                            $parsedDate->format('Y-m-d') . ' ' . sprintf('%02d:%02d', (int)$tMatch[1], (int)$tMatch[2]),
                            'UTC'
                        );
                        $localDate = $utcDt->setTimezone('Asia/Jayapura');
                    }

                    if ($detectedMonth === null) {
                        $detectedMonth = $localDate->month;
                        $detectedYear = $localDate->year;
                    }
                    
                    $rowMaskapai = isset($colMap['maskapai']) && !empty($row[$colMap['maskapai']]) 
                        ? trim((string)$row[$colMap['maskapai']]) 
                        : null;
                    $remarks = isset($colMap['remarks']) && !empty($row[$colMap['remarks']]) 
                        ? trim((string)$row[$colMap['remarks']]) 
                        : null;

                    $maskapai = $overrideMaskapai ?: ($rowMaskapai ?: DataFlight::detectMaskapai($flightNumber));

                    // Save or update flight record using local WIT date
                    DataFlight::updateOrCreate(
                        [
                            'tanggal' => $localDate->format('Y-m-d'),
                            'flight_number' => $flightNumber,
                            'dep' => $dep,
                            'arr' => $arr,
                        ],
                        [
                            'maskapai' => $maskapai,
                            'reg' => $reg ?: null,
                            'sta_utc' => $staUtc,
                            'std_utc' => $stdUtc,
                            'ata_utc' => $ataUtc,
                            'atd_utc' => $atdUtc,
                            'remarks' => $remarks,
                            'pegawai_id' => $pegawaiId,
                        ]
                    );

                    $imported++;
                }
            }

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Flight Data Import Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            throw $e;
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 10), // Limit error message count for UI readability
            'month' => $detectedMonth,
            'year' => $detectedYear,
        ];
    }

    /**
     * Parse date from various formats including Excel serial numbers and strings like '31-Aug-26'.
     */
    protected function parseDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        // If numeric, could be Excel serialized date
        if (is_numeric($value)) {
            try {
                $dateTime = ExcelDate::excelToDateTimeObject((float)$value);
                return Carbon::instance($dateTime);
            } catch (Exception $e) {
                // fall through
            }
        }

        $str = trim((string)$value);

        // Try standard Carbon parsing
        $formats = [
            'Y-m-d',
            'd-M-y',    // 31-Aug-26
            'j-M-y',    // 1-Sep-26
            'd-M-Y',    // 31-Aug-2026
            'j-M-Y',    // 1-Sep-2026
            'd/m/Y',    // 31/08/2026
            'd-m-Y',    // 31-08-2026
            'Y/m/d',
            'd F Y',    // 1 September 2026
            'j F Y',
        ];

        foreach ($formats as $fmt) {
            try {
                $parsed = Carbon::createFromFormat($fmt, $str);
                if ($parsed && $parsed->year > 2000) {
                    return $parsed;
                }
            } catch (Exception $e) {
                continue;
            }
        }

        try {
            return Carbon::parse($str);
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Parse time into HH:mm format.
     */
    protected function parseTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            // Excel fraction of a day (e.g. 0.5 = 12:00)
            try {
                $totalSeconds = round((float)$value * 86400);
                $hours = floor($totalSeconds / 3600);
                $minutes = floor(($totalSeconds % 3600) / 60);
                return sprintf('%02d:%02d', $hours % 24, $minutes);
            } catch (Exception $e) {
                // fall through
            }
        }

        $str = trim((string)$value);
        if (preg_match('/^(\d{1,2}):(\d{2})/', $str, $matches)) {
            return sprintf('%02d:%02d', (int)$matches[1], (int)$matches[2]);
        }

        return $str;
    }

    /**
     * Export flight data to a formatted Excel file.
     */
    public function export(int $bulan, int $tahun, ?string $maskapai = null): StreamedResponse
    {
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = DataFlight::whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        if ($maskapai && $maskapai !== 'all') {
            $query->where('maskapai', $maskapai);
        }

        $flights = $query->orderBy('tanggal', 'asc')->orderBy('flight_number', 'asc')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(substr($startDate->locale('id')->isoFormat('MMMM Y'), 0, 31));

        // Headers
        $headers = ['Tanggal', 'Flight No', 'Reg', 'Dep', 'Arr', 'STA/UTC', 'STD/UTC', 'ATA/UTC', 'ATD/UTC', 'Maskapai', 'Keterangan'];
        
        $sheet->fromArray([$headers], null, 'A1');

        // Style Header
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E293B']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
        ];
        $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(26);

        // Fill Data
        $rowIdx = 2;
        foreach ($flights as $f) {
            $sheet->setCellValue("A{$rowIdx}", Carbon::parse($f->tanggal)->format('d-M-y'));
            $sheet->setCellValue("B{$rowIdx}", $f->flight_number);
            $sheet->setCellValue("C{$rowIdx}", $f->reg);
            $sheet->setCellValue("D{$rowIdx}", $f->dep);
            $sheet->setCellValue("E{$rowIdx}", $f->arr);
            $sheet->setCellValue("F{$rowIdx}", $f->sta_utc);
            $sheet->setCellValue("G{$rowIdx}", $f->std_utc);
            $sheet->setCellValue("H{$rowIdx}", $f->ata_utc);
            $sheet->setCellValue("I{$rowIdx}", $f->atd_utc);
            $sheet->setCellValue("J{$rowIdx}", $f->maskapai);
            $sheet->setCellValue("K{$rowIdx}", $f->remarks);

            $rowIdx++;
        }

        // Apply grid borders and alignments
        if ($rowIdx > 2) {
            $sheet->getStyle("A2:K" . ($rowIdx - 1))->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle("A2:A" . ($rowIdx - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("B2:E" . ($rowIdx - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("F2:I" . ($rowIdx - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        // Auto size columns
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'data-flight-' . strtolower($startDate->format('M-Y')) . ($maskapai && $maskapai !== 'all' ? '-' . strtolower(str_replace(' ', '-', $maskapai)) : '') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}

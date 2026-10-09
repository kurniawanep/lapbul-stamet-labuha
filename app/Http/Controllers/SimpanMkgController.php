<?php

namespace App\Http\Controllers;

use App\Models\DataDiseminasiMkg;
use App\Models\Pegawai;
use App\Services\SimpanMkgDashboardService;
use App\Services\SimpanMkgSyncService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class SimpanMkgController extends Controller
{
    protected SimpanMkgSyncService $syncService;
    protected SimpanMkgDashboardService $dashboardService;

    public function __construct(SimpanMkgSyncService $syncService, SimpanMkgDashboardService $dashboardService)
    {
        $this->syncService = $syncService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display SIMPAN-MKG monthly dissemination dashboard.
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now();
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);
        $perPage = (int) $request->input('per_page', 15);
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = DataDiseminasiMkg::with(['pegawai', 'shift'])
            ->whereBetween('dissemination_timestamp', [$startDate, $endDate]);

        if ($request->filled('pegawai_id') && $request->input('pegawai_id') !== 'ALL') {
            if ($request->input('pegawai_id') === 'unassigned') {
                $query->whereNull('pegawai_id');
            } else {
                $query->where('pegawai_id', $request->input('pegawai_id'));
            }
        }

        if ($request->filled('media_type') && $request->input('media_type') !== 'ALL') {
            $query->where('media_type', $request->input('media_type'));
        }

        if ($request->filled('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        $records = $query->orderBy('dissemination_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        // Transform formatted date for display
        $records->through(function ($item) {
            $ts = $item->dissemination_timestamp;
            $item->formatted_time = $ts ? $ts->format('d M Y, H:i') . ' WIT' : '-';
            return $item;
        });

        $dashboardStats = $this->dashboardService->getMonthlyStats($bulan, $tahun);

        $availableStaff = Pegawai::where('role', 'LIKE', '%Observer%')
            ->orWhere('role', 'LIKE', '%Forecaster%')
            ->orderBy('nama')
            ->get(['id', 'nama', 'nip']);

        return Inertia::render('Laporan/SimpanMkg', [
            'records' => $records,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'filters' => [
                'pegawai_id' => $request->input('pegawai_id', 'ALL'),
                'media_type' => $request->input('media_type', 'ALL'),
                'status' => $request->input('status', 'ALL'),
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'availableStaff' => $availableStaff,
            'stats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync from Supabase SIMPAN-MKG.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $result = $this->syncService->syncMonth($bulan, $tahun);

        if (!$result['success']) {
            return redirect()->back()
                ->with('error', $result['message'])
                ->with('sync_result', $result);
        }

        return redirect()->back()
            ->with('success', $result['message'])
            ->with('sync_result', $result);
    }

    /**
     * Export monthly dissemination recap as Excel (.xlsx).
     */
    public function exportExcel(Request $request)
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $stats = $this->dashboardService->getMonthlyStats($bulan, $tahun);
        $records = DataDiseminasiMkg::with(['pegawai', 'shift'])
            ->whereBetween('dissemination_timestamp', [$startDate, $endDate])
            ->orderBy('dissemination_timestamp', 'asc')
            ->get();

        $namaBulan = [
            1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
            5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
            9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
        ];
        $bulanStr = $namaBulan[$bulan] ?? 'BULAN';

        $spreadsheet = new Spreadsheet();

        // ── Sheet 1: Rekapitulasi Pegawai ──────────────────────────────────────────
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('Rekap Pegawai');

        // Header Title
        $sheet1->setCellValue('A1', 'REKAPITULASI DISEMINASI INFORMASI METEOROLOGI (SIMPAN-MKG)');
        $sheet1->setCellValue('A2', "STASIUN METEOROLOGI OESMAN SADIK - PERIODE {$bulanStr} {$tahun}");
        $sheet1->mergeCells('A1:H1');
        $sheet1->mergeCells('A2:H2');
        $sheet1->getStyle('A1:A2')->getFont()->setBold(true)->setSize(12);
        $sheet1->getStyle('A1:A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Table Header
        $headers1 = ['No', 'Nama Pegawai', 'NIP / ID', 'Shift Pagi', 'Shift Siang', 'Shift Malam', 'Lainnya', 'Total Diseminasi'];
        $col1 = 'A';
        foreach ($headers1 as $h) {
            $sheet1->setCellValue($col1 . '4', $h);
            $col1++;
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E293B']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ];
        $sheet1->getStyle('A4:H4')->applyFromArray($headerStyle);

        $row1 = 5;
        $idx = 1;
        $totalAll = 0;
        foreach ($stats['staff_recap'] as $staff) {
            $sheet1->setCellValue('A' . $row1, $idx++);
            $sheet1->setCellValue('B' . $row1, $staff['nama']);
            $sheet1->setCellValue('C' . $row1, $staff['nip']);
            $sheet1->setCellValue('D' . $row1, $staff['breakdown_shift']['pagi']);
            $sheet1->setCellValue('E' . $row1, $staff['breakdown_shift']['siang']);
            $sheet1->setCellValue('F' . $row1, $staff['breakdown_shift']['malam']);
            $sheet1->setCellValue('G' . $row1, $staff['breakdown_shift']['lainnya']);
            $sheet1->setCellValue('H' . $row1, $staff['total_count']);

            $totalAll += $staff['total_count'];
            $row1++;
        }

        // Total Row
        $sheet1->setCellValue('A' . $row1, 'TOTAL KESELURUHAN');
        $sheet1->mergeCells("A{$row1}:G{$row1}");
        $sheet1->setCellValue('H' . $row1, $totalAll);
        $sheet1->getStyle("A{$row1}:H{$row1}")->getFont()->setBold(true);
        $sheet1->getStyle("A{$row1}:H{$row1}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('F1F5F9');
        $sheet1->getStyle("A5:H{$row1}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        foreach (range('A', 'H') as $c) {
            $sheet1->getColumnDimension($c)->setAutoSize(true);
        }

        // ── Sheet 2: Log Detail Diseminasi ─────────────────────────────────────────
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Log Detail');

        $headers2 = ['No', 'Waktu (WIT)', 'Petugas Piket', 'Kode Shift', 'Tipe Media', 'Kanal Terpublikasi', 'Pesan / Konten', 'Status', 'Pengirim Asli (WA)'];
        $col2 = 'A';
        foreach ($headers2 as $h) {
            $sheet2->setCellValue($col2 . '1', $h);
            $col2++;
        }
        $sheet2->getStyle('A1:I1')->applyFromArray($headerStyle);

        $row2 = 2;
        $i2 = 1;
        foreach ($records as $r) {
            $tsStr = $r->dissemination_timestamp ? $r->dissemination_timestamp->format('Y-m-d H:i:s') : '-';
            $platStr = is_array($r->platforms) ? implode(', ', $r->platforms) : (string)$r->platforms;
            $msgSnippet = mb_substr((string)$r->message, 0, 100);

            $sheet2->setCellValue('A' . $row2, $i2++);
            $sheet2->setCellValue('B' . $row2, $tsStr);
            $sheet2->setCellValue('C' . $row2, $r->pegawai?->nama ?? 'Tidak Terjadwal');
            $sheet2->setCellValue('D' . $row2, $r->shift_kode ?? '-');
            $sheet2->setCellValue('E' . $row2, strtoupper($r->media_type));
            $sheet2->setCellValue('F' . $row2, $platStr);
            $sheet2->setCellValue('G' . $row2, $msgSnippet);
            $sheet2->setCellValue('H' . $row2, strtoupper($r->status));
            $sheet2->setCellValue('I' . $row2, $r->sender_name . ' (' . $r->sender_wa . ')');

            $row2++;
        }

        $sheet2->getStyle("A2:I" . max(2, $row2 - 1))->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        foreach (range('A', 'I') as $c) {
            $sheet2->getColumnDimension($c)->setAutoSize(true);
        }

        $filename = "Laporan_Bulanan_SIMPAN_MKG_{$bulanStr}_{$tahun}.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Export raw log details as CSV.
     */
    public function exportCsv(Request $request)
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $records = DataDiseminasiMkg::with(['pegawai', 'shift'])
            ->whereBetween('dissemination_timestamp', [$startDate, $endDate])
            ->orderBy('dissemination_timestamp', 'asc')
            ->get();

        $filename = "log_detail_simpan_mkg_{$tahun}_{$bulan}.csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($records) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM

            fputcsv($handle, ['Waktu (WIT)', 'Nama Pegawai Berdinas', 'Shift', 'Tipe Media', 'Platform', 'Status', 'Pesan', 'Nomor WA Pengirim', 'Nama Pengirim']);

            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->dissemination_timestamp ? $r->dissemination_timestamp->format('Y-m-d H:i:s') : '',
                    $r->pegawai?->nama ?? 'Tidak Terjadwal',
                    $r->shift_kode ?? '',
                    $r->media_type,
                    is_array($r->platforms) ? implode(';', $r->platforms) : (string)$r->platforms,
                    $r->status,
                    $r->message,
                    $r->sender_wa,
                    $r->sender_name,
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}

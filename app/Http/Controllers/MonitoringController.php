<?php

namespace App\Http\Controllers;

use App\Services\PerformanceMonitoringService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringController extends Controller
{
    protected PerformanceMonitoringService $monitoringService;

    public function __construct(PerformanceMonitoringService $monitoringService)
    {
        $this->monitoringService = $monitoringService;
    }

    /**
     * Display Station Head Performance Monitoring Dashboard.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', Carbon::now()->month);
        $tahun = (int) $request->input('tahun', Carbon::now()->year);

        $performanceData = $this->monitoringService->getMonthlyPerformance($bulan, $tahun);
        $trend12Months = $this->monitoringService->get12MonthsTrend($bulan, $tahun);

        return Inertia::render('Monitoring/Index', [
            'filters' => [
                'bulan' => $bulan,
                'tahun' => $tahun,
            ],
            'summary' => $performanceData['station_summary'],
            'awos_summary' => $performanceData['awos_summary'] ?? [],
            'hourly_delays' => $performanceData['hourly_delays'],
            'staff_rankings' => $performanceData['staff_rankings'],
            'trend_12_months' => $trend12Months,
        ]);
    }
}

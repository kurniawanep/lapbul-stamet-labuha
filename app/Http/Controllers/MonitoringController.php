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
        $parameter = (string) $request->input('parameter', 'all');
        $staffId = $request->input('staff_id') ? (int) $request->input('staff_id') : null;
        $tab = (string) $request->input('tab', 'overview');

        $performanceData = $this->monitoringService->getMonthlyPerformance($bulan, $tahun);
        $trend12Months = $this->monitoringService->get12MonthsTrend($bulan, $tahun);

        return Inertia::render('Monitoring/Index', [
            'filters' => [
                'bulan' => $bulan,
                'tahun' => $tahun,
                'parameter' => $parameter,
                'staff_id' => $staffId,
                'tab' => $tab,
            ],
            'summary' => $performanceData['station_summary'],
            'dissemination_summary' => $performanceData['dissemination_summary'] ?? ['total' => 0, 'daily_avg' => 0],
            'awos_summary' => $performanceData['awos_summary'] ?? [],
            'hourly_delays' => $performanceData['hourly_delays'],
            'hourly_delays_by_param' => $performanceData['hourly_delays_by_param'] ?? [],
            'staff_rankings' => $performanceData['staff_rankings'],
            'trend_12_months' => $trend12Months,
        ]);
    }
}

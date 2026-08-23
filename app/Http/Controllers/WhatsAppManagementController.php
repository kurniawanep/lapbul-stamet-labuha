<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhatsAppManagementController extends Controller
{
    protected WhatsAppService $waService;

    public function __construct(WhatsAppService $waService)
    {
        $this->waService = $waService;
    }

    /**
     * Display WhatsApp Gateway Dashboard & Connection Status.
     */
    public function index(Request $request): Response
    {
        $status = $this->waService->getStatus();

        return Inertia::render('Pengaturan/WhatsApp', [
            'status' => $status,
        ]);
    }

    /**
     * Trigger session logout on WhatsApp Gateway.
     */
    public function logout(Request $request): RedirectResponse
    {
        $result = $this->waService->logoutSession();

        if ($result['success']) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }

    /**
     * Send test WhatsApp message from dashboard.
     */
    public function sendTest(Request $request): RedirectResponse
    {
        $request->validate([
            'to' => 'required|string',
            'message' => 'required|string',
        ]);

        $to = $request->input('to');
        $message = $request->input('message');

        $success = $this->waService->sendMessage($to, $message);

        if ($success) {
            return redirect()->back()->with('success', "Pesan WhatsApp berhasil dikirim ke {$to}!");
        }

        return redirect()->back()->with('error', "Gagal mengirim pesan WhatsApp ke {$to}. Pastikan WA Gateway terhubung.");
    }
}
